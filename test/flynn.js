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

  describe('starting / stopping', function () {
    var mon = flynn('node',
        [ join(__dirname, 'fixtures/montitor.js'), '2' ]
      , { restart: false }
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
        mon.state().should.equal('stopped');
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

    it('can restart when a process fails', function (done) {
      var mon = flynn('node',
          [ join(__dirname, 'fixtures/monitor.js'), '1' ]
        , { restart: true
          , 'restart max': 5 }
      );

      var restarted = false;
      mon.on('restarting', function () {
        restarted = true;
      });

      mon.on('stopped', function () {
        restarted.should.be.true;
        done();
      });

      mon.start();
    });

  });
});
