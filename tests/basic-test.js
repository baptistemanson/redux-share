var chai = require('chai');
var expect = chai.expect;

var reducers = require('./reducers');

describe('basic server and client', function() {

  it('should run without any errors thrown', function() {
    var server = require('./server-store')(reducers);
    var client = require('./client-store')(reducers);
  });

});

describe('communication between server and client', function() {

  it('should recieve actions from the client', function(done) {
    var server = require('./server-store')(reducers);
    var client = require('./client-store')(reducers);
    client.dispatch({ type: 'INCREMENT' });
    setTimeout(function() {
      expect(server.getState().likes).to.equal(1);
      done();
    }, 50);
  });

});

