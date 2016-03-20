"use strict";
var bodyParser = require('body-parser');
var WebSocketServer = require('ws').Server;
var express = require('express');


class ReduxShareServer {
  /**
   * Constructor of the server
   *
   * @param store
   * @param server
   */
  constructor (store,
               server,
               options) {
    /**
     * Websocket Server
     */
    this.wss = new WebSocketServer({server: server});

    /**
     * Redux store to link to the clients
     */
    this.store = store;

    let defaultOptions = {
      debug:false,
      //if set, will be called at connection time. Returns the socket.
      onConnection:null,
      //if set, will be called before receiving each action.
      onActionReceived:null,
      //if set, this function will filter all actions before sending. Returns bool.
      shouldSend:null,
      //if true dispatches all actions received to all other connected clients. Please note that the API call to state bypasses this option.
      repeaterMode:false
    };

    this.options = Object.assign({},defaultOptions,options);

    /**
     * Bind the socket behavior
     */
    this.wss.on('connection', function connection (socket) {
      if (typeof(this.options.onConnection) == 'function') {
        socket = this.options.onConnection(socket) || socket;
      }

      socket.on('message', function incoming (message) {
        this.log("Received from client the message ",message);

        let action = JSON.parse(message);

        if (typeof(this.options.onActionReceived) == 'function') {
          action = this.options.onActionReceived.apply(this, [action, socket])
        }

        this.log('Dispatching the action to the store', action);

        this.store.dispatch(action);

        if (this.options.broadcastMode) {
          this.broadcastAction(action,s => s !== socket);
        }
      }.bind(this));

    }.bind(this));
  }

  /**
  * Internal log function
  *
  */
  log() {
    if (this.options.debug) {
        console.log("redux-share-server: ",...arguments);
      }
  }

  /**
   * Return an Express middleware
   *
   * @returns {*}
   */
  getExpressMiddleware () {
    var router = express.Router();

    router.use(bodyParser.urlencoded({extended: false}));
    router.use(bodyParser.json())

    router.post('/action', function (req, res) {
      let action = req.body;
      this.log('Dispatching an action to the store', action);
      this.store.dispatch(action);
      this.broadcastAction(action);
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
   * Finds a list of socket matching a property
   *
   * return [] if nothing found.
   * @param property
   * @param value.
   * @returns {array}
   */
  findSockets(property,value) {
    return this.wss.clients.filter(function each (socket) {
      return (socket[property] !== undefined && socket[property] === value);
    });
  }

  /**
   * Broadcasts a message to all clients
   * 
   * Bypasses the repeaterMode option.
   * @param action
   * @param senderSocket
   * @returns array
   */
  broadcastAction(action,filter = null) {

    this.log("Dispatches an action to all clients", action);

    if(typeof(filter) !== 'function') filter = () => true;
    
    return this.wss.clients.filter(filter).map(function each (socket) {
      return this.sendToAction(action, socket);
    }.bind(this));
  }


  /**
   * Sends an action
   * @param socket
   * @param action
   */
  sendToAction(action,socket) {
    let tracedAction = Object.assign({},action,{origin:"server" });
    
    if( typeof(this.options.shouldSend) == 'function' && !this.options.shouldSend.apply(this, [tracedAction, socket])) {
        return;
    }

    this.log("Dispatches an action to a client", tracedAction);

    return socket.send(JSON.stringify(tracedAction));
  }

}

module.exports = ReduxShareServer;