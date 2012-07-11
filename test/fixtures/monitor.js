var http = require('http');

var app = http.createServer(function (req, res) {
  res.writeHead(200, { 'content-type': 'text/plain' });
  res.write('Hello Universe');
  res.end();
});

switch (process.argv[2]) {
  case '1':
    process.exit(1);
    break;
  case '2':
    app.listen(process.argv[3] || 4567);
    break;
  default:
    console.log('need command number');
    process.exit();
    break;
}
