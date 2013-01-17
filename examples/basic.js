var flynn = require('../index');

var mon = flynn('node', 'server.js 2', { cwd: __dirname });

mon.start();

setTimeout(function () {
  mon.restart(function () {
    setTimeout(function () {
      mon.stop();
    }, 1000);
  });
}, 1000);
