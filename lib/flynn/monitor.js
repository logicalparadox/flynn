var EventEmitter = require('events').EventEmitter
  , fs = require('fsagent')
  , spawn = require('child_process').spawn
  , util = require('util');

/*!
 * merge utility
 *
 * @param {Object} a
 * @param {Object} b
 * @api private
 */

function merge (a, b){
  if (a && b) {
    for (var key in b) {
      a[key] = b[key];
    }
  }
  return a;
}

/*!
 * defaults utility
 *
 * @param {Object} a
 * @param {Object} b
 * @api private
 */

function defaults (a, b) {
  if (a && b) {
    for (var key in b) {
      if ('undefined' == typeof a[key]) a[key] = b[key];
    }
  }
  return a;
}

module.exports = Monitor;

function Monitor (cmd, args, opts) {
  EventEmitter.call(this);

  // prepare our opts
  this._opts = defaults(opts || {}, {
      cwd: undefined
    , daemon: false
    , env: {}
    , logOut: null
    , logErr: null
    , nodeEnv: process.env.NODE_ENV || 'development'
    , pidFile: null // daemon only
    , restartAuto: true
    , restartMax: 10
    , restartWindow: 10000
  });

  // set command
  this._opts.cmd = cmd;

  // parse arguments
  this._opts.args = 'string' === typeof args
    ? args.split(' ')
    : args;

  // hold current state
  this._meta = {};
  this.state = 'stopped';

  // process holder
  this._process;
}

util.inherits(Monitor, EventEmitter);

Object.defineProperty(Monitor.prototype, 'state',
  { get: function () {
      switch (this._meta.state) {
        case 0: return 'stopped';
        case 1: return 'starting';
        case 2: return 'restarting';
        case 3: return 'started';
      }
    }
  , set: function (state) {
      var meta = this._meta;

      switch (state) {
        case 'stopped':
          meta.state = 0;
          meta.restarts = 0;
          break;
        case 'starting':
          meta.state = 1;
          meta.restarts = 0;
          break;
        case 'restarting':
          meta.state = 2;
          break;
        case 'started':
          meta.state = 3;
          break;
      }

      this.emit(state);
    }
});

Object.defineProperty(Monitor.prototype, 'pid',
  { get: function () {
      return this._process
        ? this._process.pid
        : null;
    }
});

Monitor.prototype.start = function () {
  this.state = 'starting';
  startProcess.call(this);
};

function startProcess () {
  var self = this
    , env = {}
    , opts = this._opts
    , stdio;

  merge(env, process.env);
  merge(env, opts.env);
  env.NODE_ENV = opts.nodeEnv;

  if (opts.logOut || opts.logErr) {
    var out = fs.openSync(opts.logOut, 'a')
      , err = opts.logErr
        ? sf.openSync(opts.logErr, 'a')
        : out;
    stdio = [ 'ignore', out, err ];
  } else if (opts.daemon) {
    stdio = 'ignore';
  } else {
    stdio = 'pipe';
  }

  if (opts.daemon && !opts.pidFile) {
    throw new Error('For your safety, please provide a pid file when daemonizing.');
  }

  this._process = spawn(opts.cmd, opts.args, {
      cwd: opts.cwd
    , env: env
    , stdio: stdio
    , detach: opts.daemon
  });

  if (stdio === 'pipe') {
    this._process.stdout.on('data', function (data) {
      self.emit('stdout', data);
    });

    this._process.stderr.on('data', function (data) {
      self.emit('stdrr', data);
    });
  }

  if (opts.daemon) {
    var pid = this._process.pid;
    fs.writeFileSync(opts.pidFile, pid);
    this._process.unref();
  }

  this._process.on('exit', function (code) {
    if (opts.restartAuto && self.state !== 'stopped') {
      self.restart();
    } else {
      self.state = 'stopped';
      self.emit('exit', code);
    }
  });

  if (this.state !== 'restarting') {
    this.state = 'started';
  }
};

Monitor.prototype.restart = function () {
  var self = this
    , meta = this._meta
    , opts = this._opts;

  meta.restarts++;

  if (meta.state == 2 && meta.restarts >= opts.restartMax) {
    clearTimeout(meta.timer);
    this.emit('restart failure');
    this.state = 'stopped';
  } else if (this.autoRestart) {
    this.state = 'restarting';
    startProcess.call(this);
    meta.timer = setTimeout(function () {
      self.state = 'started';
    }, opts.restartWindow);
  }
};

Monitor.prototype.stop = function (sig, cb) {
  var self = this
    , opts = this._opts;

  if ('function' === typeof sig) {
    cb = sig;
    sig = 'SIGHUP';
  }

  sig = sig || 'SIGHUP'
  cb = cb || function () {};

  if (!this._process || this.state == 'stopped') {
    if (!opts.deamon) return cb(null);
    fs.readFile(opts.pidFile, 'utf8', function (err, data) {
      if (err) return cb(err);
      var pid = parseInt(data);
      try {
        process.kill(pid);
        fs.unlink(opts.pidFile, cb);
      } catch (ex) {
        if (ex.code === 'ESRCH') cb(null);
        else cb(ex);
      }
    });
  } else {
    this._process.once('exit', function (code) {
      delete self._process;
      cb(null);
    });

    this.state = 'stopped';
    this._process.kill('SIGHUP');
  }
};
