var ReduxShareServer = require('../../src/redux-share-server');

var redux = require('redux');

var init = function(server, reducers, config = {}) {
  var reduxShare = new ReduxShareServer(server, config);
  var reduxShareMW = reduxShare.getReduxMiddleware();

  var store = redux.createStore(reducers, redux.applyMiddleware(reduxShareMW));
  store.dispatch({ type:"@@SERVER-LISTEN-START" });

  return store;
}

module.exports = init;
