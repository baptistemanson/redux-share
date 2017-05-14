var chai = require('chai');
var expect = chai.expect;

var reducers = require('./utils/reducers');

describe('basic server and client', function() {
  var server;
  var serverStore;

  beforeEach(function() {
    server = require('./utils/server')();
    serverStore = require('./utils/server-store')(server, reducers);
  });

  it('should recieve actions from the client', function(done) {
    var client = require('./utils/client-store')(reducers);
    setTimeout(function() {
      client.dispatch({ type: 'INCREMENT' });
    }, 20);
    setTimeout(function() {
      expect(serverStore.getState().likes).to.equal(1);
      done();
    }, 50);
  });

  afterEach(function() {
    server.close();
  });

});
