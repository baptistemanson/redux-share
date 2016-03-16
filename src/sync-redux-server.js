"use strict";
var bodyParser = require('body-parser');
var WebSocketServer = require('ws').Server;
var express = require('express');


class SyncReduxServer {
  constructor (store, server) {
    this.wss = new WebSocketServer({server: server});
    this.store = store;
    this.broadcastOnReceive = false;
    this.wss.on('connection', function connection (socket) {
      socket.id = Math.random() * (9999999) + '';
      console.log('Assigned id: ' + socket.id);
      socket.on('message', function incoming (message) {
        console.log(message);
        let action = JSON.parse(message);
        action.senderId = socket.id;
        this.store.dispatch(action);
        console.log(store.getState());
        if (this.broadcastOnReceive) {
          this.broadcastToOtherClient(action, socket);
        }
      }.bind(this));

    }.bind(this));
  }

  setBroadcastOnReceive = function (broadcast) {
    this.broadcastOnReceive = broadcast;
  };

  getMiddleware () {
    var router = express.Router();

    router.use(bodyParser.urlencoded({extended: false}));
    router.use(bodyParser.json())

    router.post('/action', function (req, res) {
      console.log("Dispatches an action to all clients", req.body);
      this.spread(req.body);
      res.send(JSON.stringify({success: true}));
      res.end();
    }.bind(this));

    router.get('/state', function (req, res) {
      res.send(JSON.stringify(this.store.getState(), null, 4));
      res.end();
    }.bind(this));

    return router;
  }

  broadcastToOtherClient (action, senderSocket) {
    this.wss.clients.forEach(function each (client) {
      if (client.id !== senderSocket.id && (action.type !== '@@SYNC-CONNECT-SERVER-END')) {
        console.log(client.id);
        console.log(senderSocket.id);
        client.send(JSON.stringify(action));
      }
    });
  }

}
;

module.exports = function (store, server) {
  return new SyncReduxServer(store, server)
};