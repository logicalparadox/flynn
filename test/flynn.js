var chai = require('chai')
  , should = chai.should()
  , join = require('path').join

var flynn = require('..');

chai.Assertion.addProperty('alive', function () {
  new chai.Assertion(this._obj).to.be.a('number');
  var alive = true
    , pid = this._obj;

  try { process.kill(pid, 0); }
  catch (ex) { if (ex.code == 'ESRCH') alive = false; }

  this.assert(
      alive === true
    , 'expected pid #{this} to be alive'
    , 'expected pid #{this} to not be alive'
  );
});

describe('Flynn', function () {

  it('has a version', function () {
    flynn.should.have.property('version');
  });

  it('can start a new process', function (done) {
    var mon = flynn('node',
        [ join(__dirname, 'fixtures/monitor.js'), '1' ]
      , { restartAuto: false }
    );

    var exit = 0;
    mon.on('exit', function (code) {
      should.exist(code);
      code.should.equal(1);
      mon.state.should.equal('stopped');
      done();
    });

    mon.start();
  });

  describe('starting / stopping', function () {
    var mon = flynn('node',
        [ join(__dirname, 'fixtures/montitor.js'), '2' ]
      , { restartAuto: false }
    );

    it('can start', function (done) {
      mon.once('started', function () {
        should.exist(mon.pid);
        mon.pid.should.be.alive;
        done();
      });

      mon.start();
    });

    it('can stop', function (done) {
      var pid = mon.pid;
      mon.stop(function () {
        pid.should.not.be.alive;
        mon.state.should.equal('stopped');
        done();
      });
    });

    it('can start again', function (done) {
      mon.once('started', function () {
        should.exist(mon.pid);
        mon.pid.should.be.alive;
        done();
      });

      mon.start();
    });

    it('can stop again', function (done) {
      var pid = mon.pid;
      mon.stop(function () {
        pid.should.not.be.alive;
        done();
      });
    });

  });

  describe('restarting', function () {

    it('can restart when a process fails', function () {
      var mon = flynn('node',
          [ join(__dirname, 'fixtures/monitor.js'), '1' ]
        , { restartAuto: true
          , restartMax: 5 }
      );

      var exit = 0;
      mon.on('exit', function (code) {
        should.exist(code);
        exit++;
      });

      var restarted = 0;
      mon.on('restarting', function () {
        restarted++;
      });

      mon.on('failure', function (err) {
        expect(err).to.exist;
        expect(exit).to.equal(6);
        expect(restarted).to.equal(5);
        done();
      });
    });

  });
});
