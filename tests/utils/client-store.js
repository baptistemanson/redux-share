var redux = require('redux');
var ReduxShareClient = require('redux-share-client');

var init = function(reducers, config = {}) {
  var reduxShare = new ReduxShareClient('ws://localhost:3000/', config);
  var reduxShareMW = reduxShare.getReduxMiddleware();

  var store = redux.createStore(reducers, redux.applyMiddleware(reduxShareMW));
  store.dispatch({ type:"@@SYNC-CONNECT-SERVER-START" });

  return store;
}

module.exports = init;
