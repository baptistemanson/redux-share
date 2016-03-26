(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("body-parser"), require("ws"), require("express"));
	else if(typeof define === 'function' && define.amd)
		define(["body-parser", "ws", "express"], factory);
	else if(typeof exports === 'object')
		exports["ReduxShareServer"] = factory(require("body-parser"), require("ws"), require("express"));
	else
		root["ReduxShareServer"] = factory(root["body-parser"], root["ws"], root["express"]);
})(this, function(__WEBPACK_EXTERNAL_MODULE_1__, __WEBPACK_EXTERNAL_MODULE_2__, __WEBPACK_EXTERNAL_MODULE_3__) {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "/dist/";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	
	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();
	
	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
	
	var bodyParser = __webpack_require__(1);
	var WebSocketServer = __webpack_require__(2).Server;
	var express = __webpack_require__(3);
	
	var ReduxShareServer = function () {
	  /**
	   * Constructor of the server
	   *
	   * @param {Object} server
	   * @param {Object} options
	   */
	
	  function ReduxShareServer(server, options) {
	    _classCallCheck(this, ReduxShareServer);
	
	    /**
	     * Websocket Server
	     */
	    this.wss = new WebSocketServer({ server: server });
	    this.readyToServe = false;
	
	    /**
	     * Redux store to link to the clients
	     */
	    this.store = null;
	
	    var defaultOptions = {
	      //if given in parameter, will not be initiated from the Redux middleware
	      store: null,
	      //if set to true, will output debug on the console
	      debug: false,
	      //if set, will be called at connection time. Returns the socket.
	      onConnection: null,
	      //if set, will be called before receiving each action.
	      onActionReceived: null,
	      //if set, this function will filter all actions before sending. Returns bool.
	      shouldSend: null,
	      //if true dispatches all actions received to all other connected clients. Please note that the API call to state bypasses this option.
	      repeaterMode: false
	    };
	
	    this.options = Object.assign({}, defaultOptions, options);
	
	    if (this.options.store !== null) {
	      this.store = this.options.store;
	    }
	
	    if (this.store) init(this.store);
	  }
	
	  _createClass(ReduxShareServer, [{
	    key: 'init',
	    value: function init(store) {
	      /**
	       * Bind the socket behavior
	       */
	      this.wss.on('connection', function connection(socket) {
	        if (typeof this.options.onConnection == 'function') {
	          socket = this.options.onConnection(socket) || socket;
	        }
	
	        socket.on('message', function incoming(message) {
	          this.log("Received from client the message ", message);
	
	          var action = JSON.parse(message);
	
	          if (typeof this.options.onActionReceived == 'function') {
	            action = this.options.onActionReceived.apply(this, [action, socket]);
	          }
	
	          this.log('Dispatching the action to the store', action);
	
	          this.store.dispatch(action);
	
	          if (this.options.repeaterMode) {
	            this.broadcastAction(action, function (s) {
	              return s !== socket;
	            });
	          }
	        }.bind(this));
	      }.bind(this));
	      this.readyToServe = true;
	    }
	
	    /**
	    * Internal log function
	    *
	    */
	
	  }, {
	    key: 'log',
	    value: function log() {
	      if (this.options.debug) {
	        var _console;
	
	        (_console = console).log.apply(_console, ["redux-share-server: "].concat(Array.prototype.slice.call(arguments)));
	      }
	    }
	
	    /**
	     * Return an Express middleware
	     *
	     * @returns {*}
	     */
	
	  }, {
	    key: 'getExpressMiddleware',
	    value: function getExpressMiddleware() {
	      var router = express.Router();
	
	      router.use(bodyParser.urlencoded({ extended: false }));
	      router.use(bodyParser.json());
	
	      router.post('/action', function (req, res) {
	        var action = req.body;
	        this.log('Dispatching an action to the store', action);
	        this.store.dispatch(action);
	        if (this.readyToServe) {
	          this.broadcastAction(action);
	        }
	        res.send(JSON.stringify({ success: true }));
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
	     * @returns {Function}
	     */
	
	  }, {
	    key: 'getReduxMiddleware',
	    value: function getReduxMiddleware() {
	      var _this = this;
	
	      return function (store) {
	        return function (next) {
	          return function (action) {
	            _this.log('Action [' + action.type + '] received by the server redux middleware');
	
	            if (_this.store === null) {
	              _this.store = store;
	            }
	
	            //need to enrich next action.
	            var result = next(action);
	            // If the action have been received, we don't send it back to the client
	            if (action.origin === undefined || action.origin === 'server') {
	              if (_this.options.repeaterMode) {
	                _this.broadcastAction(action);
	              }
	            }
	            if (action.type === "@@SERVER-LISTEN-START") _this.init(store);
	            return result;
	          };
	        };
	      };
	    }
	
	    /**
	     * Finds a list of socket matching a property
	     *
	     * return [] if nothing found.
	     * @param property
	     * @param value.
	     * @returns {array}
	     */
	
	  }, {
	    key: 'findSockets',
	    value: function findSockets(property, value) {
	      return this.wss.clients.filter(function each(socket) {
	        return socket[property] !== undefined && socket[property] === value;
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
	
	  }, {
	    key: 'broadcastAction',
	    value: function broadcastAction(action) {
	      var filter = arguments.length <= 1 || arguments[1] === undefined ? null : arguments[1];
	
	
	      this.log("Dispatches an action to all clients", action);
	
	      if (typeof filter !== 'function') filter = function filter() {
	        return true;
	      };
	
	      return this.wss.clients.filter(filter).map(function each(socket) {
	        return this.sendToAction(action, socket);
	      }.bind(this));
	    }
	
	    /**
	     * Sends an action
	     * @param socket
	     * @param action
	     */
	
	  }, {
	    key: 'sendToAction',
	    value: function sendToAction(action, socket) {
	      var tracedAction = Object.assign({}, action, { origin: "server" });
	
	      if (typeof this.options.shouldSend == 'function' && !this.options.shouldSend.apply(this, [tracedAction, socket])) {
	        return;
	      }
	
	      this.log("Dispatches an action to a client", tracedAction);
	
	      return socket.send(JSON.stringify(tracedAction));
	    }
	  }]);
	
	  return ReduxShareServer;
	}();
	
	module.exports = ReduxShareServer;

/***/ },
/* 1 */
/***/ function(module, exports) {

	module.exports = require("body-parser");

/***/ },
/* 2 */
/***/ function(module, exports) {

	module.exports = require("ws");

/***/ },
/* 3 */
/***/ function(module, exports) {

	module.exports = require("express");

/***/ }
/******/ ])
});
;
//# sourceMappingURL=server.bundle.js.map