var extend = require('tea-extend')
  , facet = require('facet')
  , inherits = require('tea-inherits')

var Monitor = require('./monitor');

var defaults = {
    'args': ''
  , 'cwd': undefined
  , 'env': {}
  , 'log out': null
  , 'log err': null
  , 'node env': process.env.NODE_ENV || 'development'
  , 'restart': true
  , 'restart max': 10
  , 'restart window': 10000
};

var trim = extend.include.apply(null, Object.keys(defaults));

module.exports = Interface;

function Interface (cmd, args, opts) {
  Monitor.call(this);
  this.set(defaults);
  this.set(trim(opts || {}));
  this.set('cmd', cmd);
  this.set('args', args);
  this._meta = {};
  this._process = null;
}

inherits(Interface, Monitor);

facet(Interface);

Object.defineProperty(Interface.prototype, 'pid', {
  get: function () {
    return this._process
      ? this._process.pid
      : null;
  }
});
