"use strict";
var bodyParser = require('body-parser');
var WebSocketServer = require('ws').Server;
var express = require('express');


class ReduxShareServer {
  /**
   * Constructor of the server
   *
   * @param {Object} server
   * @param {Object} options
   */
  constructor (server,
               options) {
    /**
     * Websocket Server
     */
    this.wss = new WebSocketServer({server: server});
    

    /**
     * Redux store to link to the clients
     */
    this.store = null;

    let defaultOptions = {
      //if set to true, will output debug on the console
      debug:false,
      //if set, this function will be called at connection time. Returns the socket.
      onConnection: (socket) => { socket.id = this.socketNumber++; return socket; },
      //if set, this function will be called before receiving each action. Allow you to modify the action.
      onActionReceived: (action,socket) => { action.origin = socket.id; return action; },
      //if set, this function will filter all actions before dispatching. Returns bool.
      shouldDispatch: action => (action.type !== '@@SYNC-CONNECT-SERVER-SUCCESS'), 
      //if set, this function will filter all actions before sending. Returns bool.
      shouldSend: () => true,
      //if true dispatches all actions received to all other connected clients. Please note that the API call to state bypasses this option.
      repeaterMode:false
    };

    this.options = Object.assign({},defaultOptions,options);

    //internal state
    this.readyToServe = false;
    this.socketNumber = 0;
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
      
      if(this.store) {
        this.store.dispatch(action);
        res.send(JSON.stringify({success: true}));
      }
      else {
        let message = "Not ready yet, did you attach the redux middleware and dispatch the action @@SERVER-LISTEN-START?";
        this.log(message);
        res.send(JSON.stringify({ success: false, message:message }));
      }
      res.end();
      
    }.bind(this));

    router.get('/state', function (req, res) {
      res.send(JSON.stringify(this.store.getState(), null, 4));
      res.end();
    }.bind(this));

    return router;
  }

  /**
   * Get the middleware for Redux
   * This middleware will broadcast server actions to all clients
   *  
   *  

      store.dispatch  WS
             |        |
             |  onActionReceived()
             |        |
             v        v 
        +------------------+
        |                  |
        |                  |
        |    Middleware    |
        |                  |
        |                  |
        +--------+---------+
                 |      
         ShouldDispatch()? --------+
                 |                 |
      (next middleware...then)     |
        +--------v---------+       |
        |                  |       |
        |                  |       |
        |     Reducers     |       |
        |                  |       |
        |                  |       |
        +--------+---------+       |
                 |                 |
                 |<----------------+
                 |
        +--------v---------+
        |                  |
        |    Middleware    |
        |                  |
        +--------+---------+
                 |      
                 V
            ShouldSend()? 
                 |
                 V
                 WS
   *
   * @returns {Function}
   */
  getReduxMiddleware() {
    return store => next => action => {
      this.log('Action "' + action.type + '" received by the redux middleware');

      if(this.store === null) {
        this.store = store;
      }

      //should dispatch?
      if(this.options.shouldDispatch.apply(this,[action]) ) {
        this.log("We dispatch this action ");
        var result = next(action);
      }
      else {
        this.log("We dont dispatch this action ");
        var result = null;
      }
      
      // If the action have been received, we don't send it back to the client
      if (action.origin === undefined || action.origin === 'server') {
        if (this.options.repeaterMode) {
          this.broadcastAction(action);
        }
      }
      if (action.type === "@@SERVER-LISTEN-START") this._startListen();
      return result;
    }
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
    
    if(this.options.shouldSend.apply(this, [tracedAction, socket])) {
      this.log("Send to client ", socket.id," ",tracedAction);
      return socket.send(JSON.stringify(tracedAction));
    }
    else {
      this.log("Do not send to client ", socket.id, " ",tracedAction);
    }

  }

  /**
  * Internal log function
  *
  */
  log() {
    if (this.options.debug) {
        console.log("redux-share-server: ", ...arguments);
      }
  }

  /**
  * Private method to init the store
  */
  _startListen() {

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

        if(this.store) {
          this.store.dispatch(action);
        }
        else {
          this.log('Store not ready yet, did you forget to add the redux middleware?')
        }

        if (this.options.repeaterMode) {
          this.broadcastAction(action,s => s !== socket);
        }
      }.bind(this));

    }.bind(this));
    this.readyToServe = true;
  }

}


module.exports = ReduxShareServer;