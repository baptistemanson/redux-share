var ReduxShareServer = require('../src/redux-share-server');
var express = require('express');
var app = express();

var server = require('http').Server(app);
var redux = require('redux');

var init = function(reducers, config) {
  var reduxShare = new ReduxShareServer(server, config);
  var reduxShareMW = reduxShare.getReduxMiddleware();

  var store = redux.createStore(reducers, redux.applyMiddleware(reduxShareMW));
  store.dispatch({ type:"@@SERVER-LISTEN-START" });
  server.listen(3000);

  return store;
}

module.exports = init;
