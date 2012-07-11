module.exports = process.env.FLYNN_COV
  ? require('./lib-cov/flynn')
  : require('./lib/flynn');
