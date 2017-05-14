function init() {
  var express = require('express');
  var app = express();
  var server = require('http').Server(app);
  server.listen(3000);
  return server;
}


module.exports = init;
