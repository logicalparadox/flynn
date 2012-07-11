var Monitor = require('./flynn/monitor');

var exports = module.exports = function (a, b, c) {
  return new Monitor(a, b, c);
};

exports.version = '0.1.0';
