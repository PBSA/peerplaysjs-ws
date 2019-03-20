(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.peerplays_ws = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.ChainWebSocket = exports.Manager = exports.ChainConfig = exports.Apis = undefined;

var _ApiInstances = require('./src/ApiInstances');

var _ApiInstances2 = _interopRequireDefault(_ApiInstances);

var _ConnectionManager = require('./src/ConnectionManager');

var _ConnectionManager2 = _interopRequireDefault(_ConnectionManager);

var _ChainConfig = require('./src/ChainConfig');

var _ChainConfig2 = _interopRequireDefault(_ChainConfig);

var _ChainWebSocket = require('./src/ChainWebSocket');

var _ChainWebSocket2 = _interopRequireDefault(_ChainWebSocket);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.Apis = _ApiInstances2.default;
exports.ChainConfig = _ChainConfig2.default;
exports.Manager = _ConnectionManager2.default;
exports.ChainWebSocket = _ChainWebSocket2.default;
},{"./src/ApiInstances":2,"./src/ChainConfig":3,"./src/ChainWebSocket":4,"./src/ConnectionManager":5}],2:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _ChainWebSocket = require('./ChainWebSocket');

var _ChainWebSocket2 = _interopRequireDefault(_ChainWebSocket);

var _GrapheneApi = require('./GrapheneApi');

var _GrapheneApi2 = _interopRequireDefault(_GrapheneApi);

var _ChainConfig = require('./ChainConfig');

var _ChainConfig2 = _interopRequireDefault(_ChainConfig);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var inst = void 0;

var ApisInstance = function () {
  function ApisInstance() {
    _classCallCheck(this, ApisInstance);
  }

  /** @arg {string} connection .. */
  ApisInstance.prototype.connect = function connect(cs, connectTimeout) {
    var _this = this;

    var rpc_user = '';
    var rpc_password = '';

    if (typeof window !== 'undefined' && window.location && window.location.protocol === 'https:' && cs.indexOf('wss://') < 0) {
      throw new Error('Secure domains require wss connection');
    }

    this.ws_rpc = new _ChainWebSocket2.default(cs, this.statusCb, connectTimeout);

    this.init_promise = this.ws_rpc.login(rpc_user, rpc_password).then(function () {
      console.log('Connected to API node:', cs);
      _this._db = new _GrapheneApi2.default(_this.ws_rpc, 'database');
      _this._net = new _GrapheneApi2.default(_this.ws_rpc, 'network_broadcast');
      _this._hist = new _GrapheneApi2.default(_this.ws_rpc, 'history');
      _this._crypto = new _GrapheneApi2.default(_this.ws_rpc, 'crypto');
      _this._bookie = new _GrapheneApi2.default(_this.ws_rpc, 'bookie');
      var db_promise = _this._db.init().then(function () {
        return _this._db.exec('get_chain_id', []).then(function (_chain_id) {
          _this.chain_id = _chain_id;
          return _ChainConfig2.default.setChainId(_chain_id);
        });
      });

      _this.ws_rpc.on_reconnect = function () {
        _this.ws_rpc.login('', '').then(function () {
          _this._db.init().then(function () {
            if (_this.statusCb) {
              _this.statusCb(_ChainWebSocket2.default.status.RECONNECTED);
            }
          });
          _this._net.init();
          _this._hist.init();
          _this._crypto.init();
          _this._bookie.init();
        });
      };

      return Promise.all([db_promise, _this._net.init(), _this._hist.init(),
      // Temporary squash crypto API error until the API is upgraded everywhere
      _this._crypto.init().catch(function (e) {
        return console.error('ApiInstance\tCrypto API Error', e);
      }), _this._bookie.init()]);
    });
  };

  ApisInstance.prototype.close = function close() {
    if (this.ws_rpc) {
      this.ws_rpc.close();
    }

    this.ws_rpc = null;
  };

  ApisInstance.prototype.db_api = function db_api() {
    return this._db;
  };

  ApisInstance.prototype.network_api = function network_api() {
    return this._net;
  };

  ApisInstance.prototype.history_api = function history_api() {
    return this._hist;
  };

  ApisInstance.prototype.crypto_api = function crypto_api() {
    return this._crypto;
  };

  ApisInstance.prototype.bookie_api = function bookie_api() {
    return this._bookie;
  };

  ApisInstance.prototype.setRpcConnectionStatusCallback = function setRpcConnectionStatusCallback(callback) {
    this.statusCb = callback;
  };

  return ApisInstance;
}();

/**
    Configure: configure as follows `Apis.instance("ws://localhost:8090").init_promise`.  This
    returns a promise, once resolved the connection is ready.

    Import: import { Apis } from "@graphene/chain"

    Short-hand: Apis.db("method", "parm1", 2, 3, ...).  Returns a promise with results.

    Additional usage: Apis.instance().db_api().exec("method", ["method", "parm1", 2, 3, ...]).
    Returns a promise with results.
*/

exports.default = {
  setRpcConnectionStatusCallback: function setRpcConnectionStatusCallback(callback) {
    this.statusCb = callback;

    if (inst) {
      inst.setRpcConnectionStatusCallback(callback);
    }
  },

  /**
        @arg {string} cs is only provided in the first call
        @return {Apis} singleton .. Check Apis.instance().init_promise to
        know when the connection is established
    */
  reset: function reset() {
    var cs = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'ws://localhost:8090';
    var connect = arguments[1];
    var connectTimeout = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 4000;

    if (inst) {
      inst.close();
      inst = null;
    }

    inst = new ApisInstance();
    inst.setRpcConnectionStatusCallback(this.statusCb);

    if (inst && connect) {
      inst.connect(cs, connectTimeout);
    }

    return inst;
  },
  instance: function instance() {
    var cs = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'ws://localhost:8090';
    var connect = arguments[1];
    var connectTimeout = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 4000;

    if (!inst) {
      inst = new ApisInstance();
      inst.setRpcConnectionStatusCallback(this.statusCb);
    }

    if (inst && connect) {
      inst.connect(cs, connectTimeout);
    }

    return inst;
  },
  chainId: function chainId() {
    return this.instance().chain_id;
  },
  close: function close() {
    if (inst) {
      inst.close();
      inst = null;
    }
  }
  // db: (method, ...args) => Apis.instance().db_api().exec(method, toStrings(args)),
  // network: (method, ...args) => Apis.instance().network_api().exec(method, toStrings(args)),
  // history: (method, ...args) => Apis.instance().history_api().exec(method, toStrings(args)),
  // crypto: (method, ...args) => Apis.instance().crypto_api().exec(method, toStrings(args))

};
},{"./ChainConfig":3,"./ChainWebSocket":4,"./GrapheneApi":6}],3:[function(require,module,exports){
'use strict';

exports.__esModule = true;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var defaults = {
  core_asset: 'PPY',
  address_prefix: 'PPY',
  expire_in_secs: 15,
  expire_in_secs_proposal: 24 * 60 * 60,
  review_in_secs_committee: 24 * 60 * 60
};

var networks = {
  networks: {
    Peerplays: {
      core_asset: 'PPY',
      address_prefix: 'PPY',
      chain_id: '6b6b5f0ce7a36d323768e534f3edb41c6d6332a541a95725b98e28d140850134'
    },
    PeerplaysTestnet: {
      core_asset: 'PPYTEST',
      address_prefix: 'PPYTEST',
      chain_id: 'be6b79295e728406cbb7494bcb626e62ad278fa4018699cf8f75739f4c1a81fd'
    }
  }
};

var ChainConfig = function () {
  function ChainConfig() {
    _classCallCheck(this, ChainConfig);

    this.reset();
  }

  ChainConfig.prototype.reset = function reset() {
    Object.assign(this, defaults);
  };

  ChainConfig.prototype.setChainId = function setChainId(chainID) {
    var ref = Object.keys(networks);

    for (var i = 0, len = ref.length; i < len; i++) {
      var network_name = ref[i];
      var network = networks[network_name];

      if (network.chain_id === chainID) {
        this.network_name = network_name;

        if (network.address_prefix) {
          this.address_prefix = network.address_prefix;
        }

        return {
          network_name: network_name,
          network: network
        };
      }
    }

    if (!this.network_name) {
      console.log('Unknown chain id (this may be a testnet)', chainID);
    }
  };

  ChainConfig.prototype.setPrefix = function setPrefix() {
    var prefix = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'PPY';

    this.address_prefix = prefix;
  };

  return ChainConfig;
}();

exports.default = new ChainConfig();
},{}],4:[function(require,module,exports){
'use strict';

exports.__esModule = true;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var SOCKET_DEBUG = false;
var WebSocketClient = null;

if (typeof WebSocket !== 'undefined') {
  WebSocketClient = WebSocket;
} else {
  WebSocketClient = require('ws'); // eslint-disable-line global-require
}

var SUBSCRIBE_OPERATIONS = ['set_subscribe_callback', 'subscribe_to_market', 'broadcast_transaction_with_callback', 'set_pending_transaction_callback'];

var UNSUBSCRIBE_OPERATIONS = ['unsubscribe_from_market', 'unsubscribe_from_accounts'];

var HEALTH_CHECK_INTERVAL = 10000;

var ChainWebSocket = function () {
  /**
   *Creates an instance of ChainWebSocket.
   * @param {string}    serverAddress           The address of the websocket to connect to.
   * @param {function}  statusCb                Called when status events occur.
   * @param {number}    [connectTimeout=10000]  The time for a connection attempt to complete.
   * @memberof ChainWebSocket
   */
  function ChainWebSocket(serverAddress, statusCb) {
    var connectTimeout = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 10000;

    _classCallCheck(this, ChainWebSocket);

    this.statusCb = statusCb;
    this.serverAddress = serverAddress;
    this.timeoutInterval = connectTimeout;

    // The currenct connection state of the websocket.
    this.connected = false;
    this.reconnectTimeout = null;

    // Callback to execute when the websocket is reconnected.
    this.on_reconnect = null;

    // An incrementing ID for each request so that we can pair it with the
    // response from the websocket.
    this.cbId = 0;

    // Objects to store key/value pairs for callbacks, subscription callbacks
    // and unsubscribe callbacks.
    this.cbs = {};
    this.subs = {};
    this.unsub = {};

    // Current connection promises' rejection
    this.currentResolve = null;
    this.currentReject = null;

    // Health check for the connection to the BlockChain.
    this.healthCheck = null;

    // Copy the constants to this instance.
    this.status = ChainWebSocket.status;

    // Bind the functions to the instance.
    this.onConnectionOpen = this.onConnectionOpen.bind(this);
    this.onConnectionClose = this.onConnectionClose.bind(this);
    this.onConnectionTerminate = this.onConnectionTerminate.bind(this);
    this.onConnectionError = this.onConnectionError.bind(this);
    this.onConnectionTimeout = this.onConnectionTimeout.bind(this);
    this.createConnection = this.createConnection.bind(this);
    this.createConnectionPromise = this.createConnectionPromise.bind(this);
    this.listener = this.listener.bind(this);

    // Create the initial connection the blockchain.
    this.createConnection();
  }

  /**
   * Create the connection to the Blockchain.
   *
   * @returns
   * @memberof ChainWebSocket
   */


  ChainWebSocket.prototype.createConnection = function createConnection() {
    this.debug('!!! ChainWebSocket create connection');

    // Clear any possible reconnect timers.
    this.reconnectTimeout = null;

    // Create the promise for this connection
    if (!this.connect_promise) {
      this.connect_promise = new Promise(this.createConnectionPromise);
    }

    // Attempt to create the websocket
    try {
      this.ws = new WebSocketClient(this.serverAddress);
    } catch (error) {
      // Set a timeout to try and reconnect here.
      return this.resetConnection();
    }

    this.addEventListeners();

    // Handle timeouts to the websocket's initial connection.
    this.connectionTimeout = setTimeout(this.onConnectionTimeout, this.timeoutInterval);
  };

  /**
   * Reset the connection to the BlockChain.
   *
   * @memberof ChainWebSocket
   */


  ChainWebSocket.prototype.resetConnection = function resetConnection() {
    // Close the Websocket if its still 'half-open'
    this.close();

    // Make sure we only ever have one timeout running to reconnect.
    if (!this.reconnectTimeout) {
      this.debug('!!! ChainWebSocket reset connection', this.timeoutInterval);
      this.reconnectTimeout = setTimeout(this.createConnection, this.timeoutInterval);
    }

    // Reject the current promise if there is one.
    if (this.currentReject) {
      this.currentReject(new Error('Connection attempt failed: ' + this.serverAddress));
    }
  };

  /**
   * Add event listeners to the WebSocket.
   *
   * @memberof ChainWebSocket
   */


  ChainWebSocket.prototype.addEventListeners = function addEventListeners() {
    this.debug('!!! ChainWebSocket add event listeners');
    this.ws.addEventListener('open', this.onConnectionOpen);
    this.ws.addEventListener('close', this.onConnectionClose);
    this.ws.addEventListener('error', this.onConnectionError);
    this.ws.addEventListener('message', this.listener);
  };

  /**
   * Remove the event listers from the WebSocket. Its important to remove the event listerers
   * for garbaage collection. Because we are creating a new WebSocket on each connection attempt
   * any listeners that are still attached could prevent the old sockets from
   * being garbage collected.
   *
   * @memberof ChainWebSocket
   */


  ChainWebSocket.prototype.removeEventListeners = function removeEventListeners() {
    this.debug('!!! ChainWebSocket remove event listeners');
    this.ws.removeEventListener('open', this.onConnectionOpen);
    this.ws.removeEventListener('close', this.onConnectionClose);
    this.ws.removeEventListener('error', this.onConnectionError);
    this.ws.removeEventListener('message', this.listener);
  };

  /**
   * A function that is passed to a new promise that stores the resolve and reject callbacks
   * in the state.
   *
   * @param {function} resolve A callback to be executed when the promise is resolved.
   * @param {function} reject A callback to be executed when the promise is rejected.
   * @memberof ChainWebSocket
   */


  ChainWebSocket.prototype.createConnectionPromise = function createConnectionPromise(resolve, reject) {
    this.debug('!!! ChainWebSocket createPromise');
    this.currentResolve = resolve;
    this.currentReject = reject;
  };

  /**
   * Called when a new Websocket connection is opened.
   *
   * @memberof ChainWebSocket
   */


  ChainWebSocket.prototype.onConnectionOpen = function onConnectionOpen() {
    this.debug('!!! ChainWebSocket Connected ');

    this.connected = true;

    clearTimeout(this.connectionTimeout);
    this.connectionTimeout = null;

    // This will trigger the login process as well as some additional setup in ApiInstances
    if (this.on_reconnect) {
      this.on_reconnect();
    }

    if (this.currentResolve) {
      this.currentResolve();
    }

    if (this.statusCb) {
      this.statusCb(ChainWebSocket.status.OPEN);
    }
  };

  /**
   * called when the connection attempt times out.
   *
   * @memberof ChainWebSocket
   */


  ChainWebSocket.prototype.onConnectionTimeout = function onConnectionTimeout() {
    this.debug('!!! ChainWebSocket timeout');
    this.onConnectionClose(new Error('Connection timed out.'));
  };

  /**
   * Called when the Websocket is not responding to the health checks.
   *
   * @memberof ChainWebSocket
   */


  ChainWebSocket.prototype.onConnectionTerminate = function onConnectionTerminate() {
    this.debug('!!! ChainWebSocket terminate');
    this.onConnectionClose(new Error('Connection was terminated.'));
  };

  /**
   * Called when the connection to the Blockchain is closed.
   *
   * @param {*} error
   * @memberof ChainWebSocket
   */


  ChainWebSocket.prototype.onConnectionClose = function onConnectionClose(error) {
    this.debug('!!! ChainWebSocket Close ', error);

    this.resetConnection();

    if (this.statusCb) {
      this.statusCb(ChainWebSocket.status.CLOSED);
    }
  };

  /**
   * Called when the Websocket encounters an error.
   *
   * @param {*} error
   * @memberof ChainWebSocket
   */


  ChainWebSocket.prototype.onConnectionError = function onConnectionError(error) {
    this.debug('!!! ChainWebSocket On Connection Error ', error);

    this.resetConnection();

    if (this.statusCb) {
      this.statusCb(ChainWebSocket.status.ERROR);
    }
  };

  /**
   * Entry point to make RPC calls on the BlockChain.
   *
   * @param {array} params An array of params to be passed to the rpc call. [method, ...params]
   * @returns A new promise for this specific call.
   * @memberof ChainWebSocket
   */


  ChainWebSocket.prototype.call = function call(params) {
    var _this = this;

    if (!this.connected) {
      this.debug('!!! ChainWebSocket Call not connected. ');
      return Promise.reject(new Error('Disconnected from the BlockChain.'));
    }

    this.debug('!!! ChainWebSocket Call connected. ', params);

    var request = {
      method: params[1],
      params: params,
      id: this.cbId + 1
    };

    this.cbId = request.id;

    if (SUBSCRIBE_OPERATIONS.includes(request.method)) {
      // Store callback in subs map
      this.subs[request.id] = {
        callback: request.params[2][0]
      };

      // Replace callback with the callback id
      request.params[2][0] = request.id;
    }

    if (UNSUBSCRIBE_OPERATIONS.includes(request.method)) {
      if (typeof request.params[2][0] !== 'function') {
        throw new Error('First parameter of unsub must be the original callback');
      }

      var unSubCb = request.params[2].splice(0, 1)[0];

      // Find the corresponding subscription
      for (var id in this.subs) {
        // eslint-disable-line
        if (this.subs[id].callback === unSubCb) {
          this.unsub[request.id] = id;
          break;
        }
      }
    }

    if (!this.healthCheck) {
      this.healthCheck = setTimeout(this.onConnectionTerminate.bind(this), HEALTH_CHECK_INTERVAL);
    }

    return new Promise(function (resolve, reject) {
      _this.cbs[request.id] = {
        time: new Date(),
        resolve: resolve,
        reject: reject
      };

      // Set all requests to be 'call' methods.
      request.method = 'call';

      try {
        _this.ws.send(JSON.stringify(request));
      } catch (error) {
        _this.debug('Caught a nasty error : ', error);
      }
    });
  };

  /**
   * Called when messages are received on the Websocket.
   *
   * @param {*} response The message received.
   * @memberof ChainWebSocket
   */


  ChainWebSocket.prototype.listener = function listener(response) {
    var responseJSON = null;

    try {
      responseJSON = JSON.parse(response.data);
    } catch (error) {
      responseJSON.error = 'Error parsing response: ' + error.stack;
      this.debug('Error parsing response: ', response);
    }

    // Clear the health check timeout, we've just received a healthy response from the server.
    if (this.healthCheck) {
      clearTimeout(this.healthCheck);
      this.healthCheck = null;
    }

    var sub = false;
    var callback = null;

    if (responseJSON.method === 'notice') {
      sub = true;
      responseJSON.id = responseJSON.params[0];
    }

    if (!sub) {
      callback = this.cbs[responseJSON.id];
    } else {
      callback = this.subs[responseJSON.id].callback;
    }

    if (callback && !sub) {
      if (responseJSON.error) {
        this.debug('----> responseJSON : ', responseJSON);
        callback.reject(responseJSON.error);
      } else {
        callback.resolve(responseJSON.result);
      }

      delete this.cbs[responseJSON.id];

      if (this.unsub[responseJSON.id]) {
        delete this.subs[this.unsub[responseJSON.id]];
        delete this.unsub[responseJSON.id];
      }
    } else if (callback && sub) {
      callback(responseJSON.params[1]);
    } else {
      this.debug('Warning: unknown websocket responseJSON: ', responseJSON);
    }
  };

  /**
   * Login to the Blockchain.
   *
   * @param {string} user Username
   * @param {string} password Password
   * @returns A promise that is fulfilled after login.
   * @memberof ChainWebSocket
   */


  ChainWebSocket.prototype.login = function login(user, password) {
    var _this2 = this;

    this.debug('!!! ChainWebSocket login.', user, password);
    return this.connect_promise.then(function () {
      return _this2.call([1, 'login', [user, password]]);
    });
  };

  /**
   * Close the connection to the Blockchain.
   *
   * @memberof ChainWebSocket
   */


  ChainWebSocket.prototype.close = function close() {
    if (this.ws) {
      this.removeEventListeners();

      // Try and fire close on the connection.
      this.ws.close();

      // Clear our references so that it can be garbage collected.
      this.ws = null;
    }

    // Clear our timeouts for connection timeout and health check.
    clearTimeout(this.connectionTimeout);
    this.connectionTimeout = null;

    clearTimeout(this.healthCheck);
    this.healthCheck = null;

    clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = null;

    // Toggle the connected flag.
    this.connected = false;
  };

  ChainWebSocket.prototype.debug = function debug() {
    if (SOCKET_DEBUG) {
      for (var _len = arguments.length, params = Array(_len), _key = 0; _key < _len; _key++) {
        params[_key] = arguments[_key];
      }

      console.log.apply(null, params);
    }
  };

  return ChainWebSocket;
}();

// Constants for STATE


ChainWebSocket.status = {
  RECONNECTED: 'reconnected',
  OPEN: 'open',
  CLOSED: 'closed',
  ERROR: 'error'
};

exports.default = ChainWebSocket;
},{"ws":7}],5:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _ApiInstances = require('./ApiInstances');

var _ApiInstances2 = _interopRequireDefault(_ApiInstances);

var _ChainWebSocket = require('./ChainWebSocket');

var _ChainWebSocket2 = _interopRequireDefault(_ChainWebSocket);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Manager = function () {

  /**
   *Creates an instance of Manager. 
   * Constructor can take either one url, or an array of urls 
   * @param {*} {url, urls}
   * @memberof Manager
   */
  function Manager(_ref) {
    var url = _ref.url,
        urls = _ref.urls;

    _classCallCheck(this, Manager);

    if (this.url === undefined) {
      this.url = urls[0];
    } else {
      this.url = url;
    }

    this.urls = urls.filter(function (a) {
      return a !== url;
    });
  }

  Manager.prototype.logFailure = function logFailure(url) {
    console.error('Unable to connect to', url + ', skipping to next full node API server');
  };

  Manager.prototype.isURL = function isURL(str) {
    var endpointPattern = new RegExp('((^(?:ws(s)?:\\/\\/)|(?:http(s)?:\\/\\/))+((?:[^\\/\\/\\.])+\\??(?:[-\\+=&;%@.\\w_]*)((#?(?:[\\w])*)(:?[0-9]*))))');

    return endpointPattern.test(str);
  };

  Manager.prototype.connect = function connect() {
    var _connect = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;

    var url = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : this.url;

    return new Promise(function (resolve, reject) {
      _ApiInstances2.default.instance(url, _connect).init_promise.then(resolve).catch(function (error) {
        _ApiInstances2.default.instance().close();
        reject(error);
      });
    });
  };

  Manager.prototype.connectWithFallback = function connectWithFallback() {
    var connect = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;
    var url = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : this.url;
    var index = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

    var _this = this;

    var resolve = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;
    var reject = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : null;

    if (reject && index > this.urls.length - 1) {
      return reject(new Error('Tried ' + (index + 1) + ' connections, none of which worked: ' + JSON.stringify(this.urls.concat(this.url))));
    }

    var fallback = function fallback(resolve, reject) {
      _this.logFailure(url);
      return _this.connectWithFallback(connect, _this.urls[index], index + 1, resolve, reject);
    };

    if (resolve && reject) {
      return this.connect(connect, url).then(resolve).catch(function () {
        fallback(resolve, reject);
      });
    }

    return new Promise(function (resolve, reject) {
      _this.connect(connect).then(resolve).catch(function () {
        fallback(resolve, reject);
      });
    });
  };

  /**
   * pings node and returns a key value pair {url:latency}
   * 
   * @param {ChainWebSocket} conn: pass in an instance of ChainWebSocket
   * @memberof Manager
   */

  Manager.prototype.ping = function ping(conn, resolve, reject) {
    var connectionStartTimes = {};
    var url = conn.serverAddress;

    if (!this.isURL(url)) {
      throw Error('URL NOT VALID', url);
    }

    connectionStartTimes[url] = new Date().getTime();

    var doPing = function doPing(resolve, reject) {
      // Pass in blank rpc_user and rpc_password.
      conn.login('', '').then(function (result) {
        var _urlLatency;

        // Make sure connection is closed as it is simply a health check
        if (result) {
          conn.close();
        }

        var urlLatency = (_urlLatency = {}, _urlLatency[url] = new Date().getTime() - connectionStartTimes[url], _urlLatency);
        console.log('ping latency: ', urlLatency);
        resolve(urlLatency);
      }).catch(function (err) {
        console.error('PING ERROR: ', err);
        reject(err);
      });
    };

    if (resolve && reject) {
      doPing(resolve, reject);
    } else {
      return new Promise(doPing);
    }
  };

  /**
   * pings each url in the list, and returns a promise based list of key value pairs {url:latency}
   * 
   * @memberof Manager
   */


  Manager.prototype.checkConnections = function checkConnections(resolve, reject) {
    var _this2 = this;

    var checkFunction = function checkFunction(resolve, reject) {
      var fullList = _this2.urls;
      var connectionPromises = [];

      fullList.forEach(function (url) {
        var conn = new _ChainWebSocket2.default(url, function () {});

        connectionPromises.push(function () {
          return _this2.ping(conn).then(function (urlLatency) {
            return urlLatency;
          }).catch(function () {
            conn.close();
            return null;
          });
        });
      });

      Promise.all(connectionPromises.map(function (a) {
        return a();
      })).then(function (res) {
        resolve(res.filter(function (a) {
          return !!a;
        }).reduce(function (f, a) {
          var key = Object.keys(a)[0];
          f[key] = a[key];
          return f;
        }, {}));
      }).catch(function () {
        return _this2.checkConnections(resolve, reject);
      });
    };

    if (resolve && reject) {
      checkFunction(resolve, reject);
    } else {
      return new Promise(checkFunction);
    }
  };

  return Manager;
}();

exports.default = Manager;
},{"./ApiInstances":2,"./ChainWebSocket":4}],6:[function(require,module,exports){
'use strict';

exports.__esModule = true;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var GrapheneApi = function () {
  function GrapheneApi(ws_rpc, api_name) {
    _classCallCheck(this, GrapheneApi);

    this.ws_rpc = ws_rpc;
    this.api_name = api_name;
  }

  GrapheneApi.prototype.init = function init() {
    var _this = this;

    return this.ws_rpc.call([1, this.api_name, []]).then(function (response) {
      _this.api_id = response;
      return _this;
    });
  };

  GrapheneApi.prototype.exec = function exec(method, params) {
    return this.ws_rpc.call([this.api_id, method, params]).catch(function (error) {
      console.log('!!! GrapheneApi error: ', method, params, error, JSON.stringify(error));
      throw error;
    });
  };

  return GrapheneApi;
}();

exports.default = GrapheneApi;
},{}],7:[function(require,module,exports){

},{}]},{},[1])(1)
});

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJkaXN0L2luZGV4LmpzIiwiZGlzdC9zcmMvQXBpSW5zdGFuY2VzLmpzIiwiZGlzdC9zcmMvQ2hhaW5Db25maWcuanMiLCJkaXN0L3NyYy9DaGFpbldlYlNvY2tldC5qcyIsImRpc3Qvc3JjL0Nvbm5lY3Rpb25NYW5hZ2VyLmpzIiwiZGlzdC9zcmMvR3JhcGhlbmVBcGkuanMiLCJub2RlX21vZHVsZXMvYnJvd3Nlci1yZXNvbHZlL2VtcHR5LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsZUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9MQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCIndXNlIHN0cmljdCc7XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG5leHBvcnRzLkNoYWluV2ViU29ja2V0ID0gZXhwb3J0cy5NYW5hZ2VyID0gZXhwb3J0cy5DaGFpbkNvbmZpZyA9IGV4cG9ydHMuQXBpcyA9IHVuZGVmaW5lZDtcblxudmFyIF9BcGlJbnN0YW5jZXMgPSByZXF1aXJlKCcuL3NyYy9BcGlJbnN0YW5jZXMnKTtcblxudmFyIF9BcGlJbnN0YW5jZXMyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfQXBpSW5zdGFuY2VzKTtcblxudmFyIF9Db25uZWN0aW9uTWFuYWdlciA9IHJlcXVpcmUoJy4vc3JjL0Nvbm5lY3Rpb25NYW5hZ2VyJyk7XG5cbnZhciBfQ29ubmVjdGlvbk1hbmFnZXIyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfQ29ubmVjdGlvbk1hbmFnZXIpO1xuXG52YXIgX0NoYWluQ29uZmlnID0gcmVxdWlyZSgnLi9zcmMvQ2hhaW5Db25maWcnKTtcblxudmFyIF9DaGFpbkNvbmZpZzIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9DaGFpbkNvbmZpZyk7XG5cbnZhciBfQ2hhaW5XZWJTb2NrZXQgPSByZXF1aXJlKCcuL3NyYy9DaGFpbldlYlNvY2tldCcpO1xuXG52YXIgX0NoYWluV2ViU29ja2V0MiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX0NoYWluV2ViU29ja2V0KTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuZXhwb3J0cy5BcGlzID0gX0FwaUluc3RhbmNlczIuZGVmYXVsdDtcbmV4cG9ydHMuQ2hhaW5Db25maWcgPSBfQ2hhaW5Db25maWcyLmRlZmF1bHQ7XG5leHBvcnRzLk1hbmFnZXIgPSBfQ29ubmVjdGlvbk1hbmFnZXIyLmRlZmF1bHQ7XG5leHBvcnRzLkNoYWluV2ViU29ja2V0ID0gX0NoYWluV2ViU29ja2V0Mi5kZWZhdWx0OyIsIid1c2Ugc3RyaWN0JztcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcblxudmFyIF9DaGFpbldlYlNvY2tldCA9IHJlcXVpcmUoJy4vQ2hhaW5XZWJTb2NrZXQnKTtcblxudmFyIF9DaGFpbldlYlNvY2tldDIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9DaGFpbldlYlNvY2tldCk7XG5cbnZhciBfR3JhcGhlbmVBcGkgPSByZXF1aXJlKCcuL0dyYXBoZW5lQXBpJyk7XG5cbnZhciBfR3JhcGhlbmVBcGkyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfR3JhcGhlbmVBcGkpO1xuXG52YXIgX0NoYWluQ29uZmlnID0gcmVxdWlyZSgnLi9DaGFpbkNvbmZpZycpO1xuXG52YXIgX0NoYWluQ29uZmlnMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX0NoYWluQ29uZmlnKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuZnVuY3Rpb24gX2NsYXNzQ2FsbENoZWNrKGluc3RhbmNlLCBDb25zdHJ1Y3RvcikgeyBpZiAoIShpbnN0YW5jZSBpbnN0YW5jZW9mIENvbnN0cnVjdG9yKSkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IGNhbGwgYSBjbGFzcyBhcyBhIGZ1bmN0aW9uXCIpOyB9IH1cblxudmFyIGluc3QgPSB2b2lkIDA7XG5cbnZhciBBcGlzSW5zdGFuY2UgPSBmdW5jdGlvbiAoKSB7XG4gIGZ1bmN0aW9uIEFwaXNJbnN0YW5jZSgpIHtcbiAgICBfY2xhc3NDYWxsQ2hlY2sodGhpcywgQXBpc0luc3RhbmNlKTtcbiAgfVxuXG4gIC8qKiBAYXJnIHtzdHJpbmd9IGNvbm5lY3Rpb24gLi4gKi9cbiAgQXBpc0luc3RhbmNlLnByb3RvdHlwZS5jb25uZWN0ID0gZnVuY3Rpb24gY29ubmVjdChjcywgY29ubmVjdFRpbWVvdXQpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgdmFyIHJwY191c2VyID0gJyc7XG4gICAgdmFyIHJwY19wYXNzd29yZCA9ICcnO1xuXG4gICAgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmIHdpbmRvdy5sb2NhdGlvbiAmJiB3aW5kb3cubG9jYXRpb24ucHJvdG9jb2wgPT09ICdodHRwczonICYmIGNzLmluZGV4T2YoJ3dzczovLycpIDwgMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdTZWN1cmUgZG9tYWlucyByZXF1aXJlIHdzcyBjb25uZWN0aW9uJyk7XG4gICAgfVxuXG4gICAgdGhpcy53c19ycGMgPSBuZXcgX0NoYWluV2ViU29ja2V0Mi5kZWZhdWx0KGNzLCB0aGlzLnN0YXR1c0NiLCBjb25uZWN0VGltZW91dCk7XG5cbiAgICB0aGlzLmluaXRfcHJvbWlzZSA9IHRoaXMud3NfcnBjLmxvZ2luKHJwY191c2VyLCBycGNfcGFzc3dvcmQpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgY29uc29sZS5sb2coJ0Nvbm5lY3RlZCB0byBBUEkgbm9kZTonLCBjcyk7XG4gICAgICBfdGhpcy5fZGIgPSBuZXcgX0dyYXBoZW5lQXBpMi5kZWZhdWx0KF90aGlzLndzX3JwYywgJ2RhdGFiYXNlJyk7XG4gICAgICBfdGhpcy5fbmV0ID0gbmV3IF9HcmFwaGVuZUFwaTIuZGVmYXVsdChfdGhpcy53c19ycGMsICduZXR3b3JrX2Jyb2FkY2FzdCcpO1xuICAgICAgX3RoaXMuX2hpc3QgPSBuZXcgX0dyYXBoZW5lQXBpMi5kZWZhdWx0KF90aGlzLndzX3JwYywgJ2hpc3RvcnknKTtcbiAgICAgIF90aGlzLl9jcnlwdG8gPSBuZXcgX0dyYXBoZW5lQXBpMi5kZWZhdWx0KF90aGlzLndzX3JwYywgJ2NyeXB0bycpO1xuICAgICAgX3RoaXMuX2Jvb2tpZSA9IG5ldyBfR3JhcGhlbmVBcGkyLmRlZmF1bHQoX3RoaXMud3NfcnBjLCAnYm9va2llJyk7XG4gICAgICB2YXIgZGJfcHJvbWlzZSA9IF90aGlzLl9kYi5pbml0KCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBfdGhpcy5fZGIuZXhlYygnZ2V0X2NoYWluX2lkJywgW10pLnRoZW4oZnVuY3Rpb24gKF9jaGFpbl9pZCkge1xuICAgICAgICAgIF90aGlzLmNoYWluX2lkID0gX2NoYWluX2lkO1xuICAgICAgICAgIHJldHVybiBfQ2hhaW5Db25maWcyLmRlZmF1bHQuc2V0Q2hhaW5JZChfY2hhaW5faWQpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuXG4gICAgICBfdGhpcy53c19ycGMub25fcmVjb25uZWN0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBfdGhpcy53c19ycGMubG9naW4oJycsICcnKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBfdGhpcy5fZGIuaW5pdCgpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKF90aGlzLnN0YXR1c0NiKSB7XG4gICAgICAgICAgICAgIF90aGlzLnN0YXR1c0NiKF9DaGFpbldlYlNvY2tldDIuZGVmYXVsdC5zdGF0dXMuUkVDT05ORUNURUQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIF90aGlzLl9uZXQuaW5pdCgpO1xuICAgICAgICAgIF90aGlzLl9oaXN0LmluaXQoKTtcbiAgICAgICAgICBfdGhpcy5fY3J5cHRvLmluaXQoKTtcbiAgICAgICAgICBfdGhpcy5fYm9va2llLmluaXQoKTtcbiAgICAgICAgfSk7XG4gICAgICB9O1xuXG4gICAgICByZXR1cm4gUHJvbWlzZS5hbGwoW2RiX3Byb21pc2UsIF90aGlzLl9uZXQuaW5pdCgpLCBfdGhpcy5faGlzdC5pbml0KCksXG4gICAgICAvLyBUZW1wb3Jhcnkgc3F1YXNoIGNyeXB0byBBUEkgZXJyb3IgdW50aWwgdGhlIEFQSSBpcyB1cGdyYWRlZCBldmVyeXdoZXJlXG4gICAgICBfdGhpcy5fY3J5cHRvLmluaXQoKS5jYXRjaChmdW5jdGlvbiAoZSkge1xuICAgICAgICByZXR1cm4gY29uc29sZS5lcnJvcignQXBpSW5zdGFuY2VcXHRDcnlwdG8gQVBJIEVycm9yJywgZSk7XG4gICAgICB9KSwgX3RoaXMuX2Jvb2tpZS5pbml0KCldKTtcbiAgICB9KTtcbiAgfTtcblxuICBBcGlzSW5zdGFuY2UucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24gY2xvc2UoKSB7XG4gICAgaWYgKHRoaXMud3NfcnBjKSB7XG4gICAgICB0aGlzLndzX3JwYy5jbG9zZSgpO1xuICAgIH1cblxuICAgIHRoaXMud3NfcnBjID0gbnVsbDtcbiAgfTtcblxuICBBcGlzSW5zdGFuY2UucHJvdG90eXBlLmRiX2FwaSA9IGZ1bmN0aW9uIGRiX2FwaSgpIHtcbiAgICByZXR1cm4gdGhpcy5fZGI7XG4gIH07XG5cbiAgQXBpc0luc3RhbmNlLnByb3RvdHlwZS5uZXR3b3JrX2FwaSA9IGZ1bmN0aW9uIG5ldHdvcmtfYXBpKCkge1xuICAgIHJldHVybiB0aGlzLl9uZXQ7XG4gIH07XG5cbiAgQXBpc0luc3RhbmNlLnByb3RvdHlwZS5oaXN0b3J5X2FwaSA9IGZ1bmN0aW9uIGhpc3RvcnlfYXBpKCkge1xuICAgIHJldHVybiB0aGlzLl9oaXN0O1xuICB9O1xuXG4gIEFwaXNJbnN0YW5jZS5wcm90b3R5cGUuY3J5cHRvX2FwaSA9IGZ1bmN0aW9uIGNyeXB0b19hcGkoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2NyeXB0bztcbiAgfTtcblxuICBBcGlzSW5zdGFuY2UucHJvdG90eXBlLmJvb2tpZV9hcGkgPSBmdW5jdGlvbiBib29raWVfYXBpKCkge1xuICAgIHJldHVybiB0aGlzLl9ib29raWU7XG4gIH07XG5cbiAgQXBpc0luc3RhbmNlLnByb3RvdHlwZS5zZXRScGNDb25uZWN0aW9uU3RhdHVzQ2FsbGJhY2sgPSBmdW5jdGlvbiBzZXRScGNDb25uZWN0aW9uU3RhdHVzQ2FsbGJhY2soY2FsbGJhY2spIHtcbiAgICB0aGlzLnN0YXR1c0NiID0gY2FsbGJhY2s7XG4gIH07XG5cbiAgcmV0dXJuIEFwaXNJbnN0YW5jZTtcbn0oKTtcblxuLyoqXG4gICAgQ29uZmlndXJlOiBjb25maWd1cmUgYXMgZm9sbG93cyBgQXBpcy5pbnN0YW5jZShcIndzOi8vbG9jYWxob3N0OjgwOTBcIikuaW5pdF9wcm9taXNlYC4gIFRoaXNcbiAgICByZXR1cm5zIGEgcHJvbWlzZSwgb25jZSByZXNvbHZlZCB0aGUgY29ubmVjdGlvbiBpcyByZWFkeS5cblxuICAgIEltcG9ydDogaW1wb3J0IHsgQXBpcyB9IGZyb20gXCJAZ3JhcGhlbmUvY2hhaW5cIlxuXG4gICAgU2hvcnQtaGFuZDogQXBpcy5kYihcIm1ldGhvZFwiLCBcInBhcm0xXCIsIDIsIDMsIC4uLikuICBSZXR1cm5zIGEgcHJvbWlzZSB3aXRoIHJlc3VsdHMuXG5cbiAgICBBZGRpdGlvbmFsIHVzYWdlOiBBcGlzLmluc3RhbmNlKCkuZGJfYXBpKCkuZXhlYyhcIm1ldGhvZFwiLCBbXCJtZXRob2RcIiwgXCJwYXJtMVwiLCAyLCAzLCAuLi5dKS5cbiAgICBSZXR1cm5zIGEgcHJvbWlzZSB3aXRoIHJlc3VsdHMuXG4qL1xuXG5leHBvcnRzLmRlZmF1bHQgPSB7XG4gIHNldFJwY0Nvbm5lY3Rpb25TdGF0dXNDYWxsYmFjazogZnVuY3Rpb24gc2V0UnBjQ29ubmVjdGlvblN0YXR1c0NhbGxiYWNrKGNhbGxiYWNrKSB7XG4gICAgdGhpcy5zdGF0dXNDYiA9IGNhbGxiYWNrO1xuXG4gICAgaWYgKGluc3QpIHtcbiAgICAgIGluc3Quc2V0UnBjQ29ubmVjdGlvblN0YXR1c0NhbGxiYWNrKGNhbGxiYWNrKTtcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAgICAgIEBhcmcge3N0cmluZ30gY3MgaXMgb25seSBwcm92aWRlZCBpbiB0aGUgZmlyc3QgY2FsbFxuICAgICAgICBAcmV0dXJuIHtBcGlzfSBzaW5nbGV0b24gLi4gQ2hlY2sgQXBpcy5pbnN0YW5jZSgpLmluaXRfcHJvbWlzZSB0b1xuICAgICAgICBrbm93IHdoZW4gdGhlIGNvbm5lY3Rpb24gaXMgZXN0YWJsaXNoZWRcbiAgICAqL1xuICByZXNldDogZnVuY3Rpb24gcmVzZXQoKSB7XG4gICAgdmFyIGNzID0gYXJndW1lbnRzLmxlbmd0aCA+IDAgJiYgYXJndW1lbnRzWzBdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMF0gOiAnd3M6Ly9sb2NhbGhvc3Q6ODA5MCc7XG4gICAgdmFyIGNvbm5lY3QgPSBhcmd1bWVudHNbMV07XG4gICAgdmFyIGNvbm5lY3RUaW1lb3V0ID0gYXJndW1lbnRzLmxlbmd0aCA+IDIgJiYgYXJndW1lbnRzWzJdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMl0gOiA0MDAwO1xuXG4gICAgaWYgKGluc3QpIHtcbiAgICAgIGluc3QuY2xvc2UoKTtcbiAgICAgIGluc3QgPSBudWxsO1xuICAgIH1cblxuICAgIGluc3QgPSBuZXcgQXBpc0luc3RhbmNlKCk7XG4gICAgaW5zdC5zZXRScGNDb25uZWN0aW9uU3RhdHVzQ2FsbGJhY2sodGhpcy5zdGF0dXNDYik7XG5cbiAgICBpZiAoaW5zdCAmJiBjb25uZWN0KSB7XG4gICAgICBpbnN0LmNvbm5lY3QoY3MsIGNvbm5lY3RUaW1lb3V0KTtcbiAgICB9XG5cbiAgICByZXR1cm4gaW5zdDtcbiAgfSxcbiAgaW5zdGFuY2U6IGZ1bmN0aW9uIGluc3RhbmNlKCkge1xuICAgIHZhciBjcyA9IGFyZ3VtZW50cy5sZW5ndGggPiAwICYmIGFyZ3VtZW50c1swXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzBdIDogJ3dzOi8vbG9jYWxob3N0OjgwOTAnO1xuICAgIHZhciBjb25uZWN0ID0gYXJndW1lbnRzWzFdO1xuICAgIHZhciBjb25uZWN0VGltZW91dCA9IGFyZ3VtZW50cy5sZW5ndGggPiAyICYmIGFyZ3VtZW50c1syXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzJdIDogNDAwMDtcblxuICAgIGlmICghaW5zdCkge1xuICAgICAgaW5zdCA9IG5ldyBBcGlzSW5zdGFuY2UoKTtcbiAgICAgIGluc3Quc2V0UnBjQ29ubmVjdGlvblN0YXR1c0NhbGxiYWNrKHRoaXMuc3RhdHVzQ2IpO1xuICAgIH1cblxuICAgIGlmIChpbnN0ICYmIGNvbm5lY3QpIHtcbiAgICAgIGluc3QuY29ubmVjdChjcywgY29ubmVjdFRpbWVvdXQpO1xuICAgIH1cblxuICAgIHJldHVybiBpbnN0O1xuICB9LFxuICBjaGFpbklkOiBmdW5jdGlvbiBjaGFpbklkKCkge1xuICAgIHJldHVybiB0aGlzLmluc3RhbmNlKCkuY2hhaW5faWQ7XG4gIH0sXG4gIGNsb3NlOiBmdW5jdGlvbiBjbG9zZSgpIHtcbiAgICBpZiAoaW5zdCkge1xuICAgICAgaW5zdC5jbG9zZSgpO1xuICAgICAgaW5zdCA9IG51bGw7XG4gICAgfVxuICB9XG4gIC8vIGRiOiAobWV0aG9kLCAuLi5hcmdzKSA9PiBBcGlzLmluc3RhbmNlKCkuZGJfYXBpKCkuZXhlYyhtZXRob2QsIHRvU3RyaW5ncyhhcmdzKSksXG4gIC8vIG5ldHdvcms6IChtZXRob2QsIC4uLmFyZ3MpID0+IEFwaXMuaW5zdGFuY2UoKS5uZXR3b3JrX2FwaSgpLmV4ZWMobWV0aG9kLCB0b1N0cmluZ3MoYXJncykpLFxuICAvLyBoaXN0b3J5OiAobWV0aG9kLCAuLi5hcmdzKSA9PiBBcGlzLmluc3RhbmNlKCkuaGlzdG9yeV9hcGkoKS5leGVjKG1ldGhvZCwgdG9TdHJpbmdzKGFyZ3MpKSxcbiAgLy8gY3J5cHRvOiAobWV0aG9kLCAuLi5hcmdzKSA9PiBBcGlzLmluc3RhbmNlKCkuY3J5cHRvX2FwaSgpLmV4ZWMobWV0aG9kLCB0b1N0cmluZ3MoYXJncykpXG5cbn07IiwiJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnRzLl9fZXNNb2R1bGUgPSB0cnVlO1xuXG5mdW5jdGlvbiBfY2xhc3NDYWxsQ2hlY2soaW5zdGFuY2UsIENvbnN0cnVjdG9yKSB7IGlmICghKGluc3RhbmNlIGluc3RhbmNlb2YgQ29uc3RydWN0b3IpKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgY2FsbCBhIGNsYXNzIGFzIGEgZnVuY3Rpb25cIik7IH0gfVxuXG52YXIgZGVmYXVsdHMgPSB7XG4gIGNvcmVfYXNzZXQ6ICdQUFknLFxuICBhZGRyZXNzX3ByZWZpeDogJ1BQWScsXG4gIGV4cGlyZV9pbl9zZWNzOiAxNSxcbiAgZXhwaXJlX2luX3NlY3NfcHJvcG9zYWw6IDI0ICogNjAgKiA2MCxcbiAgcmV2aWV3X2luX3NlY3NfY29tbWl0dGVlOiAyNCAqIDYwICogNjBcbn07XG5cbnZhciBuZXR3b3JrcyA9IHtcbiAgbmV0d29ya3M6IHtcbiAgICBQZWVycGxheXM6IHtcbiAgICAgIGNvcmVfYXNzZXQ6ICdQUFknLFxuICAgICAgYWRkcmVzc19wcmVmaXg6ICdQUFknLFxuICAgICAgY2hhaW5faWQ6ICc2YjZiNWYwY2U3YTM2ZDMyMzc2OGU1MzRmM2VkYjQxYzZkNjMzMmE1NDFhOTU3MjViOThlMjhkMTQwODUwMTM0J1xuICAgIH0sXG4gICAgUGVlcnBsYXlzVGVzdG5ldDoge1xuICAgICAgY29yZV9hc3NldDogJ1BQWVRFU1QnLFxuICAgICAgYWRkcmVzc19wcmVmaXg6ICdQUFlURVNUJyxcbiAgICAgIGNoYWluX2lkOiAnYmU2Yjc5Mjk1ZTcyODQwNmNiYjc0OTRiY2I2MjZlNjJhZDI3OGZhNDAxODY5OWNmOGY3NTczOWY0YzFhODFmZCdcbiAgICB9XG4gIH1cbn07XG5cbnZhciBDaGFpbkNvbmZpZyA9IGZ1bmN0aW9uICgpIHtcbiAgZnVuY3Rpb24gQ2hhaW5Db25maWcoKSB7XG4gICAgX2NsYXNzQ2FsbENoZWNrKHRoaXMsIENoYWluQ29uZmlnKTtcblxuICAgIHRoaXMucmVzZXQoKTtcbiAgfVxuXG4gIENoYWluQ29uZmlnLnByb3RvdHlwZS5yZXNldCA9IGZ1bmN0aW9uIHJlc2V0KCkge1xuICAgIE9iamVjdC5hc3NpZ24odGhpcywgZGVmYXVsdHMpO1xuICB9O1xuXG4gIENoYWluQ29uZmlnLnByb3RvdHlwZS5zZXRDaGFpbklkID0gZnVuY3Rpb24gc2V0Q2hhaW5JZChjaGFpbklEKSB7XG4gICAgdmFyIHJlZiA9IE9iamVjdC5rZXlzKG5ldHdvcmtzKTtcblxuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSByZWYubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIHZhciBuZXR3b3JrX25hbWUgPSByZWZbaV07XG4gICAgICB2YXIgbmV0d29yayA9IG5ldHdvcmtzW25ldHdvcmtfbmFtZV07XG5cbiAgICAgIGlmIChuZXR3b3JrLmNoYWluX2lkID09PSBjaGFpbklEKSB7XG4gICAgICAgIHRoaXMubmV0d29ya19uYW1lID0gbmV0d29ya19uYW1lO1xuXG4gICAgICAgIGlmIChuZXR3b3JrLmFkZHJlc3NfcHJlZml4KSB7XG4gICAgICAgICAgdGhpcy5hZGRyZXNzX3ByZWZpeCA9IG5ldHdvcmsuYWRkcmVzc19wcmVmaXg7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIG5ldHdvcmtfbmFtZTogbmV0d29ya19uYW1lLFxuICAgICAgICAgIG5ldHdvcms6IG5ldHdvcmtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIXRoaXMubmV0d29ya19uYW1lKSB7XG4gICAgICBjb25zb2xlLmxvZygnVW5rbm93biBjaGFpbiBpZCAodGhpcyBtYXkgYmUgYSB0ZXN0bmV0KScsIGNoYWluSUQpO1xuICAgIH1cbiAgfTtcblxuICBDaGFpbkNvbmZpZy5wcm90b3R5cGUuc2V0UHJlZml4ID0gZnVuY3Rpb24gc2V0UHJlZml4KCkge1xuICAgIHZhciBwcmVmaXggPSBhcmd1bWVudHMubGVuZ3RoID4gMCAmJiBhcmd1bWVudHNbMF0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1swXSA6ICdQUFknO1xuXG4gICAgdGhpcy5hZGRyZXNzX3ByZWZpeCA9IHByZWZpeDtcbiAgfTtcblxuICByZXR1cm4gQ2hhaW5Db25maWc7XG59KCk7XG5cbmV4cG9ydHMuZGVmYXVsdCA9IG5ldyBDaGFpbkNvbmZpZygpOyIsIid1c2Ugc3RyaWN0JztcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcblxuZnVuY3Rpb24gX2NsYXNzQ2FsbENoZWNrKGluc3RhbmNlLCBDb25zdHJ1Y3RvcikgeyBpZiAoIShpbnN0YW5jZSBpbnN0YW5jZW9mIENvbnN0cnVjdG9yKSkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IGNhbGwgYSBjbGFzcyBhcyBhIGZ1bmN0aW9uXCIpOyB9IH1cblxudmFyIFNPQ0tFVF9ERUJVRyA9IGZhbHNlO1xudmFyIFdlYlNvY2tldENsaWVudCA9IG51bGw7XG5cbmlmICh0eXBlb2YgV2ViU29ja2V0ICE9PSAndW5kZWZpbmVkJykge1xuICBXZWJTb2NrZXRDbGllbnQgPSBXZWJTb2NrZXQ7XG59IGVsc2Uge1xuICBXZWJTb2NrZXRDbGllbnQgPSByZXF1aXJlKCd3cycpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIGdsb2JhbC1yZXF1aXJlXG59XG5cbnZhciBTVUJTQ1JJQkVfT1BFUkFUSU9OUyA9IFsnc2V0X3N1YnNjcmliZV9jYWxsYmFjaycsICdzdWJzY3JpYmVfdG9fbWFya2V0JywgJ2Jyb2FkY2FzdF90cmFuc2FjdGlvbl93aXRoX2NhbGxiYWNrJywgJ3NldF9wZW5kaW5nX3RyYW5zYWN0aW9uX2NhbGxiYWNrJ107XG5cbnZhciBVTlNVQlNDUklCRV9PUEVSQVRJT05TID0gWyd1bnN1YnNjcmliZV9mcm9tX21hcmtldCcsICd1bnN1YnNjcmliZV9mcm9tX2FjY291bnRzJ107XG5cbnZhciBIRUFMVEhfQ0hFQ0tfSU5URVJWQUwgPSAxMDAwMDtcblxudmFyIENoYWluV2ViU29ja2V0ID0gZnVuY3Rpb24gKCkge1xuICAvKipcbiAgICpDcmVhdGVzIGFuIGluc3RhbmNlIG9mIENoYWluV2ViU29ja2V0LlxuICAgKiBAcGFyYW0ge3N0cmluZ30gICAgc2VydmVyQWRkcmVzcyAgICAgICAgICAgVGhlIGFkZHJlc3Mgb2YgdGhlIHdlYnNvY2tldCB0byBjb25uZWN0IHRvLlxuICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSAgc3RhdHVzQ2IgICAgICAgICAgICAgICAgQ2FsbGVkIHdoZW4gc3RhdHVzIGV2ZW50cyBvY2N1ci5cbiAgICogQHBhcmFtIHtudW1iZXJ9ICAgIFtjb25uZWN0VGltZW91dD0xMDAwMF0gIFRoZSB0aW1lIGZvciBhIGNvbm5lY3Rpb24gYXR0ZW1wdCB0byBjb21wbGV0ZS5cbiAgICogQG1lbWJlcm9mIENoYWluV2ViU29ja2V0XG4gICAqL1xuICBmdW5jdGlvbiBDaGFpbldlYlNvY2tldChzZXJ2ZXJBZGRyZXNzLCBzdGF0dXNDYikge1xuICAgIHZhciBjb25uZWN0VGltZW91dCA9IGFyZ3VtZW50cy5sZW5ndGggPiAyICYmIGFyZ3VtZW50c1syXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzJdIDogMTAwMDA7XG5cbiAgICBfY2xhc3NDYWxsQ2hlY2sodGhpcywgQ2hhaW5XZWJTb2NrZXQpO1xuXG4gICAgdGhpcy5zdGF0dXNDYiA9IHN0YXR1c0NiO1xuICAgIHRoaXMuc2VydmVyQWRkcmVzcyA9IHNlcnZlckFkZHJlc3M7XG4gICAgdGhpcy50aW1lb3V0SW50ZXJ2YWwgPSBjb25uZWN0VGltZW91dDtcblxuICAgIC8vIFRoZSBjdXJyZW5jdCBjb25uZWN0aW9uIHN0YXRlIG9mIHRoZSB3ZWJzb2NrZXQuXG4gICAgdGhpcy5jb25uZWN0ZWQgPSBmYWxzZTtcbiAgICB0aGlzLnJlY29ubmVjdFRpbWVvdXQgPSBudWxsO1xuXG4gICAgLy8gQ2FsbGJhY2sgdG8gZXhlY3V0ZSB3aGVuIHRoZSB3ZWJzb2NrZXQgaXMgcmVjb25uZWN0ZWQuXG4gICAgdGhpcy5vbl9yZWNvbm5lY3QgPSBudWxsO1xuXG4gICAgLy8gQW4gaW5jcmVtZW50aW5nIElEIGZvciBlYWNoIHJlcXVlc3Qgc28gdGhhdCB3ZSBjYW4gcGFpciBpdCB3aXRoIHRoZVxuICAgIC8vIHJlc3BvbnNlIGZyb20gdGhlIHdlYnNvY2tldC5cbiAgICB0aGlzLmNiSWQgPSAwO1xuXG4gICAgLy8gT2JqZWN0cyB0byBzdG9yZSBrZXkvdmFsdWUgcGFpcnMgZm9yIGNhbGxiYWNrcywgc3Vic2NyaXB0aW9uIGNhbGxiYWNrc1xuICAgIC8vIGFuZCB1bnN1YnNjcmliZSBjYWxsYmFja3MuXG4gICAgdGhpcy5jYnMgPSB7fTtcbiAgICB0aGlzLnN1YnMgPSB7fTtcbiAgICB0aGlzLnVuc3ViID0ge307XG5cbiAgICAvLyBDdXJyZW50IGNvbm5lY3Rpb24gcHJvbWlzZXMnIHJlamVjdGlvblxuICAgIHRoaXMuY3VycmVudFJlc29sdmUgPSBudWxsO1xuICAgIHRoaXMuY3VycmVudFJlamVjdCA9IG51bGw7XG5cbiAgICAvLyBIZWFsdGggY2hlY2sgZm9yIHRoZSBjb25uZWN0aW9uIHRvIHRoZSBCbG9ja0NoYWluLlxuICAgIHRoaXMuaGVhbHRoQ2hlY2sgPSBudWxsO1xuXG4gICAgLy8gQ29weSB0aGUgY29uc3RhbnRzIHRvIHRoaXMgaW5zdGFuY2UuXG4gICAgdGhpcy5zdGF0dXMgPSBDaGFpbldlYlNvY2tldC5zdGF0dXM7XG5cbiAgICAvLyBCaW5kIHRoZSBmdW5jdGlvbnMgdG8gdGhlIGluc3RhbmNlLlxuICAgIHRoaXMub25Db25uZWN0aW9uT3BlbiA9IHRoaXMub25Db25uZWN0aW9uT3Blbi5iaW5kKHRoaXMpO1xuICAgIHRoaXMub25Db25uZWN0aW9uQ2xvc2UgPSB0aGlzLm9uQ29ubmVjdGlvbkNsb3NlLmJpbmQodGhpcyk7XG4gICAgdGhpcy5vbkNvbm5lY3Rpb25UZXJtaW5hdGUgPSB0aGlzLm9uQ29ubmVjdGlvblRlcm1pbmF0ZS5iaW5kKHRoaXMpO1xuICAgIHRoaXMub25Db25uZWN0aW9uRXJyb3IgPSB0aGlzLm9uQ29ubmVjdGlvbkVycm9yLmJpbmQodGhpcyk7XG4gICAgdGhpcy5vbkNvbm5lY3Rpb25UaW1lb3V0ID0gdGhpcy5vbkNvbm5lY3Rpb25UaW1lb3V0LmJpbmQodGhpcyk7XG4gICAgdGhpcy5jcmVhdGVDb25uZWN0aW9uID0gdGhpcy5jcmVhdGVDb25uZWN0aW9uLmJpbmQodGhpcyk7XG4gICAgdGhpcy5jcmVhdGVDb25uZWN0aW9uUHJvbWlzZSA9IHRoaXMuY3JlYXRlQ29ubmVjdGlvblByb21pc2UuYmluZCh0aGlzKTtcbiAgICB0aGlzLmxpc3RlbmVyID0gdGhpcy5saXN0ZW5lci5iaW5kKHRoaXMpO1xuXG4gICAgLy8gQ3JlYXRlIHRoZSBpbml0aWFsIGNvbm5lY3Rpb24gdGhlIGJsb2NrY2hhaW4uXG4gICAgdGhpcy5jcmVhdGVDb25uZWN0aW9uKCk7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIHRoZSBjb25uZWN0aW9uIHRvIHRoZSBCbG9ja2NoYWluLlxuICAgKlxuICAgKiBAcmV0dXJuc1xuICAgKiBAbWVtYmVyb2YgQ2hhaW5XZWJTb2NrZXRcbiAgICovXG5cblxuICBDaGFpbldlYlNvY2tldC5wcm90b3R5cGUuY3JlYXRlQ29ubmVjdGlvbiA9IGZ1bmN0aW9uIGNyZWF0ZUNvbm5lY3Rpb24oKSB7XG4gICAgdGhpcy5kZWJ1ZygnISEhIENoYWluV2ViU29ja2V0IGNyZWF0ZSBjb25uZWN0aW9uJyk7XG5cbiAgICAvLyBDbGVhciBhbnkgcG9zc2libGUgcmVjb25uZWN0IHRpbWVycy5cbiAgICB0aGlzLnJlY29ubmVjdFRpbWVvdXQgPSBudWxsO1xuXG4gICAgLy8gQ3JlYXRlIHRoZSBwcm9taXNlIGZvciB0aGlzIGNvbm5lY3Rpb25cbiAgICBpZiAoIXRoaXMuY29ubmVjdF9wcm9taXNlKSB7XG4gICAgICB0aGlzLmNvbm5lY3RfcHJvbWlzZSA9IG5ldyBQcm9taXNlKHRoaXMuY3JlYXRlQ29ubmVjdGlvblByb21pc2UpO1xuICAgIH1cblxuICAgIC8vIEF0dGVtcHQgdG8gY3JlYXRlIHRoZSB3ZWJzb2NrZXRcbiAgICB0cnkge1xuICAgICAgdGhpcy53cyA9IG5ldyBXZWJTb2NrZXRDbGllbnQodGhpcy5zZXJ2ZXJBZGRyZXNzKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgLy8gU2V0IGEgdGltZW91dCB0byB0cnkgYW5kIHJlY29ubmVjdCBoZXJlLlxuICAgICAgcmV0dXJuIHRoaXMucmVzZXRDb25uZWN0aW9uKCk7XG4gICAgfVxuXG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVycygpO1xuXG4gICAgLy8gSGFuZGxlIHRpbWVvdXRzIHRvIHRoZSB3ZWJzb2NrZXQncyBpbml0aWFsIGNvbm5lY3Rpb24uXG4gICAgdGhpcy5jb25uZWN0aW9uVGltZW91dCA9IHNldFRpbWVvdXQodGhpcy5vbkNvbm5lY3Rpb25UaW1lb3V0LCB0aGlzLnRpbWVvdXRJbnRlcnZhbCk7XG4gIH07XG5cbiAgLyoqXG4gICAqIFJlc2V0IHRoZSBjb25uZWN0aW9uIHRvIHRoZSBCbG9ja0NoYWluLlxuICAgKlxuICAgKiBAbWVtYmVyb2YgQ2hhaW5XZWJTb2NrZXRcbiAgICovXG5cblxuICBDaGFpbldlYlNvY2tldC5wcm90b3R5cGUucmVzZXRDb25uZWN0aW9uID0gZnVuY3Rpb24gcmVzZXRDb25uZWN0aW9uKCkge1xuICAgIC8vIENsb3NlIHRoZSBXZWJzb2NrZXQgaWYgaXRzIHN0aWxsICdoYWxmLW9wZW4nXG4gICAgdGhpcy5jbG9zZSgpO1xuXG4gICAgLy8gTWFrZSBzdXJlIHdlIG9ubHkgZXZlciBoYXZlIG9uZSB0aW1lb3V0IHJ1bm5pbmcgdG8gcmVjb25uZWN0LlxuICAgIGlmICghdGhpcy5yZWNvbm5lY3RUaW1lb3V0KSB7XG4gICAgICB0aGlzLmRlYnVnKCchISEgQ2hhaW5XZWJTb2NrZXQgcmVzZXQgY29ubmVjdGlvbicsIHRoaXMudGltZW91dEludGVydmFsKTtcbiAgICAgIHRoaXMucmVjb25uZWN0VGltZW91dCA9IHNldFRpbWVvdXQodGhpcy5jcmVhdGVDb25uZWN0aW9uLCB0aGlzLnRpbWVvdXRJbnRlcnZhbCk7XG4gICAgfVxuXG4gICAgLy8gUmVqZWN0IHRoZSBjdXJyZW50IHByb21pc2UgaWYgdGhlcmUgaXMgb25lLlxuICAgIGlmICh0aGlzLmN1cnJlbnRSZWplY3QpIHtcbiAgICAgIHRoaXMuY3VycmVudFJlamVjdChuZXcgRXJyb3IoJ0Nvbm5lY3Rpb24gYXR0ZW1wdCBmYWlsZWQ6ICcgKyB0aGlzLnNlcnZlckFkZHJlc3MpKTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIEFkZCBldmVudCBsaXN0ZW5lcnMgdG8gdGhlIFdlYlNvY2tldC5cbiAgICpcbiAgICogQG1lbWJlcm9mIENoYWluV2ViU29ja2V0XG4gICAqL1xuXG5cbiAgQ2hhaW5XZWJTb2NrZXQucHJvdG90eXBlLmFkZEV2ZW50TGlzdGVuZXJzID0gZnVuY3Rpb24gYWRkRXZlbnRMaXN0ZW5lcnMoKSB7XG4gICAgdGhpcy5kZWJ1ZygnISEhIENoYWluV2ViU29ja2V0IGFkZCBldmVudCBsaXN0ZW5lcnMnKTtcbiAgICB0aGlzLndzLmFkZEV2ZW50TGlzdGVuZXIoJ29wZW4nLCB0aGlzLm9uQ29ubmVjdGlvbk9wZW4pO1xuICAgIHRoaXMud3MuYWRkRXZlbnRMaXN0ZW5lcignY2xvc2UnLCB0aGlzLm9uQ29ubmVjdGlvbkNsb3NlKTtcbiAgICB0aGlzLndzLmFkZEV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgdGhpcy5vbkNvbm5lY3Rpb25FcnJvcik7XG4gICAgdGhpcy53cy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgdGhpcy5saXN0ZW5lcik7XG4gIH07XG5cbiAgLyoqXG4gICAqIFJlbW92ZSB0aGUgZXZlbnQgbGlzdGVycyBmcm9tIHRoZSBXZWJTb2NrZXQuIEl0cyBpbXBvcnRhbnQgdG8gcmVtb3ZlIHRoZSBldmVudCBsaXN0ZXJlcnNcbiAgICogZm9yIGdhcmJhYWdlIGNvbGxlY3Rpb24uIEJlY2F1c2Ugd2UgYXJlIGNyZWF0aW5nIGEgbmV3IFdlYlNvY2tldCBvbiBlYWNoIGNvbm5lY3Rpb24gYXR0ZW1wdFxuICAgKiBhbnkgbGlzdGVuZXJzIHRoYXQgYXJlIHN0aWxsIGF0dGFjaGVkIGNvdWxkIHByZXZlbnQgdGhlIG9sZCBzb2NrZXRzIGZyb21cbiAgICogYmVpbmcgZ2FyYmFnZSBjb2xsZWN0ZWQuXG4gICAqXG4gICAqIEBtZW1iZXJvZiBDaGFpbldlYlNvY2tldFxuICAgKi9cblxuXG4gIENoYWluV2ViU29ja2V0LnByb3RvdHlwZS5yZW1vdmVFdmVudExpc3RlbmVycyA9IGZ1bmN0aW9uIHJlbW92ZUV2ZW50TGlzdGVuZXJzKCkge1xuICAgIHRoaXMuZGVidWcoJyEhISBDaGFpbldlYlNvY2tldCByZW1vdmUgZXZlbnQgbGlzdGVuZXJzJyk7XG4gICAgdGhpcy53cy5yZW1vdmVFdmVudExpc3RlbmVyKCdvcGVuJywgdGhpcy5vbkNvbm5lY3Rpb25PcGVuKTtcbiAgICB0aGlzLndzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Nsb3NlJywgdGhpcy5vbkNvbm5lY3Rpb25DbG9zZSk7XG4gICAgdGhpcy53cy5yZW1vdmVFdmVudExpc3RlbmVyKCdlcnJvcicsIHRoaXMub25Db25uZWN0aW9uRXJyb3IpO1xuICAgIHRoaXMud3MucmVtb3ZlRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIHRoaXMubGlzdGVuZXIpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBBIGZ1bmN0aW9uIHRoYXQgaXMgcGFzc2VkIHRvIGEgbmV3IHByb21pc2UgdGhhdCBzdG9yZXMgdGhlIHJlc29sdmUgYW5kIHJlamVjdCBjYWxsYmFja3NcbiAgICogaW4gdGhlIHN0YXRlLlxuICAgKlxuICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSByZXNvbHZlIEEgY2FsbGJhY2sgdG8gYmUgZXhlY3V0ZWQgd2hlbiB0aGUgcHJvbWlzZSBpcyByZXNvbHZlZC5cbiAgICogQHBhcmFtIHtmdW5jdGlvbn0gcmVqZWN0IEEgY2FsbGJhY2sgdG8gYmUgZXhlY3V0ZWQgd2hlbiB0aGUgcHJvbWlzZSBpcyByZWplY3RlZC5cbiAgICogQG1lbWJlcm9mIENoYWluV2ViU29ja2V0XG4gICAqL1xuXG5cbiAgQ2hhaW5XZWJTb2NrZXQucHJvdG90eXBlLmNyZWF0ZUNvbm5lY3Rpb25Qcm9taXNlID0gZnVuY3Rpb24gY3JlYXRlQ29ubmVjdGlvblByb21pc2UocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgdGhpcy5kZWJ1ZygnISEhIENoYWluV2ViU29ja2V0IGNyZWF0ZVByb21pc2UnKTtcbiAgICB0aGlzLmN1cnJlbnRSZXNvbHZlID0gcmVzb2x2ZTtcbiAgICB0aGlzLmN1cnJlbnRSZWplY3QgPSByZWplY3Q7XG4gIH07XG5cbiAgLyoqXG4gICAqIENhbGxlZCB3aGVuIGEgbmV3IFdlYnNvY2tldCBjb25uZWN0aW9uIGlzIG9wZW5lZC5cbiAgICpcbiAgICogQG1lbWJlcm9mIENoYWluV2ViU29ja2V0XG4gICAqL1xuXG5cbiAgQ2hhaW5XZWJTb2NrZXQucHJvdG90eXBlLm9uQ29ubmVjdGlvbk9wZW4gPSBmdW5jdGlvbiBvbkNvbm5lY3Rpb25PcGVuKCkge1xuICAgIHRoaXMuZGVidWcoJyEhISBDaGFpbldlYlNvY2tldCBDb25uZWN0ZWQgJyk7XG5cbiAgICB0aGlzLmNvbm5lY3RlZCA9IHRydWU7XG5cbiAgICBjbGVhclRpbWVvdXQodGhpcy5jb25uZWN0aW9uVGltZW91dCk7XG4gICAgdGhpcy5jb25uZWN0aW9uVGltZW91dCA9IG51bGw7XG5cbiAgICAvLyBUaGlzIHdpbGwgdHJpZ2dlciB0aGUgbG9naW4gcHJvY2VzcyBhcyB3ZWxsIGFzIHNvbWUgYWRkaXRpb25hbCBzZXR1cCBpbiBBcGlJbnN0YW5jZXNcbiAgICBpZiAodGhpcy5vbl9yZWNvbm5lY3QpIHtcbiAgICAgIHRoaXMub25fcmVjb25uZWN0KCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuY3VycmVudFJlc29sdmUpIHtcbiAgICAgIHRoaXMuY3VycmVudFJlc29sdmUoKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5zdGF0dXNDYikge1xuICAgICAgdGhpcy5zdGF0dXNDYihDaGFpbldlYlNvY2tldC5zdGF0dXMuT1BFTik7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBjYWxsZWQgd2hlbiB0aGUgY29ubmVjdGlvbiBhdHRlbXB0IHRpbWVzIG91dC5cbiAgICpcbiAgICogQG1lbWJlcm9mIENoYWluV2ViU29ja2V0XG4gICAqL1xuXG5cbiAgQ2hhaW5XZWJTb2NrZXQucHJvdG90eXBlLm9uQ29ubmVjdGlvblRpbWVvdXQgPSBmdW5jdGlvbiBvbkNvbm5lY3Rpb25UaW1lb3V0KCkge1xuICAgIHRoaXMuZGVidWcoJyEhISBDaGFpbldlYlNvY2tldCB0aW1lb3V0Jyk7XG4gICAgdGhpcy5vbkNvbm5lY3Rpb25DbG9zZShuZXcgRXJyb3IoJ0Nvbm5lY3Rpb24gdGltZWQgb3V0LicpKTtcbiAgfTtcblxuICAvKipcbiAgICogQ2FsbGVkIHdoZW4gdGhlIFdlYnNvY2tldCBpcyBub3QgcmVzcG9uZGluZyB0byB0aGUgaGVhbHRoIGNoZWNrcy5cbiAgICpcbiAgICogQG1lbWJlcm9mIENoYWluV2ViU29ja2V0XG4gICAqL1xuXG5cbiAgQ2hhaW5XZWJTb2NrZXQucHJvdG90eXBlLm9uQ29ubmVjdGlvblRlcm1pbmF0ZSA9IGZ1bmN0aW9uIG9uQ29ubmVjdGlvblRlcm1pbmF0ZSgpIHtcbiAgICB0aGlzLmRlYnVnKCchISEgQ2hhaW5XZWJTb2NrZXQgdGVybWluYXRlJyk7XG4gICAgdGhpcy5vbkNvbm5lY3Rpb25DbG9zZShuZXcgRXJyb3IoJ0Nvbm5lY3Rpb24gd2FzIHRlcm1pbmF0ZWQuJykpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDYWxsZWQgd2hlbiB0aGUgY29ubmVjdGlvbiB0byB0aGUgQmxvY2tjaGFpbiBpcyBjbG9zZWQuXG4gICAqXG4gICAqIEBwYXJhbSB7Kn0gZXJyb3JcbiAgICogQG1lbWJlcm9mIENoYWluV2ViU29ja2V0XG4gICAqL1xuXG5cbiAgQ2hhaW5XZWJTb2NrZXQucHJvdG90eXBlLm9uQ29ubmVjdGlvbkNsb3NlID0gZnVuY3Rpb24gb25Db25uZWN0aW9uQ2xvc2UoZXJyb3IpIHtcbiAgICB0aGlzLmRlYnVnKCchISEgQ2hhaW5XZWJTb2NrZXQgQ2xvc2UgJywgZXJyb3IpO1xuXG4gICAgdGhpcy5yZXNldENvbm5lY3Rpb24oKTtcblxuICAgIGlmICh0aGlzLnN0YXR1c0NiKSB7XG4gICAgICB0aGlzLnN0YXR1c0NiKENoYWluV2ViU29ja2V0LnN0YXR1cy5DTE9TRUQpO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogQ2FsbGVkIHdoZW4gdGhlIFdlYnNvY2tldCBlbmNvdW50ZXJzIGFuIGVycm9yLlxuICAgKlxuICAgKiBAcGFyYW0geyp9IGVycm9yXG4gICAqIEBtZW1iZXJvZiBDaGFpbldlYlNvY2tldFxuICAgKi9cblxuXG4gIENoYWluV2ViU29ja2V0LnByb3RvdHlwZS5vbkNvbm5lY3Rpb25FcnJvciA9IGZ1bmN0aW9uIG9uQ29ubmVjdGlvbkVycm9yKGVycm9yKSB7XG4gICAgdGhpcy5kZWJ1ZygnISEhIENoYWluV2ViU29ja2V0IE9uIENvbm5lY3Rpb24gRXJyb3IgJywgZXJyb3IpO1xuXG4gICAgdGhpcy5yZXNldENvbm5lY3Rpb24oKTtcblxuICAgIGlmICh0aGlzLnN0YXR1c0NiKSB7XG4gICAgICB0aGlzLnN0YXR1c0NiKENoYWluV2ViU29ja2V0LnN0YXR1cy5FUlJPUik7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBFbnRyeSBwb2ludCB0byBtYWtlIFJQQyBjYWxscyBvbiB0aGUgQmxvY2tDaGFpbi5cbiAgICpcbiAgICogQHBhcmFtIHthcnJheX0gcGFyYW1zIEFuIGFycmF5IG9mIHBhcmFtcyB0byBiZSBwYXNzZWQgdG8gdGhlIHJwYyBjYWxsLiBbbWV0aG9kLCAuLi5wYXJhbXNdXG4gICAqIEByZXR1cm5zIEEgbmV3IHByb21pc2UgZm9yIHRoaXMgc3BlY2lmaWMgY2FsbC5cbiAgICogQG1lbWJlcm9mIENoYWluV2ViU29ja2V0XG4gICAqL1xuXG5cbiAgQ2hhaW5XZWJTb2NrZXQucHJvdG90eXBlLmNhbGwgPSBmdW5jdGlvbiBjYWxsKHBhcmFtcykge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICBpZiAoIXRoaXMuY29ubmVjdGVkKSB7XG4gICAgICB0aGlzLmRlYnVnKCchISEgQ2hhaW5XZWJTb2NrZXQgQ2FsbCBub3QgY29ubmVjdGVkLiAnKTtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoJ0Rpc2Nvbm5lY3RlZCBmcm9tIHRoZSBCbG9ja0NoYWluLicpKTtcbiAgICB9XG5cbiAgICB0aGlzLmRlYnVnKCchISEgQ2hhaW5XZWJTb2NrZXQgQ2FsbCBjb25uZWN0ZWQuICcsIHBhcmFtcyk7XG5cbiAgICB2YXIgcmVxdWVzdCA9IHtcbiAgICAgIG1ldGhvZDogcGFyYW1zWzFdLFxuICAgICAgcGFyYW1zOiBwYXJhbXMsXG4gICAgICBpZDogdGhpcy5jYklkICsgMVxuICAgIH07XG5cbiAgICB0aGlzLmNiSWQgPSByZXF1ZXN0LmlkO1xuXG4gICAgaWYgKFNVQlNDUklCRV9PUEVSQVRJT05TLmluY2x1ZGVzKHJlcXVlc3QubWV0aG9kKSkge1xuICAgICAgLy8gU3RvcmUgY2FsbGJhY2sgaW4gc3VicyBtYXBcbiAgICAgIHRoaXMuc3Vic1tyZXF1ZXN0LmlkXSA9IHtcbiAgICAgICAgY2FsbGJhY2s6IHJlcXVlc3QucGFyYW1zWzJdWzBdXG4gICAgICB9O1xuXG4gICAgICAvLyBSZXBsYWNlIGNhbGxiYWNrIHdpdGggdGhlIGNhbGxiYWNrIGlkXG4gICAgICByZXF1ZXN0LnBhcmFtc1syXVswXSA9IHJlcXVlc3QuaWQ7XG4gICAgfVxuXG4gICAgaWYgKFVOU1VCU0NSSUJFX09QRVJBVElPTlMuaW5jbHVkZXMocmVxdWVzdC5tZXRob2QpKSB7XG4gICAgICBpZiAodHlwZW9mIHJlcXVlc3QucGFyYW1zWzJdWzBdICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignRmlyc3QgcGFyYW1ldGVyIG9mIHVuc3ViIG11c3QgYmUgdGhlIG9yaWdpbmFsIGNhbGxiYWNrJyk7XG4gICAgICB9XG5cbiAgICAgIHZhciB1blN1YkNiID0gcmVxdWVzdC5wYXJhbXNbMl0uc3BsaWNlKDAsIDEpWzBdO1xuXG4gICAgICAvLyBGaW5kIHRoZSBjb3JyZXNwb25kaW5nIHN1YnNjcmlwdGlvblxuICAgICAgZm9yICh2YXIgaWQgaW4gdGhpcy5zdWJzKSB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLWxpbmVcbiAgICAgICAgaWYgKHRoaXMuc3Vic1tpZF0uY2FsbGJhY2sgPT09IHVuU3ViQ2IpIHtcbiAgICAgICAgICB0aGlzLnVuc3ViW3JlcXVlc3QuaWRdID0gaWQ7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuaGVhbHRoQ2hlY2spIHtcbiAgICAgIHRoaXMuaGVhbHRoQ2hlY2sgPSBzZXRUaW1lb3V0KHRoaXMub25Db25uZWN0aW9uVGVybWluYXRlLmJpbmQodGhpcyksIEhFQUxUSF9DSEVDS19JTlRFUlZBTCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIF90aGlzLmNic1tyZXF1ZXN0LmlkXSA9IHtcbiAgICAgICAgdGltZTogbmV3IERhdGUoKSxcbiAgICAgICAgcmVzb2x2ZTogcmVzb2x2ZSxcbiAgICAgICAgcmVqZWN0OiByZWplY3RcbiAgICAgIH07XG5cbiAgICAgIC8vIFNldCBhbGwgcmVxdWVzdHMgdG8gYmUgJ2NhbGwnIG1ldGhvZHMuXG4gICAgICByZXF1ZXN0Lm1ldGhvZCA9ICdjYWxsJztcblxuICAgICAgdHJ5IHtcbiAgICAgICAgX3RoaXMud3Muc2VuZChKU09OLnN0cmluZ2lmeShyZXF1ZXN0KSk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBfdGhpcy5kZWJ1ZygnQ2F1Z2h0IGEgbmFzdHkgZXJyb3IgOiAnLCBlcnJvcik7XG4gICAgICB9XG4gICAgfSk7XG4gIH07XG5cbiAgLyoqXG4gICAqIENhbGxlZCB3aGVuIG1lc3NhZ2VzIGFyZSByZWNlaXZlZCBvbiB0aGUgV2Vic29ja2V0LlxuICAgKlxuICAgKiBAcGFyYW0geyp9IHJlc3BvbnNlIFRoZSBtZXNzYWdlIHJlY2VpdmVkLlxuICAgKiBAbWVtYmVyb2YgQ2hhaW5XZWJTb2NrZXRcbiAgICovXG5cblxuICBDaGFpbldlYlNvY2tldC5wcm90b3R5cGUubGlzdGVuZXIgPSBmdW5jdGlvbiBsaXN0ZW5lcihyZXNwb25zZSkge1xuICAgIHZhciByZXNwb25zZUpTT04gPSBudWxsO1xuXG4gICAgdHJ5IHtcbiAgICAgIHJlc3BvbnNlSlNPTiA9IEpTT04ucGFyc2UocmVzcG9uc2UuZGF0YSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHJlc3BvbnNlSlNPTi5lcnJvciA9ICdFcnJvciBwYXJzaW5nIHJlc3BvbnNlOiAnICsgZXJyb3Iuc3RhY2s7XG4gICAgICB0aGlzLmRlYnVnKCdFcnJvciBwYXJzaW5nIHJlc3BvbnNlOiAnLCByZXNwb25zZSk7XG4gICAgfVxuXG4gICAgLy8gQ2xlYXIgdGhlIGhlYWx0aCBjaGVjayB0aW1lb3V0LCB3ZSd2ZSBqdXN0IHJlY2VpdmVkIGEgaGVhbHRoeSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIuXG4gICAgaWYgKHRoaXMuaGVhbHRoQ2hlY2spIHtcbiAgICAgIGNsZWFyVGltZW91dCh0aGlzLmhlYWx0aENoZWNrKTtcbiAgICAgIHRoaXMuaGVhbHRoQ2hlY2sgPSBudWxsO1xuICAgIH1cblxuICAgIHZhciBzdWIgPSBmYWxzZTtcbiAgICB2YXIgY2FsbGJhY2sgPSBudWxsO1xuXG4gICAgaWYgKHJlc3BvbnNlSlNPTi5tZXRob2QgPT09ICdub3RpY2UnKSB7XG4gICAgICBzdWIgPSB0cnVlO1xuICAgICAgcmVzcG9uc2VKU09OLmlkID0gcmVzcG9uc2VKU09OLnBhcmFtc1swXTtcbiAgICB9XG5cbiAgICBpZiAoIXN1Yikge1xuICAgICAgY2FsbGJhY2sgPSB0aGlzLmNic1tyZXNwb25zZUpTT04uaWRdO1xuICAgIH0gZWxzZSB7XG4gICAgICBjYWxsYmFjayA9IHRoaXMuc3Vic1tyZXNwb25zZUpTT04uaWRdLmNhbGxiYWNrO1xuICAgIH1cblxuICAgIGlmIChjYWxsYmFjayAmJiAhc3ViKSB7XG4gICAgICBpZiAocmVzcG9uc2VKU09OLmVycm9yKSB7XG4gICAgICAgIHRoaXMuZGVidWcoJy0tLS0+IHJlc3BvbnNlSlNPTiA6ICcsIHJlc3BvbnNlSlNPTik7XG4gICAgICAgIGNhbGxiYWNrLnJlamVjdChyZXNwb25zZUpTT04uZXJyb3IpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2FsbGJhY2sucmVzb2x2ZShyZXNwb25zZUpTT04ucmVzdWx0KTtcbiAgICAgIH1cblxuICAgICAgZGVsZXRlIHRoaXMuY2JzW3Jlc3BvbnNlSlNPTi5pZF07XG5cbiAgICAgIGlmICh0aGlzLnVuc3ViW3Jlc3BvbnNlSlNPTi5pZF0pIHtcbiAgICAgICAgZGVsZXRlIHRoaXMuc3Vic1t0aGlzLnVuc3ViW3Jlc3BvbnNlSlNPTi5pZF1dO1xuICAgICAgICBkZWxldGUgdGhpcy51bnN1YltyZXNwb25zZUpTT04uaWRdO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoY2FsbGJhY2sgJiYgc3ViKSB7XG4gICAgICBjYWxsYmFjayhyZXNwb25zZUpTT04ucGFyYW1zWzFdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5kZWJ1ZygnV2FybmluZzogdW5rbm93biB3ZWJzb2NrZXQgcmVzcG9uc2VKU09OOiAnLCByZXNwb25zZUpTT04pO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogTG9naW4gdG8gdGhlIEJsb2NrY2hhaW4uXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB1c2VyIFVzZXJuYW1lXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBwYXNzd29yZCBQYXNzd29yZFxuICAgKiBAcmV0dXJucyBBIHByb21pc2UgdGhhdCBpcyBmdWxmaWxsZWQgYWZ0ZXIgbG9naW4uXG4gICAqIEBtZW1iZXJvZiBDaGFpbldlYlNvY2tldFxuICAgKi9cblxuXG4gIENoYWluV2ViU29ja2V0LnByb3RvdHlwZS5sb2dpbiA9IGZ1bmN0aW9uIGxvZ2luKHVzZXIsIHBhc3N3b3JkKSB7XG4gICAgdmFyIF90aGlzMiA9IHRoaXM7XG5cbiAgICB0aGlzLmRlYnVnKCchISEgQ2hhaW5XZWJTb2NrZXQgbG9naW4uJywgdXNlciwgcGFzc3dvcmQpO1xuICAgIHJldHVybiB0aGlzLmNvbm5lY3RfcHJvbWlzZS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBfdGhpczIuY2FsbChbMSwgJ2xvZ2luJywgW3VzZXIsIHBhc3N3b3JkXV0pO1xuICAgIH0pO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDbG9zZSB0aGUgY29ubmVjdGlvbiB0byB0aGUgQmxvY2tjaGFpbi5cbiAgICpcbiAgICogQG1lbWJlcm9mIENoYWluV2ViU29ja2V0XG4gICAqL1xuXG5cbiAgQ2hhaW5XZWJTb2NrZXQucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24gY2xvc2UoKSB7XG4gICAgaWYgKHRoaXMud3MpIHtcbiAgICAgIHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lcnMoKTtcblxuICAgICAgLy8gVHJ5IGFuZCBmaXJlIGNsb3NlIG9uIHRoZSBjb25uZWN0aW9uLlxuICAgICAgdGhpcy53cy5jbG9zZSgpO1xuXG4gICAgICAvLyBDbGVhciBvdXIgcmVmZXJlbmNlcyBzbyB0aGF0IGl0IGNhbiBiZSBnYXJiYWdlIGNvbGxlY3RlZC5cbiAgICAgIHRoaXMud3MgPSBudWxsO1xuICAgIH1cblxuICAgIC8vIENsZWFyIG91ciB0aW1lb3V0cyBmb3IgY29ubmVjdGlvbiB0aW1lb3V0IGFuZCBoZWFsdGggY2hlY2suXG4gICAgY2xlYXJUaW1lb3V0KHRoaXMuY29ubmVjdGlvblRpbWVvdXQpO1xuICAgIHRoaXMuY29ubmVjdGlvblRpbWVvdXQgPSBudWxsO1xuXG4gICAgY2xlYXJUaW1lb3V0KHRoaXMuaGVhbHRoQ2hlY2spO1xuICAgIHRoaXMuaGVhbHRoQ2hlY2sgPSBudWxsO1xuXG4gICAgY2xlYXJUaW1lb3V0KHRoaXMucmVjb25uZWN0VGltZW91dCk7XG4gICAgdGhpcy5yZWNvbm5lY3RUaW1lb3V0ID0gbnVsbDtcblxuICAgIC8vIFRvZ2dsZSB0aGUgY29ubmVjdGVkIGZsYWcuXG4gICAgdGhpcy5jb25uZWN0ZWQgPSBmYWxzZTtcbiAgfTtcblxuICBDaGFpbldlYlNvY2tldC5wcm90b3R5cGUuZGVidWcgPSBmdW5jdGlvbiBkZWJ1ZygpIHtcbiAgICBpZiAoU09DS0VUX0RFQlVHKSB7XG4gICAgICBmb3IgKHZhciBfbGVuID0gYXJndW1lbnRzLmxlbmd0aCwgcGFyYW1zID0gQXJyYXkoX2xlbiksIF9rZXkgPSAwOyBfa2V5IDwgX2xlbjsgX2tleSsrKSB7XG4gICAgICAgIHBhcmFtc1tfa2V5XSA9IGFyZ3VtZW50c1tfa2V5XTtcbiAgICAgIH1cblxuICAgICAgY29uc29sZS5sb2cuYXBwbHkobnVsbCwgcGFyYW1zKTtcbiAgICB9XG4gIH07XG5cbiAgcmV0dXJuIENoYWluV2ViU29ja2V0O1xufSgpO1xuXG4vLyBDb25zdGFudHMgZm9yIFNUQVRFXG5cblxuQ2hhaW5XZWJTb2NrZXQuc3RhdHVzID0ge1xuICBSRUNPTk5FQ1RFRDogJ3JlY29ubmVjdGVkJyxcbiAgT1BFTjogJ29wZW4nLFxuICBDTE9TRUQ6ICdjbG9zZWQnLFxuICBFUlJPUjogJ2Vycm9yJ1xufTtcblxuZXhwb3J0cy5kZWZhdWx0ID0gQ2hhaW5XZWJTb2NrZXQ7IiwiJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnRzLl9fZXNNb2R1bGUgPSB0cnVlO1xuXG52YXIgX0FwaUluc3RhbmNlcyA9IHJlcXVpcmUoJy4vQXBpSW5zdGFuY2VzJyk7XG5cbnZhciBfQXBpSW5zdGFuY2VzMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX0FwaUluc3RhbmNlcyk7XG5cbnZhciBfQ2hhaW5XZWJTb2NrZXQgPSByZXF1aXJlKCcuL0NoYWluV2ViU29ja2V0Jyk7XG5cbnZhciBfQ2hhaW5XZWJTb2NrZXQyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfQ2hhaW5XZWJTb2NrZXQpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG5mdW5jdGlvbiBfY2xhc3NDYWxsQ2hlY2soaW5zdGFuY2UsIENvbnN0cnVjdG9yKSB7IGlmICghKGluc3RhbmNlIGluc3RhbmNlb2YgQ29uc3RydWN0b3IpKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgY2FsbCBhIGNsYXNzIGFzIGEgZnVuY3Rpb25cIik7IH0gfVxuXG52YXIgTWFuYWdlciA9IGZ1bmN0aW9uICgpIHtcblxuICAvKipcbiAgICpDcmVhdGVzIGFuIGluc3RhbmNlIG9mIE1hbmFnZXIuIFxuICAgKiBDb25zdHJ1Y3RvciBjYW4gdGFrZSBlaXRoZXIgb25lIHVybCwgb3IgYW4gYXJyYXkgb2YgdXJscyBcbiAgICogQHBhcmFtIHsqfSB7dXJsLCB1cmxzfVxuICAgKiBAbWVtYmVyb2YgTWFuYWdlclxuICAgKi9cbiAgZnVuY3Rpb24gTWFuYWdlcihfcmVmKSB7XG4gICAgdmFyIHVybCA9IF9yZWYudXJsLFxuICAgICAgICB1cmxzID0gX3JlZi51cmxzO1xuXG4gICAgX2NsYXNzQ2FsbENoZWNrKHRoaXMsIE1hbmFnZXIpO1xuXG4gICAgaWYgKHRoaXMudXJsID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMudXJsID0gdXJsc1swXTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy51cmwgPSB1cmw7XG4gICAgfVxuXG4gICAgdGhpcy51cmxzID0gdXJscy5maWx0ZXIoZnVuY3Rpb24gKGEpIHtcbiAgICAgIHJldHVybiBhICE9PSB1cmw7XG4gICAgfSk7XG4gIH1cblxuICBNYW5hZ2VyLnByb3RvdHlwZS5sb2dGYWlsdXJlID0gZnVuY3Rpb24gbG9nRmFpbHVyZSh1cmwpIHtcbiAgICBjb25zb2xlLmVycm9yKCdVbmFibGUgdG8gY29ubmVjdCB0bycsIHVybCArICcsIHNraXBwaW5nIHRvIG5leHQgZnVsbCBub2RlIEFQSSBzZXJ2ZXInKTtcbiAgfTtcblxuICBNYW5hZ2VyLnByb3RvdHlwZS5pc1VSTCA9IGZ1bmN0aW9uIGlzVVJMKHN0cikge1xuICAgIHZhciBlbmRwb2ludFBhdHRlcm4gPSBuZXcgUmVnRXhwKCcoKF4oPzp3cyhzKT86XFxcXC9cXFxcLyl8KD86aHR0cChzKT86XFxcXC9cXFxcLykpKygoPzpbXlxcXFwvXFxcXC9cXFxcLl0pK1xcXFw/Pyg/OlstXFxcXCs9JjslQC5cXFxcd19dKikoKCM/KD86W1xcXFx3XSkqKSg6P1swLTldKikpKSknKTtcblxuICAgIHJldHVybiBlbmRwb2ludFBhdHRlcm4udGVzdChzdHIpO1xuICB9O1xuXG4gIE1hbmFnZXIucHJvdG90eXBlLmNvbm5lY3QgPSBmdW5jdGlvbiBjb25uZWN0KCkge1xuICAgIHZhciBfY29ubmVjdCA9IGFyZ3VtZW50cy5sZW5ndGggPiAwICYmIGFyZ3VtZW50c1swXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzBdIDogdHJ1ZTtcblxuICAgIHZhciB1cmwgPSBhcmd1bWVudHMubGVuZ3RoID4gMSAmJiBhcmd1bWVudHNbMV0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1sxXSA6IHRoaXMudXJsO1xuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIF9BcGlJbnN0YW5jZXMyLmRlZmF1bHQuaW5zdGFuY2UodXJsLCBfY29ubmVjdCkuaW5pdF9wcm9taXNlLnRoZW4ocmVzb2x2ZSkuY2F0Y2goZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgIF9BcGlJbnN0YW5jZXMyLmRlZmF1bHQuaW5zdGFuY2UoKS5jbG9zZSgpO1xuICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH07XG5cbiAgTWFuYWdlci5wcm90b3R5cGUuY29ubmVjdFdpdGhGYWxsYmFjayA9IGZ1bmN0aW9uIGNvbm5lY3RXaXRoRmFsbGJhY2soKSB7XG4gICAgdmFyIGNvbm5lY3QgPSBhcmd1bWVudHMubGVuZ3RoID4gMCAmJiBhcmd1bWVudHNbMF0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1swXSA6IHRydWU7XG4gICAgdmFyIHVybCA9IGFyZ3VtZW50cy5sZW5ndGggPiAxICYmIGFyZ3VtZW50c1sxXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzFdIDogdGhpcy51cmw7XG4gICAgdmFyIGluZGV4ID0gYXJndW1lbnRzLmxlbmd0aCA+IDIgJiYgYXJndW1lbnRzWzJdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMl0gOiAwO1xuXG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIHZhciByZXNvbHZlID0gYXJndW1lbnRzLmxlbmd0aCA+IDMgJiYgYXJndW1lbnRzWzNdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbM10gOiBudWxsO1xuICAgIHZhciByZWplY3QgPSBhcmd1bWVudHMubGVuZ3RoID4gNCAmJiBhcmd1bWVudHNbNF0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1s0XSA6IG51bGw7XG5cbiAgICBpZiAocmVqZWN0ICYmIGluZGV4ID4gdGhpcy51cmxzLmxlbmd0aCAtIDEpIHtcbiAgICAgIHJldHVybiByZWplY3QobmV3IEVycm9yKCdUcmllZCAnICsgKGluZGV4ICsgMSkgKyAnIGNvbm5lY3Rpb25zLCBub25lIG9mIHdoaWNoIHdvcmtlZDogJyArIEpTT04uc3RyaW5naWZ5KHRoaXMudXJscy5jb25jYXQodGhpcy51cmwpKSkpO1xuICAgIH1cblxuICAgIHZhciBmYWxsYmFjayA9IGZ1bmN0aW9uIGZhbGxiYWNrKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgX3RoaXMubG9nRmFpbHVyZSh1cmwpO1xuICAgICAgcmV0dXJuIF90aGlzLmNvbm5lY3RXaXRoRmFsbGJhY2soY29ubmVjdCwgX3RoaXMudXJsc1tpbmRleF0sIGluZGV4ICsgMSwgcmVzb2x2ZSwgcmVqZWN0KTtcbiAgICB9O1xuXG4gICAgaWYgKHJlc29sdmUgJiYgcmVqZWN0KSB7XG4gICAgICByZXR1cm4gdGhpcy5jb25uZWN0KGNvbm5lY3QsIHVybCkudGhlbihyZXNvbHZlKS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIGZhbGxiYWNrKHJlc29sdmUsIHJlamVjdCk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgX3RoaXMuY29ubmVjdChjb25uZWN0KS50aGVuKHJlc29sdmUpLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZmFsbGJhY2socmVzb2x2ZSwgcmVqZWN0KTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9O1xuXG4gIC8qKlxuICAgKiBwaW5ncyBub2RlIGFuZCByZXR1cm5zIGEga2V5IHZhbHVlIHBhaXIge3VybDpsYXRlbmN5fVxuICAgKiBcbiAgICogQHBhcmFtIHtDaGFpbldlYlNvY2tldH0gY29ubjogcGFzcyBpbiBhbiBpbnN0YW5jZSBvZiBDaGFpbldlYlNvY2tldFxuICAgKiBAbWVtYmVyb2YgTWFuYWdlclxuICAgKi9cblxuICBNYW5hZ2VyLnByb3RvdHlwZS5waW5nID0gZnVuY3Rpb24gcGluZyhjb25uLCByZXNvbHZlLCByZWplY3QpIHtcbiAgICB2YXIgY29ubmVjdGlvblN0YXJ0VGltZXMgPSB7fTtcbiAgICB2YXIgdXJsID0gY29ubi5zZXJ2ZXJBZGRyZXNzO1xuXG4gICAgaWYgKCF0aGlzLmlzVVJMKHVybCkpIHtcbiAgICAgIHRocm93IEVycm9yKCdVUkwgTk9UIFZBTElEJywgdXJsKTtcbiAgICB9XG5cbiAgICBjb25uZWN0aW9uU3RhcnRUaW1lc1t1cmxdID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5cbiAgICB2YXIgZG9QaW5nID0gZnVuY3Rpb24gZG9QaW5nKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgLy8gUGFzcyBpbiBibGFuayBycGNfdXNlciBhbmQgcnBjX3Bhc3N3b3JkLlxuICAgICAgY29ubi5sb2dpbignJywgJycpLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICB2YXIgX3VybExhdGVuY3k7XG5cbiAgICAgICAgLy8gTWFrZSBzdXJlIGNvbm5lY3Rpb24gaXMgY2xvc2VkIGFzIGl0IGlzIHNpbXBseSBhIGhlYWx0aCBjaGVja1xuICAgICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgICAgY29ubi5jbG9zZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHVybExhdGVuY3kgPSAoX3VybExhdGVuY3kgPSB7fSwgX3VybExhdGVuY3lbdXJsXSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpIC0gY29ubmVjdGlvblN0YXJ0VGltZXNbdXJsXSwgX3VybExhdGVuY3kpO1xuICAgICAgICBjb25zb2xlLmxvZygncGluZyBsYXRlbmN5OiAnLCB1cmxMYXRlbmN5KTtcbiAgICAgICAgcmVzb2x2ZSh1cmxMYXRlbmN5KTtcbiAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignUElORyBFUlJPUjogJywgZXJyKTtcbiAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgaWYgKHJlc29sdmUgJiYgcmVqZWN0KSB7XG4gICAgICBkb1BpbmcocmVzb2x2ZSwgcmVqZWN0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGRvUGluZyk7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBwaW5ncyBlYWNoIHVybCBpbiB0aGUgbGlzdCwgYW5kIHJldHVybnMgYSBwcm9taXNlIGJhc2VkIGxpc3Qgb2Yga2V5IHZhbHVlIHBhaXJzIHt1cmw6bGF0ZW5jeX1cbiAgICogXG4gICAqIEBtZW1iZXJvZiBNYW5hZ2VyXG4gICAqL1xuXG5cbiAgTWFuYWdlci5wcm90b3R5cGUuY2hlY2tDb25uZWN0aW9ucyA9IGZ1bmN0aW9uIGNoZWNrQ29ubmVjdGlvbnMocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgdmFyIF90aGlzMiA9IHRoaXM7XG5cbiAgICB2YXIgY2hlY2tGdW5jdGlvbiA9IGZ1bmN0aW9uIGNoZWNrRnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICB2YXIgZnVsbExpc3QgPSBfdGhpczIudXJscztcbiAgICAgIHZhciBjb25uZWN0aW9uUHJvbWlzZXMgPSBbXTtcblxuICAgICAgZnVsbExpc3QuZm9yRWFjaChmdW5jdGlvbiAodXJsKSB7XG4gICAgICAgIHZhciBjb25uID0gbmV3IF9DaGFpbldlYlNvY2tldDIuZGVmYXVsdCh1cmwsIGZ1bmN0aW9uICgpIHt9KTtcblxuICAgICAgICBjb25uZWN0aW9uUHJvbWlzZXMucHVzaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgcmV0dXJuIF90aGlzMi5waW5nKGNvbm4pLnRoZW4oZnVuY3Rpb24gKHVybExhdGVuY3kpIHtcbiAgICAgICAgICAgIHJldHVybiB1cmxMYXRlbmN5O1xuICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGNvbm4uY2xvc2UoKTtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuXG4gICAgICBQcm9taXNlLmFsbChjb25uZWN0aW9uUHJvbWlzZXMubWFwKGZ1bmN0aW9uIChhKSB7XG4gICAgICAgIHJldHVybiBhKCk7XG4gICAgICB9KSkudGhlbihmdW5jdGlvbiAocmVzKSB7XG4gICAgICAgIHJlc29sdmUocmVzLmZpbHRlcihmdW5jdGlvbiAoYSkge1xuICAgICAgICAgIHJldHVybiAhIWE7XG4gICAgICAgIH0pLnJlZHVjZShmdW5jdGlvbiAoZiwgYSkge1xuICAgICAgICAgIHZhciBrZXkgPSBPYmplY3Qua2V5cyhhKVswXTtcbiAgICAgICAgICBmW2tleV0gPSBhW2tleV07XG4gICAgICAgICAgcmV0dXJuIGY7XG4gICAgICAgIH0sIHt9KSk7XG4gICAgICB9KS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBfdGhpczIuY2hlY2tDb25uZWN0aW9ucyhyZXNvbHZlLCByZWplY3QpO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgIGlmIChyZXNvbHZlICYmIHJlamVjdCkge1xuICAgICAgY2hlY2tGdW5jdGlvbihyZXNvbHZlLCByZWplY3QpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoY2hlY2tGdW5jdGlvbik7XG4gICAgfVxuICB9O1xuXG4gIHJldHVybiBNYW5hZ2VyO1xufSgpO1xuXG5leHBvcnRzLmRlZmF1bHQgPSBNYW5hZ2VyOyIsIid1c2Ugc3RyaWN0JztcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcblxuZnVuY3Rpb24gX2NsYXNzQ2FsbENoZWNrKGluc3RhbmNlLCBDb25zdHJ1Y3RvcikgeyBpZiAoIShpbnN0YW5jZSBpbnN0YW5jZW9mIENvbnN0cnVjdG9yKSkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IGNhbGwgYSBjbGFzcyBhcyBhIGZ1bmN0aW9uXCIpOyB9IH1cblxudmFyIEdyYXBoZW5lQXBpID0gZnVuY3Rpb24gKCkge1xuICBmdW5jdGlvbiBHcmFwaGVuZUFwaSh3c19ycGMsIGFwaV9uYW1lKSB7XG4gICAgX2NsYXNzQ2FsbENoZWNrKHRoaXMsIEdyYXBoZW5lQXBpKTtcblxuICAgIHRoaXMud3NfcnBjID0gd3NfcnBjO1xuICAgIHRoaXMuYXBpX25hbWUgPSBhcGlfbmFtZTtcbiAgfVxuXG4gIEdyYXBoZW5lQXBpLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gaW5pdCgpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgcmV0dXJuIHRoaXMud3NfcnBjLmNhbGwoWzEsIHRoaXMuYXBpX25hbWUsIFtdXSkudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgIF90aGlzLmFwaV9pZCA9IHJlc3BvbnNlO1xuICAgICAgcmV0dXJuIF90aGlzO1xuICAgIH0pO1xuICB9O1xuXG4gIEdyYXBoZW5lQXBpLnByb3RvdHlwZS5leGVjID0gZnVuY3Rpb24gZXhlYyhtZXRob2QsIHBhcmFtcykge1xuICAgIHJldHVybiB0aGlzLndzX3JwYy5jYWxsKFt0aGlzLmFwaV9pZCwgbWV0aG9kLCBwYXJhbXNdKS5jYXRjaChmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUubG9nKCchISEgR3JhcGhlbmVBcGkgZXJyb3I6ICcsIG1ldGhvZCwgcGFyYW1zLCBlcnJvciwgSlNPTi5zdHJpbmdpZnkoZXJyb3IpKTtcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH0pO1xuICB9O1xuXG4gIHJldHVybiBHcmFwaGVuZUFwaTtcbn0oKTtcblxuZXhwb3J0cy5kZWZhdWx0ID0gR3JhcGhlbmVBcGk7IiwiIl19
