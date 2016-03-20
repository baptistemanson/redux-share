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

The system is currently provided with an express middleware for the server side implementation, while the client is agnostic.

This package is experimental and API will change.

The client is available [here](https://github.com/baptistemanson/redux-share-client)
## Server

Here is the code to integrate the server side with express:


```javascript
//server.js

//start the socket server
var ReduxShareServer = require('redux-share-server')
var shareServer = new ReduxShareServer(store,server);

//bind redux server and express
app.use('/redux',shareServer.getExpressMiddleware());

```

## Example of a reducer server side

```javascript
//will replicate on the server-side the client-side state.
function reducer(state = {} , action) { 
	if(action.type === "@@SYNC-CONNECT-SERVER-SUCCESS") return action.state;
}


## API Endpoints (server)

* /redux/state: GET the state.
* /redux/action: POST an action.



## Special actions type dispatched

Please consult the client to see the special actions dispatched to the redux store, that you can reduce to add your own algorithm.

