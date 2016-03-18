"use strict";
var bodyParser = require('body-parser');
var WebSocketServer = require('ws').Server;
var express = require('express');


class SyncReduxServer {
  /**
   * Constructor of the server
   *
   * @param store
   * @param server
   */
  constructor (store,
               server,
               broadcastOnReceive = false,
               onConnectionCallback = null,
               onPreSendCallback = null,
               onActionReceived = null) {
    /**
     * Websocket Server
     */
    this.wss = new WebSocketServer({server: server});

    /**
     * Redux store to link to the clients
     */
    this.store = store;

    /**
     * If true, will broadcast received action to all clients
     * @type {boolean}
     */
    this.broadcastOnReceive = broadcastOnReceive;

    /**
     * Flag to know if the server must display debug
     *
     * @type {boolean}
     */
    this.debug = false;

    /**
     * After the connection of a new client,
     * this function will be called if set
     *
     * @type {null}
     */
    this.onConnectionCallback = onConnectionCallback;

    /**
     * If set, will be called before sending a message
     * If it return false the message will not be set
     * @type {function(socket)}
     */
    this.onPreSendCallback = onPreSendCallback;

    /**
     * If set, will be called just after receiving an action
     *
     * @type {function(action, socket)}
     */
    this.onActionReceived = onActionReceived;

    /**
     * Bind the socket behavior
     */
    this.wss.on('connection', function connection (socket) {
      if (this.onConnectionCallback !== null) {
        this.onConnectionCallback(socket);
      }
      if (this.debug) {
        console.log('Assigned id: ' + socket.id);
      }
      socket.on('message', function incoming (message) {
        if (this.debug) {
          console.log(message);
        }
        let action = JSON.parse(message);
        if (this.onActionReceived !== null) {
          action = this.onActionReceived.apply(this, [action, socket])
        }
        if (this.debug) {
          console.log('Action to dispatch: [%o]', action);
        }
        this.store.dispatch(action);
        if (this.debug) {
          console.log(store.getState());
        }
        if (this.broadcastOnReceive) {
          this.broadcastToOtherClient(action);
        }
      }.bind(this));

    }.bind(this));
  }

  /**
   * Set the debug mode of the server
   *
   * @param debug
   */
  setDebug (debug = false) {
    this.debug = debug;
  }

  /**
   * Return an express middleware
   *
   * @returns {*}
   */
  getMiddleware () {
    var router = express.Router();

    router.use(bodyParser.urlencoded({extended: false}));
    router.use(bodyParser.json())

    router.post('/action', function (req, res) {
      if (this.debug) {
        console.log("Dispatches an action to all clients", req.body);
      }
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

  /**
   * Send an action
   * @param socket
   * @param action
   */
  sendAction (action, socket) {
    if (this.onPreSendCallback !== null) {
      if (!this.onPreSendCallback.apply(this, [action, socket])) {
        return;
      }
    }
    socket.send(JSON.stringify(action));
  }

  /**
   * Find a socket searching for a property
   * Return the last socket matching the property
   *
   * return null in case no socket are found
   * @param value
   * @param property
   * @returns {socket|null}
   */
  getSocketByProperty (value, property) {
    var socketMatch = null;
    this.wss.clients.forEach(function each (socket) {
      if (socket[property] !== undefined && socket[property] === value) {
        socketMatch = socket;
      }
    }.bind(this));
    if (socketMatch === null && this.debug) {
      console.log("Did not found any socket with [" + property + "] to [" + value + "]");
    }
    return socketMatch;
  }

  /**
   * Broadcast a message to all clients
   *
   * @param action
   * @param senderSocket
   */
  broadcastToOtherClient (action) {
    this.wss.clients.forEach(function each (socket) {
      this.sendAction(action, socket);
    }.bind(this));
  }
}
;

module.exports = function (store, server, broadcastOnReceive = false,
                           onConnectionCallback = null,
                           onPreSendCallback = null,
                           onActionReceived = null) {
  return new SyncReduxServer(store, server, broadcastOnReceive,
    onConnectionCallback, onPreSendCallback, onActionReceived);
};