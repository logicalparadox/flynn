var contraption = require('contraption')
  , debug = require('sherlock')('flynn:monitor')
  , extend = require('tea-extend')
  , fs = require('fs')
  , spawn = require('child_process').spawn

var Monitor = contraption('flynn:monitor');

Monitor.initial('stopped');

Monitor.method('start', {
    from: 'stopped'
  , to: 'started'
  , handle: function (ev) {
      this._meta.restarts = 0;
      startProcess(this);
    }
});

Monitor.method('restart', {
    from: 'started'
  , during: 'restarting'
  , to: 'started'
  , handle: function (ev, done) {
      var self = this
        , meta = this._meta
        , proc = this._process
        , pid = proc.pid
        , sig = ev.args[0] || 'sighup';

      sig = sig.toUpperCase();

      proc.once('exit', function (code) {
        debug('[%d] stopped with code %d', pid, code || 0);
        meta.manualRestart = false;
        startProcess(self);
        done();
      });

      debug('[%d] stopping with %s', pid, sig);
      meta.manualRestart = true;
      proc.kill(sig);
    }
});

Monitor.method('stop', {
    from: 'started'
  , during: 'stopping'
  , to: 'stopped'
  , handle: function (ev, done) {
      var proc = this._process
        , pid = proc.pid
        , sig = ev.args[0] || 'sighup';

      sig = sig.toUpperCase();

      proc.once('exit', function (code) {
        debug('[%d] stopped with code %d', pid, code || 0);
        done();
      });

      debug('[%d] stopping with %s', pid, sig);
      proc.kill(sig);
    }
});

module.exports = Monitor.build();

function startProcess (monitor) {
  var settings = monitor.settings
    , args = settings.args || ''
    , cmd = settings.cmd
    , cwd = settings.cwd
    , env = {}
    , logErr = settings['err log']
    , logErrFd = null
    , logOut = settings['out log']
    , logOutFd = null
    , pid, stdio;

  if ('string' === typeof args) {
    args = args.split(/\s/);
  }

  extend(env, process.env);
  extend(env, settings['env'] || {});
  env.NODE_ENV = settings['node env'];

  if (logOut || logErr) {
    debug('piping stdout/stderr to log files');
    logOutFd = fs.openSync(logOut || logErr, 'a');
    logErrFd = logErr & !logOut
      ? fs.opensync(logErr, 'a')
      : logOutFd;
    stdio = [ 'ignore', logOutFd, logErrFd ];
  } else {
    stdio = 'pipe';
  }

  var proc = spawn(cmd, args, {
      cwd: cwd
    , env: env
    , stdio: stdio
  });

  pid = proc.pid;

  debug('[%d] started "%s %s"', pid, cmd, args.join(' '));

  if (stdio === 'pipe') {
    debug('[%d] piping stdout/stderr to events', pid);
    monitor.proxyEvent('data', 'stdout', proc.stdout);
    monitor.proxyEvent('data', 'stderr', proc.stderr);
  }

  proc.on('exit', function (code) {
    if (stdio === 'pipe') {
      debug('[%d] removing stdout/stderr event', pid);
      monitor.unproxyEvent('data', 'stdout', proc.stdout);
      monitor.unproxyEvent('data', 'stderr', proc.stderr);
    } else {
      debub('[%d] closing stdout/stderr log files', pid);
      fs.closeSync(logOutFd);
      fs.closeSync(logErrFd);
    }

    monitor._process = null;

    if (settings.restart && monitor.state() !== 'stopping' && !monitor._meta.manualRestart) {
      process.nextTick(function () {
        restartProcess(monitor);
      });
    }
  });

  monitor._process = proc;
}

function restartProcess (monitor) {
  var meta = monitor._meta
    , settings = monitor.settings;

  meta.restarts++;

  if (meta.restarts > settings['restart max']) {
    debug('max restarts reached');
    clearTimeout(meta.timer);
    monitor.state('stopped');
  } else {
    if (monitor.state() !== 'restarting') {
      monitor.state('restarting');
    }

    debug('restart attempt %d', meta.restarts);
    if (meta.timer) clearTimeout(meta.timer);
    startProcess(monitor);
    meta.timer = setTimeout(function () {
      debug('restart suceessful');
      meta.restarts = 0;
      monitor.state('restarted');
      monitor.state('started');
    }, settings['restart window']);
  }
}
