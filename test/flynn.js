var chai = require('chai')
  , should = chai.should();

var flynn = require('..');

describe('Flynn', function () {

  it('has a version', function () {
    flynn.should.have.property('version');
  });

});
