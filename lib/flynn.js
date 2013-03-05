var Interface = require('./flynn/interface');

var exports = module.exports = function (a, b, c) {
  return new Interface(a, b, c);
};

exports.version = '0.2.2';
