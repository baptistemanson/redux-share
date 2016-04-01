# redux-share-server

```
  /$$$$$$  /$$                                    
 /$$__  $$| $$                                    
| $$  \__/| $$$$$$$   /$$$$$$   /$$$$$$   /$$$$$$
|  $$$$$$ | $$__  $$ |____  $$ /$$__  $$ /$$__  $$
 \____  $$| $$  \ $$  /$$$$$$$| $$  \__/| $$$$$$$$
 /$$  \ $$| $$  | $$ /$$__  $$| $$      | $$_____/
|  $$$$$$/| $$  | $$|  $$$$$$$| $$      |  $$$$$$$
 \______/ |__/  |__/ \_______/|__/       \_______/

```

Share redux state across the network between multiple clients and server!
_This package is experimental and API will change._
This page is the main documentation.


## Install

We only support NPM-like install.

```bash
$ npm install git@github.com:baptistemanson/redux-share-server.git

```

Then add the redux middleware on your server-side store, like so:
```javascript
// server.js

var server = require('http').createServer();
var redux = require('redux');

var ReduxShareServer = require('redux-share-server');

var reduxShare = new ReduxShareServer(server);

var store = redux.createStore(
  reducers, // your reducers, as usual
  redux.applyMiddleware( reduxShare.getReduxMiddleware()
));

//this action starts the socket server
store.dispatch({type:"@@SERVER-LISTEN-START"});

server.listen(8080 /* port number */);

```

This is an example of a client install, which works in a browser on a node install:
```javascript
// client.js
import SyncReduxClient from 'redux-share-client';
import redux from 'redux';

var reduxShare = new SyncReduxClient('ws://localhost:2000');
var store = redux.createStore(
  reducers, // your reducers, as usual
  redux.applyMiddleware( reduxShare.getReduxMiddleware() )
);

// This action starts the connection to the server.
store.dispatch({type:"@@SYNC-CONNECT-SERVER-START"});
```

## General Architecture

The server-side system is currently provided in the form of:
* a redux middleware for receiving and sending actions to the clients.
* an optional express middleware for monitoring and debugging the different states.

The client-side is simply:
* a redux middleware for receiving and sending actions from and to the server.

The client is available [here](https://github.com/baptistemanson/redux-share-client)


## Flow

Here is the general flow of the redux middleware.

```

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


```

### onConnect
Called when a connection is established with a new client.
_By default, add a unique an id to the socket to identify each client._

### onActionReceived
When a message is received from a client, onActionReceived is called immediately upon reception.
This hook allows you to mutate the action, like identifying which client has sent this action for instance.
_By default, a property "origin" is added to the action with the client id._

### shouldDispatch
Called before forwarding to the next middleware. If shouldDispatch returns false, the action won't be propagated to the reducers. However the action can still be send if shouldSend returns true.
_By default, it dispatches all actions._

### shouldSend
Called after calling the reducers, once per client connected. If true, the action will be sent to the given client.
_By default, shouldSend sends all actions to all clients._


## Resolving conflicts

You can with redux-share implement a few design patterns to sync your states and resolve conflicts.
As you have several clients working concurrently on the same _global_ state, some actions may not be legit.

### Optimistic // async

Optimistic sync assumes that the action from a client won't collide with another clients.

* shouldDispatch (client): all
* shouldSend (client): only the actions coming from the current client.

* shouldDispatch (server): all.
* shouldSend (server): only if the action was not legit, dispatch an action to rollback/reset the state to the correct value.


### Pessimistic // sync

Pessimistic assumes conflicts are frequent.

* shouldDispatch (client): only the actions coming from the server
* shouldSend (client): only the actions coming from the current client.

* shouldDispatch (server): all.
* shouldSend (server): all legit actions.

### RTS

Clocked updates are a technique used in famous Real Time Strategy games.
It is a spin on the pessimistic approach, with a buffer of legit actions.

* shouldDispatch (client): only the actions coming from the server.
* shouldSend (client): only the actions coming from the current client.

* shouldDispatch (server): all
* shouldSend (server): only the metronome action, which flushes pending actions at the same time to all clients.

The metronome action is triggered at regular intervals, for instance:

```javascript
setInterval(
  () => store.dispatch({
    type:"metro",
    bufferedActions:[
      /** here the list of the actions buffered**/
    ]}), 50);
```

## Performance

The server and the client have been tested up to:
* 120Hz message refresh rate (120 messages per second)
* with 5 clients connected
* for 10 min in repeater mode
* on a regular macbook pro

If you have the opportunity to test this system with more than 5 clients, please let us know!


## Monitoring Express Middleware

Here is the code to integrate the server side with express:

```javascript

//server.js

//start the socket server
var ReduxShareServer = require('redux-share-server');
var shareServer = new ReduxShareServer(server);

// ... your code here to add the redux middleware etc...

//bind redux server and express
app.use('/redux',shareServer.getExpressMiddleware());


```

By adding the express middleware, you actually add two endpoints to your server for debugging purposes:

* /redux/state: GET the state from the server.
* /redux/action: POST an action.



## Special actions type dispatched

* @@SYNC-CONNECT-SERVER-START: call it to initiate the connection. This action will not be seen by the server.
* @@SYNC-CONNECT-SERVER-SUCCESS: called on the client after the connection is successful, with the state in the payload. This action is the first the server will see.
* @@SYNC-CONNECT-SERVER-FAILED: dispatched when the connection fails.
* @@SYNC-CONNECT-SERVER-FAILED-FATAL: dispatched when the connection fails, and it won't try to reconnect.

Please consult the  to see the special actions dispatched to the redux store, that you can reduce to add your own algorithm.


# FAQ

If I want to have different states on the server and client side?
- You can use different reducer on the server to apply differently the actions on. For instance, you server side reducer may use the origin field to apply on part of the states.

If I want to have private data on the client-side?
- Please check the question above mentioning "different states on the server and client".

If I want to have private actions on a given client?
- You can use the shouldSend method.

On the server-side, I have received an action that is not legit anymore as the state has been changed in between, how should I proceed?
- You have to write your own conflict resolution reducer/protocol. For instance, the hard re-sync: dispatch an action with the public/server side state. Send this action to all clients. All clients have to cancel and replace their local state with the provided  public/server side state.

How do I handle disconnection?
- The same way as conflicts.

How stable is this library?
- Not stable.

Do you use it in prod?
- No.
