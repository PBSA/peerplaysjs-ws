(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.peerplays_ws = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.ChainWebSocket = exports.ConnectionManager = exports.ChainConfig = exports.Apis = undefined;

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
exports.ConnectionManager = _ConnectionManager2.default;
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

var ConnectionManager = function () {
  function ConnectionManager(_ref) {
    var url = _ref.url,
        urls = _ref.urls;

    _classCallCheck(this, ConnectionManager);

    this.url = url;
    this.urls = urls.filter(function (a) {
      return a !== url;
    });
  }

  ConnectionManager.prototype.logFailure = function logFailure(url) {
    console.error('Unable to connect to', url + ', skipping to next full node API server');
  };

  ConnectionManager.prototype.isURL = function isURL(str) {
    var endpointPattern = new RegExp('((^(?:ws(s)?:\\/\\/)|(?:http(s)?:\\/\\/))+((?:[^\\/\\/\\.])+\\??(?:[-\\+=&;%@.\\w_]*)((#?(?:[\\w])*)(:?[0-9]*))))');

    return endpointPattern.test(str);
  };

  ConnectionManager.prototype.connect = function connect() {
    var _connect = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;

    var url = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : this.url;

    return new Promise(function (resolve, reject) {
      _ApiInstances2.default.instance(url, _connect).init_promise.then(resolve).catch(function (error) {
        _ApiInstances2.default.instance().close();
        reject(error);
      });
    });
  };

  ConnectionManager.prototype.connectWithFallback = function connectWithFallback() {
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

  ConnectionManager.prototype.ping = function ping(conn, resolve, reject) {
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
        resolve(urlLatency);
      }).catch(function (err) {
        console.warn('PING ERROR: ', err);
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
  * sorts the nodes into a list based on latency
  * @memberof ConnectionManager
  */


  ConnectionManager.prototype.sortNodesByLatency = function sortNodesByLatency(resolve, reject) {
    var latencyList = this.checkConnections();

    // Sort list by latency
    var checkFunction = function checkFunction(resolve, reject) {
      latencyList.then(function (response) {
        var sortedList = Object.keys(response).sort(function (a, b) {
          return response[a] - response[b];
        });
        resolve(sortedList);
      }).catch(function (err) {
        reject(err);
      });
    };

    if (resolve && reject) {
      checkFunction(resolve, reject);
    } else {
      return new Promise(checkFunction);
    }
  };

  ConnectionManager.prototype.checkConnections = function checkConnections(resolve, reject) {
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

  return ConnectionManager;
}();

exports.default = ConnectionManager;
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

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJkaXN0L2luZGV4LmpzIiwiZGlzdC9zcmMvQXBpSW5zdGFuY2VzLmpzIiwiZGlzdC9zcmMvQ2hhaW5Db25maWcuanMiLCJkaXN0L3NyYy9DaGFpbldlYlNvY2tldC5qcyIsImRpc3Qvc3JjL0Nvbm5lY3Rpb25NYW5hZ2VyLmpzIiwiZGlzdC9zcmMvR3JhcGhlbmVBcGkuanMiLCJub2RlX21vZHVsZXMvYnJvd3Nlci1yZXNvbHZlL2VtcHR5LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsZUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaE1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIid1c2Ugc3RyaWN0JztcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcbmV4cG9ydHMuQ2hhaW5XZWJTb2NrZXQgPSBleHBvcnRzLkNvbm5lY3Rpb25NYW5hZ2VyID0gZXhwb3J0cy5DaGFpbkNvbmZpZyA9IGV4cG9ydHMuQXBpcyA9IHVuZGVmaW5lZDtcblxudmFyIF9BcGlJbnN0YW5jZXMgPSByZXF1aXJlKCcuL3NyYy9BcGlJbnN0YW5jZXMnKTtcblxudmFyIF9BcGlJbnN0YW5jZXMyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfQXBpSW5zdGFuY2VzKTtcblxudmFyIF9Db25uZWN0aW9uTWFuYWdlciA9IHJlcXVpcmUoJy4vc3JjL0Nvbm5lY3Rpb25NYW5hZ2VyJyk7XG5cbnZhciBfQ29ubmVjdGlvbk1hbmFnZXIyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfQ29ubmVjdGlvbk1hbmFnZXIpO1xuXG52YXIgX0NoYWluQ29uZmlnID0gcmVxdWlyZSgnLi9zcmMvQ2hhaW5Db25maWcnKTtcblxudmFyIF9DaGFpbkNvbmZpZzIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9DaGFpbkNvbmZpZyk7XG5cbnZhciBfQ2hhaW5XZWJTb2NrZXQgPSByZXF1aXJlKCcuL3NyYy9DaGFpbldlYlNvY2tldCcpO1xuXG52YXIgX0NoYWluV2ViU29ja2V0MiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX0NoYWluV2ViU29ja2V0KTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuZXhwb3J0cy5BcGlzID0gX0FwaUluc3RhbmNlczIuZGVmYXVsdDtcbmV4cG9ydHMuQ2hhaW5Db25maWcgPSBfQ2hhaW5Db25maWcyLmRlZmF1bHQ7XG5leHBvcnRzLkNvbm5lY3Rpb25NYW5hZ2VyID0gX0Nvbm5lY3Rpb25NYW5hZ2VyMi5kZWZhdWx0O1xuZXhwb3J0cy5DaGFpbldlYlNvY2tldCA9IF9DaGFpbldlYlNvY2tldDIuZGVmYXVsdDsiLCIndXNlIHN0cmljdCc7XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG5cbnZhciBfQ2hhaW5XZWJTb2NrZXQgPSByZXF1aXJlKCcuL0NoYWluV2ViU29ja2V0Jyk7XG5cbnZhciBfQ2hhaW5XZWJTb2NrZXQyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfQ2hhaW5XZWJTb2NrZXQpO1xuXG52YXIgX0dyYXBoZW5lQXBpID0gcmVxdWlyZSgnLi9HcmFwaGVuZUFwaScpO1xuXG52YXIgX0dyYXBoZW5lQXBpMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX0dyYXBoZW5lQXBpKTtcblxudmFyIF9DaGFpbkNvbmZpZyA9IHJlcXVpcmUoJy4vQ2hhaW5Db25maWcnKTtcblxudmFyIF9DaGFpbkNvbmZpZzIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9DaGFpbkNvbmZpZyk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbmZ1bmN0aW9uIF9jbGFzc0NhbGxDaGVjayhpbnN0YW5jZSwgQ29uc3RydWN0b3IpIHsgaWYgKCEoaW5zdGFuY2UgaW5zdGFuY2VvZiBDb25zdHJ1Y3RvcikpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCBjYWxsIGEgY2xhc3MgYXMgYSBmdW5jdGlvblwiKTsgfSB9XG5cbnZhciBpbnN0ID0gdm9pZCAwO1xuXG52YXIgQXBpc0luc3RhbmNlID0gZnVuY3Rpb24gKCkge1xuICBmdW5jdGlvbiBBcGlzSW5zdGFuY2UoKSB7XG4gICAgX2NsYXNzQ2FsbENoZWNrKHRoaXMsIEFwaXNJbnN0YW5jZSk7XG4gIH1cblxuICAvKiogQGFyZyB7c3RyaW5nfSBjb25uZWN0aW9uIC4uICovXG4gIEFwaXNJbnN0YW5jZS5wcm90b3R5cGUuY29ubmVjdCA9IGZ1bmN0aW9uIGNvbm5lY3QoY3MsIGNvbm5lY3RUaW1lb3V0KSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIHZhciBycGNfdXNlciA9ICcnO1xuICAgIHZhciBycGNfcGFzc3dvcmQgPSAnJztcblxuICAgIGlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJiB3aW5kb3cubG9jYXRpb24gJiYgd2luZG93LmxvY2F0aW9uLnByb3RvY29sID09PSAnaHR0cHM6JyAmJiBjcy5pbmRleE9mKCd3c3M6Ly8nKSA8IDApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignU2VjdXJlIGRvbWFpbnMgcmVxdWlyZSB3c3MgY29ubmVjdGlvbicpO1xuICAgIH1cblxuICAgIHRoaXMud3NfcnBjID0gbmV3IF9DaGFpbldlYlNvY2tldDIuZGVmYXVsdChjcywgdGhpcy5zdGF0dXNDYiwgY29ubmVjdFRpbWVvdXQpO1xuXG4gICAgdGhpcy5pbml0X3Byb21pc2UgPSB0aGlzLndzX3JwYy5sb2dpbihycGNfdXNlciwgcnBjX3Bhc3N3b3JkKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdDb25uZWN0ZWQgdG8gQVBJIG5vZGU6JywgY3MpO1xuICAgICAgX3RoaXMuX2RiID0gbmV3IF9HcmFwaGVuZUFwaTIuZGVmYXVsdChfdGhpcy53c19ycGMsICdkYXRhYmFzZScpO1xuICAgICAgX3RoaXMuX25ldCA9IG5ldyBfR3JhcGhlbmVBcGkyLmRlZmF1bHQoX3RoaXMud3NfcnBjLCAnbmV0d29ya19icm9hZGNhc3QnKTtcbiAgICAgIF90aGlzLl9oaXN0ID0gbmV3IF9HcmFwaGVuZUFwaTIuZGVmYXVsdChfdGhpcy53c19ycGMsICdoaXN0b3J5Jyk7XG4gICAgICBfdGhpcy5fY3J5cHRvID0gbmV3IF9HcmFwaGVuZUFwaTIuZGVmYXVsdChfdGhpcy53c19ycGMsICdjcnlwdG8nKTtcbiAgICAgIF90aGlzLl9ib29raWUgPSBuZXcgX0dyYXBoZW5lQXBpMi5kZWZhdWx0KF90aGlzLndzX3JwYywgJ2Jvb2tpZScpO1xuICAgICAgdmFyIGRiX3Byb21pc2UgPSBfdGhpcy5fZGIuaW5pdCgpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gX3RoaXMuX2RiLmV4ZWMoJ2dldF9jaGFpbl9pZCcsIFtdKS50aGVuKGZ1bmN0aW9uIChfY2hhaW5faWQpIHtcbiAgICAgICAgICBfdGhpcy5jaGFpbl9pZCA9IF9jaGFpbl9pZDtcbiAgICAgICAgICByZXR1cm4gX0NoYWluQ29uZmlnMi5kZWZhdWx0LnNldENoYWluSWQoX2NoYWluX2lkKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcblxuICAgICAgX3RoaXMud3NfcnBjLm9uX3JlY29ubmVjdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgX3RoaXMud3NfcnBjLmxvZ2luKCcnLCAnJykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgX3RoaXMuX2RiLmluaXQoKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmIChfdGhpcy5zdGF0dXNDYikge1xuICAgICAgICAgICAgICBfdGhpcy5zdGF0dXNDYihfQ2hhaW5XZWJTb2NrZXQyLmRlZmF1bHQuc3RhdHVzLlJFQ09OTkVDVEVEKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgICBfdGhpcy5fbmV0LmluaXQoKTtcbiAgICAgICAgICBfdGhpcy5faGlzdC5pbml0KCk7XG4gICAgICAgICAgX3RoaXMuX2NyeXB0by5pbml0KCk7XG4gICAgICAgICAgX3RoaXMuX2Jvb2tpZS5pbml0KCk7XG4gICAgICAgIH0pO1xuICAgICAgfTtcblxuICAgICAgcmV0dXJuIFByb21pc2UuYWxsKFtkYl9wcm9taXNlLCBfdGhpcy5fbmV0LmluaXQoKSwgX3RoaXMuX2hpc3QuaW5pdCgpLFxuICAgICAgLy8gVGVtcG9yYXJ5IHNxdWFzaCBjcnlwdG8gQVBJIGVycm9yIHVudGlsIHRoZSBBUEkgaXMgdXBncmFkZWQgZXZlcnl3aGVyZVxuICAgICAgX3RoaXMuX2NyeXB0by5pbml0KCkuY2F0Y2goZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgcmV0dXJuIGNvbnNvbGUuZXJyb3IoJ0FwaUluc3RhbmNlXFx0Q3J5cHRvIEFQSSBFcnJvcicsIGUpO1xuICAgICAgfSksIF90aGlzLl9ib29raWUuaW5pdCgpXSk7XG4gICAgfSk7XG4gIH07XG5cbiAgQXBpc0luc3RhbmNlLnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uIGNsb3NlKCkge1xuICAgIGlmICh0aGlzLndzX3JwYykge1xuICAgICAgdGhpcy53c19ycGMuY2xvc2UoKTtcbiAgICB9XG5cbiAgICB0aGlzLndzX3JwYyA9IG51bGw7XG4gIH07XG5cbiAgQXBpc0luc3RhbmNlLnByb3RvdHlwZS5kYl9hcGkgPSBmdW5jdGlvbiBkYl9hcGkoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2RiO1xuICB9O1xuXG4gIEFwaXNJbnN0YW5jZS5wcm90b3R5cGUubmV0d29ya19hcGkgPSBmdW5jdGlvbiBuZXR3b3JrX2FwaSgpIHtcbiAgICByZXR1cm4gdGhpcy5fbmV0O1xuICB9O1xuXG4gIEFwaXNJbnN0YW5jZS5wcm90b3R5cGUuaGlzdG9yeV9hcGkgPSBmdW5jdGlvbiBoaXN0b3J5X2FwaSgpIHtcbiAgICByZXR1cm4gdGhpcy5faGlzdDtcbiAgfTtcblxuICBBcGlzSW5zdGFuY2UucHJvdG90eXBlLmNyeXB0b19hcGkgPSBmdW5jdGlvbiBjcnlwdG9fYXBpKCkge1xuICAgIHJldHVybiB0aGlzLl9jcnlwdG87XG4gIH07XG5cbiAgQXBpc0luc3RhbmNlLnByb3RvdHlwZS5ib29raWVfYXBpID0gZnVuY3Rpb24gYm9va2llX2FwaSgpIHtcbiAgICByZXR1cm4gdGhpcy5fYm9va2llO1xuICB9O1xuXG4gIEFwaXNJbnN0YW5jZS5wcm90b3R5cGUuc2V0UnBjQ29ubmVjdGlvblN0YXR1c0NhbGxiYWNrID0gZnVuY3Rpb24gc2V0UnBjQ29ubmVjdGlvblN0YXR1c0NhbGxiYWNrKGNhbGxiYWNrKSB7XG4gICAgdGhpcy5zdGF0dXNDYiA9IGNhbGxiYWNrO1xuICB9O1xuXG4gIHJldHVybiBBcGlzSW5zdGFuY2U7XG59KCk7XG5cbi8qKlxuICAgIENvbmZpZ3VyZTogY29uZmlndXJlIGFzIGZvbGxvd3MgYEFwaXMuaW5zdGFuY2UoXCJ3czovL2xvY2FsaG9zdDo4MDkwXCIpLmluaXRfcHJvbWlzZWAuICBUaGlzXG4gICAgcmV0dXJucyBhIHByb21pc2UsIG9uY2UgcmVzb2x2ZWQgdGhlIGNvbm5lY3Rpb24gaXMgcmVhZHkuXG5cbiAgICBJbXBvcnQ6IGltcG9ydCB7IEFwaXMgfSBmcm9tIFwiQGdyYXBoZW5lL2NoYWluXCJcblxuICAgIFNob3J0LWhhbmQ6IEFwaXMuZGIoXCJtZXRob2RcIiwgXCJwYXJtMVwiLCAyLCAzLCAuLi4pLiAgUmV0dXJucyBhIHByb21pc2Ugd2l0aCByZXN1bHRzLlxuXG4gICAgQWRkaXRpb25hbCB1c2FnZTogQXBpcy5pbnN0YW5jZSgpLmRiX2FwaSgpLmV4ZWMoXCJtZXRob2RcIiwgW1wibWV0aG9kXCIsIFwicGFybTFcIiwgMiwgMywgLi4uXSkuXG4gICAgUmV0dXJucyBhIHByb21pc2Ugd2l0aCByZXN1bHRzLlxuKi9cblxuZXhwb3J0cy5kZWZhdWx0ID0ge1xuICBzZXRScGNDb25uZWN0aW9uU3RhdHVzQ2FsbGJhY2s6IGZ1bmN0aW9uIHNldFJwY0Nvbm5lY3Rpb25TdGF0dXNDYWxsYmFjayhjYWxsYmFjaykge1xuICAgIHRoaXMuc3RhdHVzQ2IgPSBjYWxsYmFjaztcblxuICAgIGlmIChpbnN0KSB7XG4gICAgICBpbnN0LnNldFJwY0Nvbm5lY3Rpb25TdGF0dXNDYWxsYmFjayhjYWxsYmFjayk7XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgICAgICBAYXJnIHtzdHJpbmd9IGNzIGlzIG9ubHkgcHJvdmlkZWQgaW4gdGhlIGZpcnN0IGNhbGxcbiAgICAgICAgQHJldHVybiB7QXBpc30gc2luZ2xldG9uIC4uIENoZWNrIEFwaXMuaW5zdGFuY2UoKS5pbml0X3Byb21pc2UgdG9cbiAgICAgICAga25vdyB3aGVuIHRoZSBjb25uZWN0aW9uIGlzIGVzdGFibGlzaGVkXG4gICAgKi9cbiAgcmVzZXQ6IGZ1bmN0aW9uIHJlc2V0KCkge1xuICAgIHZhciBjcyA9IGFyZ3VtZW50cy5sZW5ndGggPiAwICYmIGFyZ3VtZW50c1swXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzBdIDogJ3dzOi8vbG9jYWxob3N0OjgwOTAnO1xuICAgIHZhciBjb25uZWN0ID0gYXJndW1lbnRzWzFdO1xuICAgIHZhciBjb25uZWN0VGltZW91dCA9IGFyZ3VtZW50cy5sZW5ndGggPiAyICYmIGFyZ3VtZW50c1syXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzJdIDogNDAwMDtcblxuICAgIGlmIChpbnN0KSB7XG4gICAgICBpbnN0LmNsb3NlKCk7XG4gICAgICBpbnN0ID0gbnVsbDtcbiAgICB9XG5cbiAgICBpbnN0ID0gbmV3IEFwaXNJbnN0YW5jZSgpO1xuICAgIGluc3Quc2V0UnBjQ29ubmVjdGlvblN0YXR1c0NhbGxiYWNrKHRoaXMuc3RhdHVzQ2IpO1xuXG4gICAgaWYgKGluc3QgJiYgY29ubmVjdCkge1xuICAgICAgaW5zdC5jb25uZWN0KGNzLCBjb25uZWN0VGltZW91dCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGluc3Q7XG4gIH0sXG4gIGluc3RhbmNlOiBmdW5jdGlvbiBpbnN0YW5jZSgpIHtcbiAgICB2YXIgY3MgPSBhcmd1bWVudHMubGVuZ3RoID4gMCAmJiBhcmd1bWVudHNbMF0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1swXSA6ICd3czovL2xvY2FsaG9zdDo4MDkwJztcbiAgICB2YXIgY29ubmVjdCA9IGFyZ3VtZW50c1sxXTtcbiAgICB2YXIgY29ubmVjdFRpbWVvdXQgPSBhcmd1bWVudHMubGVuZ3RoID4gMiAmJiBhcmd1bWVudHNbMl0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1syXSA6IDQwMDA7XG5cbiAgICBpZiAoIWluc3QpIHtcbiAgICAgIGluc3QgPSBuZXcgQXBpc0luc3RhbmNlKCk7XG4gICAgICBpbnN0LnNldFJwY0Nvbm5lY3Rpb25TdGF0dXNDYWxsYmFjayh0aGlzLnN0YXR1c0NiKTtcbiAgICB9XG5cbiAgICBpZiAoaW5zdCAmJiBjb25uZWN0KSB7XG4gICAgICBpbnN0LmNvbm5lY3QoY3MsIGNvbm5lY3RUaW1lb3V0KTtcbiAgICB9XG5cbiAgICByZXR1cm4gaW5zdDtcbiAgfSxcbiAgY2hhaW5JZDogZnVuY3Rpb24gY2hhaW5JZCgpIHtcbiAgICByZXR1cm4gdGhpcy5pbnN0YW5jZSgpLmNoYWluX2lkO1xuICB9LFxuICBjbG9zZTogZnVuY3Rpb24gY2xvc2UoKSB7XG4gICAgaWYgKGluc3QpIHtcbiAgICAgIGluc3QuY2xvc2UoKTtcbiAgICAgIGluc3QgPSBudWxsO1xuICAgIH1cbiAgfVxuICAvLyBkYjogKG1ldGhvZCwgLi4uYXJncykgPT4gQXBpcy5pbnN0YW5jZSgpLmRiX2FwaSgpLmV4ZWMobWV0aG9kLCB0b1N0cmluZ3MoYXJncykpLFxuICAvLyBuZXR3b3JrOiAobWV0aG9kLCAuLi5hcmdzKSA9PiBBcGlzLmluc3RhbmNlKCkubmV0d29ya19hcGkoKS5leGVjKG1ldGhvZCwgdG9TdHJpbmdzKGFyZ3MpKSxcbiAgLy8gaGlzdG9yeTogKG1ldGhvZCwgLi4uYXJncykgPT4gQXBpcy5pbnN0YW5jZSgpLmhpc3RvcnlfYXBpKCkuZXhlYyhtZXRob2QsIHRvU3RyaW5ncyhhcmdzKSksXG4gIC8vIGNyeXB0bzogKG1ldGhvZCwgLi4uYXJncykgPT4gQXBpcy5pbnN0YW5jZSgpLmNyeXB0b19hcGkoKS5leGVjKG1ldGhvZCwgdG9TdHJpbmdzKGFyZ3MpKVxuXG59OyIsIid1c2Ugc3RyaWN0JztcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcblxuZnVuY3Rpb24gX2NsYXNzQ2FsbENoZWNrKGluc3RhbmNlLCBDb25zdHJ1Y3RvcikgeyBpZiAoIShpbnN0YW5jZSBpbnN0YW5jZW9mIENvbnN0cnVjdG9yKSkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IGNhbGwgYSBjbGFzcyBhcyBhIGZ1bmN0aW9uXCIpOyB9IH1cblxudmFyIGRlZmF1bHRzID0ge1xuICBjb3JlX2Fzc2V0OiAnUFBZJyxcbiAgYWRkcmVzc19wcmVmaXg6ICdQUFknLFxuICBleHBpcmVfaW5fc2VjczogMTUsXG4gIGV4cGlyZV9pbl9zZWNzX3Byb3Bvc2FsOiAyNCAqIDYwICogNjAsXG4gIHJldmlld19pbl9zZWNzX2NvbW1pdHRlZTogMjQgKiA2MCAqIDYwXG59O1xuXG52YXIgbmV0d29ya3MgPSB7XG4gIG5ldHdvcmtzOiB7XG4gICAgUGVlcnBsYXlzOiB7XG4gICAgICBjb3JlX2Fzc2V0OiAnUFBZJyxcbiAgICAgIGFkZHJlc3NfcHJlZml4OiAnUFBZJyxcbiAgICAgIGNoYWluX2lkOiAnNmI2YjVmMGNlN2EzNmQzMjM3NjhlNTM0ZjNlZGI0MWM2ZDYzMzJhNTQxYTk1NzI1Yjk4ZTI4ZDE0MDg1MDEzNCdcbiAgICB9LFxuICAgIFBlZXJwbGF5c1Rlc3RuZXQ6IHtcbiAgICAgIGNvcmVfYXNzZXQ6ICdQUFlURVNUJyxcbiAgICAgIGFkZHJlc3NfcHJlZml4OiAnUFBZVEVTVCcsXG4gICAgICBjaGFpbl9pZDogJ2JlNmI3OTI5NWU3Mjg0MDZjYmI3NDk0YmNiNjI2ZTYyYWQyNzhmYTQwMTg2OTljZjhmNzU3MzlmNGMxYTgxZmQnXG4gICAgfVxuICB9XG59O1xuXG52YXIgQ2hhaW5Db25maWcgPSBmdW5jdGlvbiAoKSB7XG4gIGZ1bmN0aW9uIENoYWluQ29uZmlnKCkge1xuICAgIF9jbGFzc0NhbGxDaGVjayh0aGlzLCBDaGFpbkNvbmZpZyk7XG5cbiAgICB0aGlzLnJlc2V0KCk7XG4gIH1cblxuICBDaGFpbkNvbmZpZy5wcm90b3R5cGUucmVzZXQgPSBmdW5jdGlvbiByZXNldCgpIHtcbiAgICBPYmplY3QuYXNzaWduKHRoaXMsIGRlZmF1bHRzKTtcbiAgfTtcblxuICBDaGFpbkNvbmZpZy5wcm90b3R5cGUuc2V0Q2hhaW5JZCA9IGZ1bmN0aW9uIHNldENoYWluSWQoY2hhaW5JRCkge1xuICAgIHZhciByZWYgPSBPYmplY3Qua2V5cyhuZXR3b3Jrcyk7XG5cbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gcmVmLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICB2YXIgbmV0d29ya19uYW1lID0gcmVmW2ldO1xuICAgICAgdmFyIG5ldHdvcmsgPSBuZXR3b3Jrc1tuZXR3b3JrX25hbWVdO1xuXG4gICAgICBpZiAobmV0d29yay5jaGFpbl9pZCA9PT0gY2hhaW5JRCkge1xuICAgICAgICB0aGlzLm5ldHdvcmtfbmFtZSA9IG5ldHdvcmtfbmFtZTtcblxuICAgICAgICBpZiAobmV0d29yay5hZGRyZXNzX3ByZWZpeCkge1xuICAgICAgICAgIHRoaXMuYWRkcmVzc19wcmVmaXggPSBuZXR3b3JrLmFkZHJlc3NfcHJlZml4O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBuZXR3b3JrX25hbWU6IG5ldHdvcmtfbmFtZSxcbiAgICAgICAgICBuZXR3b3JrOiBuZXR3b3JrXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLm5ldHdvcmtfbmFtZSkge1xuICAgICAgY29uc29sZS5sb2coJ1Vua25vd24gY2hhaW4gaWQgKHRoaXMgbWF5IGJlIGEgdGVzdG5ldCknLCBjaGFpbklEKTtcbiAgICB9XG4gIH07XG5cbiAgQ2hhaW5Db25maWcucHJvdG90eXBlLnNldFByZWZpeCA9IGZ1bmN0aW9uIHNldFByZWZpeCgpIHtcbiAgICB2YXIgcHJlZml4ID0gYXJndW1lbnRzLmxlbmd0aCA+IDAgJiYgYXJndW1lbnRzWzBdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMF0gOiAnUFBZJztcblxuICAgIHRoaXMuYWRkcmVzc19wcmVmaXggPSBwcmVmaXg7XG4gIH07XG5cbiAgcmV0dXJuIENoYWluQ29uZmlnO1xufSgpO1xuXG5leHBvcnRzLmRlZmF1bHQgPSBuZXcgQ2hhaW5Db25maWcoKTsiLCIndXNlIHN0cmljdCc7XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG5cbmZ1bmN0aW9uIF9jbGFzc0NhbGxDaGVjayhpbnN0YW5jZSwgQ29uc3RydWN0b3IpIHsgaWYgKCEoaW5zdGFuY2UgaW5zdGFuY2VvZiBDb25zdHJ1Y3RvcikpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCBjYWxsIGEgY2xhc3MgYXMgYSBmdW5jdGlvblwiKTsgfSB9XG5cbnZhciBTT0NLRVRfREVCVUcgPSBmYWxzZTtcbnZhciBXZWJTb2NrZXRDbGllbnQgPSBudWxsO1xuXG5pZiAodHlwZW9mIFdlYlNvY2tldCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgV2ViU29ja2V0Q2xpZW50ID0gV2ViU29ja2V0O1xufSBlbHNlIHtcbiAgV2ViU29ja2V0Q2xpZW50ID0gcmVxdWlyZSgnd3MnKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBnbG9iYWwtcmVxdWlyZVxufVxuXG52YXIgU1VCU0NSSUJFX09QRVJBVElPTlMgPSBbJ3NldF9zdWJzY3JpYmVfY2FsbGJhY2snLCAnc3Vic2NyaWJlX3RvX21hcmtldCcsICdicm9hZGNhc3RfdHJhbnNhY3Rpb25fd2l0aF9jYWxsYmFjaycsICdzZXRfcGVuZGluZ190cmFuc2FjdGlvbl9jYWxsYmFjayddO1xuXG52YXIgVU5TVUJTQ1JJQkVfT1BFUkFUSU9OUyA9IFsndW5zdWJzY3JpYmVfZnJvbV9tYXJrZXQnLCAndW5zdWJzY3JpYmVfZnJvbV9hY2NvdW50cyddO1xuXG52YXIgSEVBTFRIX0NIRUNLX0lOVEVSVkFMID0gMTAwMDA7XG5cbnZhciBDaGFpbldlYlNvY2tldCA9IGZ1bmN0aW9uICgpIHtcbiAgLyoqXG4gICAqQ3JlYXRlcyBhbiBpbnN0YW5jZSBvZiBDaGFpbldlYlNvY2tldC5cbiAgICogQHBhcmFtIHtzdHJpbmd9ICAgIHNlcnZlckFkZHJlc3MgICAgICAgICAgIFRoZSBhZGRyZXNzIG9mIHRoZSB3ZWJzb2NrZXQgdG8gY29ubmVjdCB0by5cbiAgICogQHBhcmFtIHtmdW5jdGlvbn0gIHN0YXR1c0NiICAgICAgICAgICAgICAgIENhbGxlZCB3aGVuIHN0YXR1cyBldmVudHMgb2NjdXIuXG4gICAqIEBwYXJhbSB7bnVtYmVyfSAgICBbY29ubmVjdFRpbWVvdXQ9MTAwMDBdICBUaGUgdGltZSBmb3IgYSBjb25uZWN0aW9uIGF0dGVtcHQgdG8gY29tcGxldGUuXG4gICAqIEBtZW1iZXJvZiBDaGFpbldlYlNvY2tldFxuICAgKi9cbiAgZnVuY3Rpb24gQ2hhaW5XZWJTb2NrZXQoc2VydmVyQWRkcmVzcywgc3RhdHVzQ2IpIHtcbiAgICB2YXIgY29ubmVjdFRpbWVvdXQgPSBhcmd1bWVudHMubGVuZ3RoID4gMiAmJiBhcmd1bWVudHNbMl0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1syXSA6IDEwMDAwO1xuXG4gICAgX2NsYXNzQ2FsbENoZWNrKHRoaXMsIENoYWluV2ViU29ja2V0KTtcblxuICAgIHRoaXMuc3RhdHVzQ2IgPSBzdGF0dXNDYjtcbiAgICB0aGlzLnNlcnZlckFkZHJlc3MgPSBzZXJ2ZXJBZGRyZXNzO1xuICAgIHRoaXMudGltZW91dEludGVydmFsID0gY29ubmVjdFRpbWVvdXQ7XG5cbiAgICAvLyBUaGUgY3VycmVuY3QgY29ubmVjdGlvbiBzdGF0ZSBvZiB0aGUgd2Vic29ja2V0LlxuICAgIHRoaXMuY29ubmVjdGVkID0gZmFsc2U7XG4gICAgdGhpcy5yZWNvbm5lY3RUaW1lb3V0ID0gbnVsbDtcblxuICAgIC8vIENhbGxiYWNrIHRvIGV4ZWN1dGUgd2hlbiB0aGUgd2Vic29ja2V0IGlzIHJlY29ubmVjdGVkLlxuICAgIHRoaXMub25fcmVjb25uZWN0ID0gbnVsbDtcblxuICAgIC8vIEFuIGluY3JlbWVudGluZyBJRCBmb3IgZWFjaCByZXF1ZXN0IHNvIHRoYXQgd2UgY2FuIHBhaXIgaXQgd2l0aCB0aGVcbiAgICAvLyByZXNwb25zZSBmcm9tIHRoZSB3ZWJzb2NrZXQuXG4gICAgdGhpcy5jYklkID0gMDtcblxuICAgIC8vIE9iamVjdHMgdG8gc3RvcmUga2V5L3ZhbHVlIHBhaXJzIGZvciBjYWxsYmFja3MsIHN1YnNjcmlwdGlvbiBjYWxsYmFja3NcbiAgICAvLyBhbmQgdW5zdWJzY3JpYmUgY2FsbGJhY2tzLlxuICAgIHRoaXMuY2JzID0ge307XG4gICAgdGhpcy5zdWJzID0ge307XG4gICAgdGhpcy51bnN1YiA9IHt9O1xuXG4gICAgLy8gQ3VycmVudCBjb25uZWN0aW9uIHByb21pc2VzJyByZWplY3Rpb25cbiAgICB0aGlzLmN1cnJlbnRSZXNvbHZlID0gbnVsbDtcbiAgICB0aGlzLmN1cnJlbnRSZWplY3QgPSBudWxsO1xuXG4gICAgLy8gSGVhbHRoIGNoZWNrIGZvciB0aGUgY29ubmVjdGlvbiB0byB0aGUgQmxvY2tDaGFpbi5cbiAgICB0aGlzLmhlYWx0aENoZWNrID0gbnVsbDtcblxuICAgIC8vIENvcHkgdGhlIGNvbnN0YW50cyB0byB0aGlzIGluc3RhbmNlLlxuICAgIHRoaXMuc3RhdHVzID0gQ2hhaW5XZWJTb2NrZXQuc3RhdHVzO1xuXG4gICAgLy8gQmluZCB0aGUgZnVuY3Rpb25zIHRvIHRoZSBpbnN0YW5jZS5cbiAgICB0aGlzLm9uQ29ubmVjdGlvbk9wZW4gPSB0aGlzLm9uQ29ubmVjdGlvbk9wZW4uYmluZCh0aGlzKTtcbiAgICB0aGlzLm9uQ29ubmVjdGlvbkNsb3NlID0gdGhpcy5vbkNvbm5lY3Rpb25DbG9zZS5iaW5kKHRoaXMpO1xuICAgIHRoaXMub25Db25uZWN0aW9uVGVybWluYXRlID0gdGhpcy5vbkNvbm5lY3Rpb25UZXJtaW5hdGUuYmluZCh0aGlzKTtcbiAgICB0aGlzLm9uQ29ubmVjdGlvbkVycm9yID0gdGhpcy5vbkNvbm5lY3Rpb25FcnJvci5iaW5kKHRoaXMpO1xuICAgIHRoaXMub25Db25uZWN0aW9uVGltZW91dCA9IHRoaXMub25Db25uZWN0aW9uVGltZW91dC5iaW5kKHRoaXMpO1xuICAgIHRoaXMuY3JlYXRlQ29ubmVjdGlvbiA9IHRoaXMuY3JlYXRlQ29ubmVjdGlvbi5iaW5kKHRoaXMpO1xuICAgIHRoaXMuY3JlYXRlQ29ubmVjdGlvblByb21pc2UgPSB0aGlzLmNyZWF0ZUNvbm5lY3Rpb25Qcm9taXNlLmJpbmQodGhpcyk7XG4gICAgdGhpcy5saXN0ZW5lciA9IHRoaXMubGlzdGVuZXIuYmluZCh0aGlzKTtcblxuICAgIC8vIENyZWF0ZSB0aGUgaW5pdGlhbCBjb25uZWN0aW9uIHRoZSBibG9ja2NoYWluLlxuICAgIHRoaXMuY3JlYXRlQ29ubmVjdGlvbigpO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZSB0aGUgY29ubmVjdGlvbiB0byB0aGUgQmxvY2tjaGFpbi5cbiAgICpcbiAgICogQHJldHVybnNcbiAgICogQG1lbWJlcm9mIENoYWluV2ViU29ja2V0XG4gICAqL1xuXG5cbiAgQ2hhaW5XZWJTb2NrZXQucHJvdG90eXBlLmNyZWF0ZUNvbm5lY3Rpb24gPSBmdW5jdGlvbiBjcmVhdGVDb25uZWN0aW9uKCkge1xuICAgIHRoaXMuZGVidWcoJyEhISBDaGFpbldlYlNvY2tldCBjcmVhdGUgY29ubmVjdGlvbicpO1xuXG4gICAgLy8gQ2xlYXIgYW55IHBvc3NpYmxlIHJlY29ubmVjdCB0aW1lcnMuXG4gICAgdGhpcy5yZWNvbm5lY3RUaW1lb3V0ID0gbnVsbDtcblxuICAgIC8vIENyZWF0ZSB0aGUgcHJvbWlzZSBmb3IgdGhpcyBjb25uZWN0aW9uXG4gICAgaWYgKCF0aGlzLmNvbm5lY3RfcHJvbWlzZSkge1xuICAgICAgdGhpcy5jb25uZWN0X3Byb21pc2UgPSBuZXcgUHJvbWlzZSh0aGlzLmNyZWF0ZUNvbm5lY3Rpb25Qcm9taXNlKTtcbiAgICB9XG5cbiAgICAvLyBBdHRlbXB0IHRvIGNyZWF0ZSB0aGUgd2Vic29ja2V0XG4gICAgdHJ5IHtcbiAgICAgIHRoaXMud3MgPSBuZXcgV2ViU29ja2V0Q2xpZW50KHRoaXMuc2VydmVyQWRkcmVzcyk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIC8vIFNldCBhIHRpbWVvdXQgdG8gdHJ5IGFuZCByZWNvbm5lY3QgaGVyZS5cbiAgICAgIHJldHVybiB0aGlzLnJlc2V0Q29ubmVjdGlvbigpO1xuICAgIH1cblxuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcnMoKTtcblxuICAgIC8vIEhhbmRsZSB0aW1lb3V0cyB0byB0aGUgd2Vic29ja2V0J3MgaW5pdGlhbCBjb25uZWN0aW9uLlxuICAgIHRoaXMuY29ubmVjdGlvblRpbWVvdXQgPSBzZXRUaW1lb3V0KHRoaXMub25Db25uZWN0aW9uVGltZW91dCwgdGhpcy50aW1lb3V0SW50ZXJ2YWwpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBSZXNldCB0aGUgY29ubmVjdGlvbiB0byB0aGUgQmxvY2tDaGFpbi5cbiAgICpcbiAgICogQG1lbWJlcm9mIENoYWluV2ViU29ja2V0XG4gICAqL1xuXG5cbiAgQ2hhaW5XZWJTb2NrZXQucHJvdG90eXBlLnJlc2V0Q29ubmVjdGlvbiA9IGZ1bmN0aW9uIHJlc2V0Q29ubmVjdGlvbigpIHtcbiAgICAvLyBDbG9zZSB0aGUgV2Vic29ja2V0IGlmIGl0cyBzdGlsbCAnaGFsZi1vcGVuJ1xuICAgIHRoaXMuY2xvc2UoKTtcblxuICAgIC8vIE1ha2Ugc3VyZSB3ZSBvbmx5IGV2ZXIgaGF2ZSBvbmUgdGltZW91dCBydW5uaW5nIHRvIHJlY29ubmVjdC5cbiAgICBpZiAoIXRoaXMucmVjb25uZWN0VGltZW91dCkge1xuICAgICAgdGhpcy5kZWJ1ZygnISEhIENoYWluV2ViU29ja2V0IHJlc2V0IGNvbm5lY3Rpb24nLCB0aGlzLnRpbWVvdXRJbnRlcnZhbCk7XG4gICAgICB0aGlzLnJlY29ubmVjdFRpbWVvdXQgPSBzZXRUaW1lb3V0KHRoaXMuY3JlYXRlQ29ubmVjdGlvbiwgdGhpcy50aW1lb3V0SW50ZXJ2YWwpO1xuICAgIH1cblxuICAgIC8vIFJlamVjdCB0aGUgY3VycmVudCBwcm9taXNlIGlmIHRoZXJlIGlzIG9uZS5cbiAgICBpZiAodGhpcy5jdXJyZW50UmVqZWN0KSB7XG4gICAgICB0aGlzLmN1cnJlbnRSZWplY3QobmV3IEVycm9yKCdDb25uZWN0aW9uIGF0dGVtcHQgZmFpbGVkOiAnICsgdGhpcy5zZXJ2ZXJBZGRyZXNzKSk7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBBZGQgZXZlbnQgbGlzdGVuZXJzIHRvIHRoZSBXZWJTb2NrZXQuXG4gICAqXG4gICAqIEBtZW1iZXJvZiBDaGFpbldlYlNvY2tldFxuICAgKi9cblxuXG4gIENoYWluV2ViU29ja2V0LnByb3RvdHlwZS5hZGRFdmVudExpc3RlbmVycyA9IGZ1bmN0aW9uIGFkZEV2ZW50TGlzdGVuZXJzKCkge1xuICAgIHRoaXMuZGVidWcoJyEhISBDaGFpbldlYlNvY2tldCBhZGQgZXZlbnQgbGlzdGVuZXJzJyk7XG4gICAgdGhpcy53cy5hZGRFdmVudExpc3RlbmVyKCdvcGVuJywgdGhpcy5vbkNvbm5lY3Rpb25PcGVuKTtcbiAgICB0aGlzLndzLmFkZEV2ZW50TGlzdGVuZXIoJ2Nsb3NlJywgdGhpcy5vbkNvbm5lY3Rpb25DbG9zZSk7XG4gICAgdGhpcy53cy5hZGRFdmVudExpc3RlbmVyKCdlcnJvcicsIHRoaXMub25Db25uZWN0aW9uRXJyb3IpO1xuICAgIHRoaXMud3MuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIHRoaXMubGlzdGVuZXIpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBSZW1vdmUgdGhlIGV2ZW50IGxpc3RlcnMgZnJvbSB0aGUgV2ViU29ja2V0LiBJdHMgaW1wb3J0YW50IHRvIHJlbW92ZSB0aGUgZXZlbnQgbGlzdGVyZXJzXG4gICAqIGZvciBnYXJiYWFnZSBjb2xsZWN0aW9uLiBCZWNhdXNlIHdlIGFyZSBjcmVhdGluZyBhIG5ldyBXZWJTb2NrZXQgb24gZWFjaCBjb25uZWN0aW9uIGF0dGVtcHRcbiAgICogYW55IGxpc3RlbmVycyB0aGF0IGFyZSBzdGlsbCBhdHRhY2hlZCBjb3VsZCBwcmV2ZW50IHRoZSBvbGQgc29ja2V0cyBmcm9tXG4gICAqIGJlaW5nIGdhcmJhZ2UgY29sbGVjdGVkLlxuICAgKlxuICAgKiBAbWVtYmVyb2YgQ2hhaW5XZWJTb2NrZXRcbiAgICovXG5cblxuICBDaGFpbldlYlNvY2tldC5wcm90b3R5cGUucmVtb3ZlRXZlbnRMaXN0ZW5lcnMgPSBmdW5jdGlvbiByZW1vdmVFdmVudExpc3RlbmVycygpIHtcbiAgICB0aGlzLmRlYnVnKCchISEgQ2hhaW5XZWJTb2NrZXQgcmVtb3ZlIGV2ZW50IGxpc3RlbmVycycpO1xuICAgIHRoaXMud3MucmVtb3ZlRXZlbnRMaXN0ZW5lcignb3BlbicsIHRoaXMub25Db25uZWN0aW9uT3Blbik7XG4gICAgdGhpcy53cy5yZW1vdmVFdmVudExpc3RlbmVyKCdjbG9zZScsIHRoaXMub25Db25uZWN0aW9uQ2xvc2UpO1xuICAgIHRoaXMud3MucmVtb3ZlRXZlbnRMaXN0ZW5lcignZXJyb3InLCB0aGlzLm9uQ29ubmVjdGlvbkVycm9yKTtcbiAgICB0aGlzLndzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCB0aGlzLmxpc3RlbmVyKTtcbiAgfTtcblxuICAvKipcbiAgICogQSBmdW5jdGlvbiB0aGF0IGlzIHBhc3NlZCB0byBhIG5ldyBwcm9taXNlIHRoYXQgc3RvcmVzIHRoZSByZXNvbHZlIGFuZCByZWplY3QgY2FsbGJhY2tzXG4gICAqIGluIHRoZSBzdGF0ZS5cbiAgICpcbiAgICogQHBhcmFtIHtmdW5jdGlvbn0gcmVzb2x2ZSBBIGNhbGxiYWNrIHRvIGJlIGV4ZWN1dGVkIHdoZW4gdGhlIHByb21pc2UgaXMgcmVzb2x2ZWQuXG4gICAqIEBwYXJhbSB7ZnVuY3Rpb259IHJlamVjdCBBIGNhbGxiYWNrIHRvIGJlIGV4ZWN1dGVkIHdoZW4gdGhlIHByb21pc2UgaXMgcmVqZWN0ZWQuXG4gICAqIEBtZW1iZXJvZiBDaGFpbldlYlNvY2tldFxuICAgKi9cblxuXG4gIENoYWluV2ViU29ja2V0LnByb3RvdHlwZS5jcmVhdGVDb25uZWN0aW9uUHJvbWlzZSA9IGZ1bmN0aW9uIGNyZWF0ZUNvbm5lY3Rpb25Qcm9taXNlKHJlc29sdmUsIHJlamVjdCkge1xuICAgIHRoaXMuZGVidWcoJyEhISBDaGFpbldlYlNvY2tldCBjcmVhdGVQcm9taXNlJyk7XG4gICAgdGhpcy5jdXJyZW50UmVzb2x2ZSA9IHJlc29sdmU7XG4gICAgdGhpcy5jdXJyZW50UmVqZWN0ID0gcmVqZWN0O1xuICB9O1xuXG4gIC8qKlxuICAgKiBDYWxsZWQgd2hlbiBhIG5ldyBXZWJzb2NrZXQgY29ubmVjdGlvbiBpcyBvcGVuZWQuXG4gICAqXG4gICAqIEBtZW1iZXJvZiBDaGFpbldlYlNvY2tldFxuICAgKi9cblxuXG4gIENoYWluV2ViU29ja2V0LnByb3RvdHlwZS5vbkNvbm5lY3Rpb25PcGVuID0gZnVuY3Rpb24gb25Db25uZWN0aW9uT3BlbigpIHtcbiAgICB0aGlzLmRlYnVnKCchISEgQ2hhaW5XZWJTb2NrZXQgQ29ubmVjdGVkICcpO1xuXG4gICAgdGhpcy5jb25uZWN0ZWQgPSB0cnVlO1xuXG4gICAgY2xlYXJUaW1lb3V0KHRoaXMuY29ubmVjdGlvblRpbWVvdXQpO1xuICAgIHRoaXMuY29ubmVjdGlvblRpbWVvdXQgPSBudWxsO1xuXG4gICAgLy8gVGhpcyB3aWxsIHRyaWdnZXIgdGhlIGxvZ2luIHByb2Nlc3MgYXMgd2VsbCBhcyBzb21lIGFkZGl0aW9uYWwgc2V0dXAgaW4gQXBpSW5zdGFuY2VzXG4gICAgaWYgKHRoaXMub25fcmVjb25uZWN0KSB7XG4gICAgICB0aGlzLm9uX3JlY29ubmVjdCgpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmN1cnJlbnRSZXNvbHZlKSB7XG4gICAgICB0aGlzLmN1cnJlbnRSZXNvbHZlKCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuc3RhdHVzQ2IpIHtcbiAgICAgIHRoaXMuc3RhdHVzQ2IoQ2hhaW5XZWJTb2NrZXQuc3RhdHVzLk9QRU4pO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogY2FsbGVkIHdoZW4gdGhlIGNvbm5lY3Rpb24gYXR0ZW1wdCB0aW1lcyBvdXQuXG4gICAqXG4gICAqIEBtZW1iZXJvZiBDaGFpbldlYlNvY2tldFxuICAgKi9cblxuXG4gIENoYWluV2ViU29ja2V0LnByb3RvdHlwZS5vbkNvbm5lY3Rpb25UaW1lb3V0ID0gZnVuY3Rpb24gb25Db25uZWN0aW9uVGltZW91dCgpIHtcbiAgICB0aGlzLmRlYnVnKCchISEgQ2hhaW5XZWJTb2NrZXQgdGltZW91dCcpO1xuICAgIHRoaXMub25Db25uZWN0aW9uQ2xvc2UobmV3IEVycm9yKCdDb25uZWN0aW9uIHRpbWVkIG91dC4nKSk7XG4gIH07XG5cbiAgLyoqXG4gICAqIENhbGxlZCB3aGVuIHRoZSBXZWJzb2NrZXQgaXMgbm90IHJlc3BvbmRpbmcgdG8gdGhlIGhlYWx0aCBjaGVja3MuXG4gICAqXG4gICAqIEBtZW1iZXJvZiBDaGFpbldlYlNvY2tldFxuICAgKi9cblxuXG4gIENoYWluV2ViU29ja2V0LnByb3RvdHlwZS5vbkNvbm5lY3Rpb25UZXJtaW5hdGUgPSBmdW5jdGlvbiBvbkNvbm5lY3Rpb25UZXJtaW5hdGUoKSB7XG4gICAgdGhpcy5kZWJ1ZygnISEhIENoYWluV2ViU29ja2V0IHRlcm1pbmF0ZScpO1xuICAgIHRoaXMub25Db25uZWN0aW9uQ2xvc2UobmV3IEVycm9yKCdDb25uZWN0aW9uIHdhcyB0ZXJtaW5hdGVkLicpKTtcbiAgfTtcblxuICAvKipcbiAgICogQ2FsbGVkIHdoZW4gdGhlIGNvbm5lY3Rpb24gdG8gdGhlIEJsb2NrY2hhaW4gaXMgY2xvc2VkLlxuICAgKlxuICAgKiBAcGFyYW0geyp9IGVycm9yXG4gICAqIEBtZW1iZXJvZiBDaGFpbldlYlNvY2tldFxuICAgKi9cblxuXG4gIENoYWluV2ViU29ja2V0LnByb3RvdHlwZS5vbkNvbm5lY3Rpb25DbG9zZSA9IGZ1bmN0aW9uIG9uQ29ubmVjdGlvbkNsb3NlKGVycm9yKSB7XG4gICAgdGhpcy5kZWJ1ZygnISEhIENoYWluV2ViU29ja2V0IENsb3NlICcsIGVycm9yKTtcblxuICAgIHRoaXMucmVzZXRDb25uZWN0aW9uKCk7XG5cbiAgICBpZiAodGhpcy5zdGF0dXNDYikge1xuICAgICAgdGhpcy5zdGF0dXNDYihDaGFpbldlYlNvY2tldC5zdGF0dXMuQ0xPU0VEKTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIENhbGxlZCB3aGVuIHRoZSBXZWJzb2NrZXQgZW5jb3VudGVycyBhbiBlcnJvci5cbiAgICpcbiAgICogQHBhcmFtIHsqfSBlcnJvclxuICAgKiBAbWVtYmVyb2YgQ2hhaW5XZWJTb2NrZXRcbiAgICovXG5cblxuICBDaGFpbldlYlNvY2tldC5wcm90b3R5cGUub25Db25uZWN0aW9uRXJyb3IgPSBmdW5jdGlvbiBvbkNvbm5lY3Rpb25FcnJvcihlcnJvcikge1xuICAgIHRoaXMuZGVidWcoJyEhISBDaGFpbldlYlNvY2tldCBPbiBDb25uZWN0aW9uIEVycm9yICcsIGVycm9yKTtcblxuICAgIHRoaXMucmVzZXRDb25uZWN0aW9uKCk7XG5cbiAgICBpZiAodGhpcy5zdGF0dXNDYikge1xuICAgICAgdGhpcy5zdGF0dXNDYihDaGFpbldlYlNvY2tldC5zdGF0dXMuRVJST1IpO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogRW50cnkgcG9pbnQgdG8gbWFrZSBSUEMgY2FsbHMgb24gdGhlIEJsb2NrQ2hhaW4uXG4gICAqXG4gICAqIEBwYXJhbSB7YXJyYXl9IHBhcmFtcyBBbiBhcnJheSBvZiBwYXJhbXMgdG8gYmUgcGFzc2VkIHRvIHRoZSBycGMgY2FsbC4gW21ldGhvZCwgLi4ucGFyYW1zXVxuICAgKiBAcmV0dXJucyBBIG5ldyBwcm9taXNlIGZvciB0aGlzIHNwZWNpZmljIGNhbGwuXG4gICAqIEBtZW1iZXJvZiBDaGFpbldlYlNvY2tldFxuICAgKi9cblxuXG4gIENoYWluV2ViU29ja2V0LnByb3RvdHlwZS5jYWxsID0gZnVuY3Rpb24gY2FsbChwYXJhbXMpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgaWYgKCF0aGlzLmNvbm5lY3RlZCkge1xuICAgICAgdGhpcy5kZWJ1ZygnISEhIENoYWluV2ViU29ja2V0IENhbGwgbm90IGNvbm5lY3RlZC4gJyk7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKCdEaXNjb25uZWN0ZWQgZnJvbSB0aGUgQmxvY2tDaGFpbi4nKSk7XG4gICAgfVxuXG4gICAgdGhpcy5kZWJ1ZygnISEhIENoYWluV2ViU29ja2V0IENhbGwgY29ubmVjdGVkLiAnLCBwYXJhbXMpO1xuXG4gICAgdmFyIHJlcXVlc3QgPSB7XG4gICAgICBtZXRob2Q6IHBhcmFtc1sxXSxcbiAgICAgIHBhcmFtczogcGFyYW1zLFxuICAgICAgaWQ6IHRoaXMuY2JJZCArIDFcbiAgICB9O1xuXG4gICAgdGhpcy5jYklkID0gcmVxdWVzdC5pZDtcblxuICAgIGlmIChTVUJTQ1JJQkVfT1BFUkFUSU9OUy5pbmNsdWRlcyhyZXF1ZXN0Lm1ldGhvZCkpIHtcbiAgICAgIC8vIFN0b3JlIGNhbGxiYWNrIGluIHN1YnMgbWFwXG4gICAgICB0aGlzLnN1YnNbcmVxdWVzdC5pZF0gPSB7XG4gICAgICAgIGNhbGxiYWNrOiByZXF1ZXN0LnBhcmFtc1syXVswXVxuICAgICAgfTtcblxuICAgICAgLy8gUmVwbGFjZSBjYWxsYmFjayB3aXRoIHRoZSBjYWxsYmFjayBpZFxuICAgICAgcmVxdWVzdC5wYXJhbXNbMl1bMF0gPSByZXF1ZXN0LmlkO1xuICAgIH1cblxuICAgIGlmIChVTlNVQlNDUklCRV9PUEVSQVRJT05TLmluY2x1ZGVzKHJlcXVlc3QubWV0aG9kKSkge1xuICAgICAgaWYgKHR5cGVvZiByZXF1ZXN0LnBhcmFtc1syXVswXSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZpcnN0IHBhcmFtZXRlciBvZiB1bnN1YiBtdXN0IGJlIHRoZSBvcmlnaW5hbCBjYWxsYmFjaycpO1xuICAgICAgfVxuXG4gICAgICB2YXIgdW5TdWJDYiA9IHJlcXVlc3QucGFyYW1zWzJdLnNwbGljZSgwLCAxKVswXTtcblxuICAgICAgLy8gRmluZCB0aGUgY29ycmVzcG9uZGluZyBzdWJzY3JpcHRpb25cbiAgICAgIGZvciAodmFyIGlkIGluIHRoaXMuc3Vicykge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1saW5lXG4gICAgICAgIGlmICh0aGlzLnN1YnNbaWRdLmNhbGxiYWNrID09PSB1blN1YkNiKSB7XG4gICAgICAgICAgdGhpcy51bnN1YltyZXF1ZXN0LmlkXSA9IGlkO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLmhlYWx0aENoZWNrKSB7XG4gICAgICB0aGlzLmhlYWx0aENoZWNrID0gc2V0VGltZW91dCh0aGlzLm9uQ29ubmVjdGlvblRlcm1pbmF0ZS5iaW5kKHRoaXMpLCBIRUFMVEhfQ0hFQ0tfSU5URVJWQUwpO1xuICAgIH1cblxuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICBfdGhpcy5jYnNbcmVxdWVzdC5pZF0gPSB7XG4gICAgICAgIHRpbWU6IG5ldyBEYXRlKCksXG4gICAgICAgIHJlc29sdmU6IHJlc29sdmUsXG4gICAgICAgIHJlamVjdDogcmVqZWN0XG4gICAgICB9O1xuXG4gICAgICAvLyBTZXQgYWxsIHJlcXVlc3RzIHRvIGJlICdjYWxsJyBtZXRob2RzLlxuICAgICAgcmVxdWVzdC5tZXRob2QgPSAnY2FsbCc7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIF90aGlzLndzLnNlbmQoSlNPTi5zdHJpbmdpZnkocmVxdWVzdCkpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgX3RoaXMuZGVidWcoJ0NhdWdodCBhIG5hc3R5IGVycm9yIDogJywgZXJyb3IpO1xuICAgICAgfVxuICAgIH0pO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDYWxsZWQgd2hlbiBtZXNzYWdlcyBhcmUgcmVjZWl2ZWQgb24gdGhlIFdlYnNvY2tldC5cbiAgICpcbiAgICogQHBhcmFtIHsqfSByZXNwb25zZSBUaGUgbWVzc2FnZSByZWNlaXZlZC5cbiAgICogQG1lbWJlcm9mIENoYWluV2ViU29ja2V0XG4gICAqL1xuXG5cbiAgQ2hhaW5XZWJTb2NrZXQucHJvdG90eXBlLmxpc3RlbmVyID0gZnVuY3Rpb24gbGlzdGVuZXIocmVzcG9uc2UpIHtcbiAgICB2YXIgcmVzcG9uc2VKU09OID0gbnVsbDtcblxuICAgIHRyeSB7XG4gICAgICByZXNwb25zZUpTT04gPSBKU09OLnBhcnNlKHJlc3BvbnNlLmRhdGEpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICByZXNwb25zZUpTT04uZXJyb3IgPSAnRXJyb3IgcGFyc2luZyByZXNwb25zZTogJyArIGVycm9yLnN0YWNrO1xuICAgICAgdGhpcy5kZWJ1ZygnRXJyb3IgcGFyc2luZyByZXNwb25zZTogJywgcmVzcG9uc2UpO1xuICAgIH1cblxuICAgIC8vIENsZWFyIHRoZSBoZWFsdGggY2hlY2sgdGltZW91dCwgd2UndmUganVzdCByZWNlaXZlZCBhIGhlYWx0aHkgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyLlxuICAgIGlmICh0aGlzLmhlYWx0aENoZWNrKSB7XG4gICAgICBjbGVhclRpbWVvdXQodGhpcy5oZWFsdGhDaGVjayk7XG4gICAgICB0aGlzLmhlYWx0aENoZWNrID0gbnVsbDtcbiAgICB9XG5cbiAgICB2YXIgc3ViID0gZmFsc2U7XG4gICAgdmFyIGNhbGxiYWNrID0gbnVsbDtcblxuICAgIGlmIChyZXNwb25zZUpTT04ubWV0aG9kID09PSAnbm90aWNlJykge1xuICAgICAgc3ViID0gdHJ1ZTtcbiAgICAgIHJlc3BvbnNlSlNPTi5pZCA9IHJlc3BvbnNlSlNPTi5wYXJhbXNbMF07XG4gICAgfVxuXG4gICAgaWYgKCFzdWIpIHtcbiAgICAgIGNhbGxiYWNrID0gdGhpcy5jYnNbcmVzcG9uc2VKU09OLmlkXTtcbiAgICB9IGVsc2Uge1xuICAgICAgY2FsbGJhY2sgPSB0aGlzLnN1YnNbcmVzcG9uc2VKU09OLmlkXS5jYWxsYmFjaztcbiAgICB9XG5cbiAgICBpZiAoY2FsbGJhY2sgJiYgIXN1Yikge1xuICAgICAgaWYgKHJlc3BvbnNlSlNPTi5lcnJvcikge1xuICAgICAgICB0aGlzLmRlYnVnKCctLS0tPiByZXNwb25zZUpTT04gOiAnLCByZXNwb25zZUpTT04pO1xuICAgICAgICBjYWxsYmFjay5yZWplY3QocmVzcG9uc2VKU09OLmVycm9yKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNhbGxiYWNrLnJlc29sdmUocmVzcG9uc2VKU09OLnJlc3VsdCk7XG4gICAgICB9XG5cbiAgICAgIGRlbGV0ZSB0aGlzLmNic1tyZXNwb25zZUpTT04uaWRdO1xuXG4gICAgICBpZiAodGhpcy51bnN1YltyZXNwb25zZUpTT04uaWRdKSB7XG4gICAgICAgIGRlbGV0ZSB0aGlzLnN1YnNbdGhpcy51bnN1YltyZXNwb25zZUpTT04uaWRdXTtcbiAgICAgICAgZGVsZXRlIHRoaXMudW5zdWJbcmVzcG9uc2VKU09OLmlkXTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGNhbGxiYWNrICYmIHN1Yikge1xuICAgICAgY2FsbGJhY2socmVzcG9uc2VKU09OLnBhcmFtc1sxXSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuZGVidWcoJ1dhcm5pbmc6IHVua25vd24gd2Vic29ja2V0IHJlc3BvbnNlSlNPTjogJywgcmVzcG9uc2VKU09OKTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIExvZ2luIHRvIHRoZSBCbG9ja2NoYWluLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gdXNlciBVc2VybmFtZVxuICAgKiBAcGFyYW0ge3N0cmluZ30gcGFzc3dvcmQgUGFzc3dvcmRcbiAgICogQHJldHVybnMgQSBwcm9taXNlIHRoYXQgaXMgZnVsZmlsbGVkIGFmdGVyIGxvZ2luLlxuICAgKiBAbWVtYmVyb2YgQ2hhaW5XZWJTb2NrZXRcbiAgICovXG5cblxuICBDaGFpbldlYlNvY2tldC5wcm90b3R5cGUubG9naW4gPSBmdW5jdGlvbiBsb2dpbih1c2VyLCBwYXNzd29yZCkge1xuICAgIHZhciBfdGhpczIgPSB0aGlzO1xuXG4gICAgdGhpcy5kZWJ1ZygnISEhIENoYWluV2ViU29ja2V0IGxvZ2luLicsIHVzZXIsIHBhc3N3b3JkKTtcbiAgICByZXR1cm4gdGhpcy5jb25uZWN0X3Byb21pc2UudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gX3RoaXMyLmNhbGwoWzEsICdsb2dpbicsIFt1c2VyLCBwYXNzd29yZF1dKTtcbiAgICB9KTtcbiAgfTtcblxuICAvKipcbiAgICogQ2xvc2UgdGhlIGNvbm5lY3Rpb24gdG8gdGhlIEJsb2NrY2hhaW4uXG4gICAqXG4gICAqIEBtZW1iZXJvZiBDaGFpbldlYlNvY2tldFxuICAgKi9cblxuXG4gIENoYWluV2ViU29ja2V0LnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uIGNsb3NlKCkge1xuICAgIGlmICh0aGlzLndzKSB7XG4gICAgICB0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXJzKCk7XG5cbiAgICAgIC8vIFRyeSBhbmQgZmlyZSBjbG9zZSBvbiB0aGUgY29ubmVjdGlvbi5cbiAgICAgIHRoaXMud3MuY2xvc2UoKTtcblxuICAgICAgLy8gQ2xlYXIgb3VyIHJlZmVyZW5jZXMgc28gdGhhdCBpdCBjYW4gYmUgZ2FyYmFnZSBjb2xsZWN0ZWQuXG4gICAgICB0aGlzLndzID0gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBDbGVhciBvdXIgdGltZW91dHMgZm9yIGNvbm5lY3Rpb24gdGltZW91dCBhbmQgaGVhbHRoIGNoZWNrLlxuICAgIGNsZWFyVGltZW91dCh0aGlzLmNvbm5lY3Rpb25UaW1lb3V0KTtcbiAgICB0aGlzLmNvbm5lY3Rpb25UaW1lb3V0ID0gbnVsbDtcblxuICAgIGNsZWFyVGltZW91dCh0aGlzLmhlYWx0aENoZWNrKTtcbiAgICB0aGlzLmhlYWx0aENoZWNrID0gbnVsbDtcblxuICAgIGNsZWFyVGltZW91dCh0aGlzLnJlY29ubmVjdFRpbWVvdXQpO1xuICAgIHRoaXMucmVjb25uZWN0VGltZW91dCA9IG51bGw7XG5cbiAgICAvLyBUb2dnbGUgdGhlIGNvbm5lY3RlZCBmbGFnLlxuICAgIHRoaXMuY29ubmVjdGVkID0gZmFsc2U7XG4gIH07XG5cbiAgQ2hhaW5XZWJTb2NrZXQucHJvdG90eXBlLmRlYnVnID0gZnVuY3Rpb24gZGVidWcoKSB7XG4gICAgaWYgKFNPQ0tFVF9ERUJVRykge1xuICAgICAgZm9yICh2YXIgX2xlbiA9IGFyZ3VtZW50cy5sZW5ndGgsIHBhcmFtcyA9IEFycmF5KF9sZW4pLCBfa2V5ID0gMDsgX2tleSA8IF9sZW47IF9rZXkrKykge1xuICAgICAgICBwYXJhbXNbX2tleV0gPSBhcmd1bWVudHNbX2tleV07XG4gICAgICB9XG5cbiAgICAgIGNvbnNvbGUubG9nLmFwcGx5KG51bGwsIHBhcmFtcyk7XG4gICAgfVxuICB9O1xuXG4gIHJldHVybiBDaGFpbldlYlNvY2tldDtcbn0oKTtcblxuLy8gQ29uc3RhbnRzIGZvciBTVEFURVxuXG5cbkNoYWluV2ViU29ja2V0LnN0YXR1cyA9IHtcbiAgUkVDT05ORUNURUQ6ICdyZWNvbm5lY3RlZCcsXG4gIE9QRU46ICdvcGVuJyxcbiAgQ0xPU0VEOiAnY2xvc2VkJyxcbiAgRVJST1I6ICdlcnJvcidcbn07XG5cbmV4cG9ydHMuZGVmYXVsdCA9IENoYWluV2ViU29ja2V0OyIsIid1c2Ugc3RyaWN0JztcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcblxudmFyIF9BcGlJbnN0YW5jZXMgPSByZXF1aXJlKCcuL0FwaUluc3RhbmNlcycpO1xuXG52YXIgX0FwaUluc3RhbmNlczIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9BcGlJbnN0YW5jZXMpO1xuXG52YXIgX0NoYWluV2ViU29ja2V0ID0gcmVxdWlyZSgnLi9DaGFpbldlYlNvY2tldCcpO1xuXG52YXIgX0NoYWluV2ViU29ja2V0MiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX0NoYWluV2ViU29ja2V0KTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuZnVuY3Rpb24gX2NsYXNzQ2FsbENoZWNrKGluc3RhbmNlLCBDb25zdHJ1Y3RvcikgeyBpZiAoIShpbnN0YW5jZSBpbnN0YW5jZW9mIENvbnN0cnVjdG9yKSkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IGNhbGwgYSBjbGFzcyBhcyBhIGZ1bmN0aW9uXCIpOyB9IH1cblxudmFyIENvbm5lY3Rpb25NYW5hZ2VyID0gZnVuY3Rpb24gKCkge1xuICBmdW5jdGlvbiBDb25uZWN0aW9uTWFuYWdlcihfcmVmKSB7XG4gICAgdmFyIHVybCA9IF9yZWYudXJsLFxuICAgICAgICB1cmxzID0gX3JlZi51cmxzO1xuXG4gICAgX2NsYXNzQ2FsbENoZWNrKHRoaXMsIENvbm5lY3Rpb25NYW5hZ2VyKTtcblxuICAgIHRoaXMudXJsID0gdXJsO1xuICAgIHRoaXMudXJscyA9IHVybHMuZmlsdGVyKGZ1bmN0aW9uIChhKSB7XG4gICAgICByZXR1cm4gYSAhPT0gdXJsO1xuICAgIH0pO1xuICB9XG5cbiAgQ29ubmVjdGlvbk1hbmFnZXIucHJvdG90eXBlLmxvZ0ZhaWx1cmUgPSBmdW5jdGlvbiBsb2dGYWlsdXJlKHVybCkge1xuICAgIGNvbnNvbGUuZXJyb3IoJ1VuYWJsZSB0byBjb25uZWN0IHRvJywgdXJsICsgJywgc2tpcHBpbmcgdG8gbmV4dCBmdWxsIG5vZGUgQVBJIHNlcnZlcicpO1xuICB9O1xuXG4gIENvbm5lY3Rpb25NYW5hZ2VyLnByb3RvdHlwZS5pc1VSTCA9IGZ1bmN0aW9uIGlzVVJMKHN0cikge1xuICAgIHZhciBlbmRwb2ludFBhdHRlcm4gPSBuZXcgUmVnRXhwKCcoKF4oPzp3cyhzKT86XFxcXC9cXFxcLyl8KD86aHR0cChzKT86XFxcXC9cXFxcLykpKygoPzpbXlxcXFwvXFxcXC9cXFxcLl0pK1xcXFw/Pyg/OlstXFxcXCs9JjslQC5cXFxcd19dKikoKCM/KD86W1xcXFx3XSkqKSg6P1swLTldKikpKSknKTtcblxuICAgIHJldHVybiBlbmRwb2ludFBhdHRlcm4udGVzdChzdHIpO1xuICB9O1xuXG4gIENvbm5lY3Rpb25NYW5hZ2VyLnByb3RvdHlwZS5jb25uZWN0ID0gZnVuY3Rpb24gY29ubmVjdCgpIHtcbiAgICB2YXIgX2Nvbm5lY3QgPSBhcmd1bWVudHMubGVuZ3RoID4gMCAmJiBhcmd1bWVudHNbMF0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1swXSA6IHRydWU7XG5cbiAgICB2YXIgdXJsID0gYXJndW1lbnRzLmxlbmd0aCA+IDEgJiYgYXJndW1lbnRzWzFdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMV0gOiB0aGlzLnVybDtcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICBfQXBpSW5zdGFuY2VzMi5kZWZhdWx0Lmluc3RhbmNlKHVybCwgX2Nvbm5lY3QpLmluaXRfcHJvbWlzZS50aGVuKHJlc29sdmUpLmNhdGNoKGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICBfQXBpSW5zdGFuY2VzMi5kZWZhdWx0Lmluc3RhbmNlKCkuY2xvc2UoKTtcbiAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9O1xuXG4gIENvbm5lY3Rpb25NYW5hZ2VyLnByb3RvdHlwZS5jb25uZWN0V2l0aEZhbGxiYWNrID0gZnVuY3Rpb24gY29ubmVjdFdpdGhGYWxsYmFjaygpIHtcbiAgICB2YXIgY29ubmVjdCA9IGFyZ3VtZW50cy5sZW5ndGggPiAwICYmIGFyZ3VtZW50c1swXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzBdIDogdHJ1ZTtcbiAgICB2YXIgdXJsID0gYXJndW1lbnRzLmxlbmd0aCA+IDEgJiYgYXJndW1lbnRzWzFdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMV0gOiB0aGlzLnVybDtcbiAgICB2YXIgaW5kZXggPSBhcmd1bWVudHMubGVuZ3RoID4gMiAmJiBhcmd1bWVudHNbMl0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1syXSA6IDA7XG5cbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgdmFyIHJlc29sdmUgPSBhcmd1bWVudHMubGVuZ3RoID4gMyAmJiBhcmd1bWVudHNbM10gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1szXSA6IG51bGw7XG4gICAgdmFyIHJlamVjdCA9IGFyZ3VtZW50cy5sZW5ndGggPiA0ICYmIGFyZ3VtZW50c1s0XSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzRdIDogbnVsbDtcblxuICAgIGlmIChyZWplY3QgJiYgaW5kZXggPiB0aGlzLnVybHMubGVuZ3RoIC0gMSkge1xuICAgICAgcmV0dXJuIHJlamVjdChuZXcgRXJyb3IoJ1RyaWVkICcgKyAoaW5kZXggKyAxKSArICcgY29ubmVjdGlvbnMsIG5vbmUgb2Ygd2hpY2ggd29ya2VkOiAnICsgSlNPTi5zdHJpbmdpZnkodGhpcy51cmxzLmNvbmNhdCh0aGlzLnVybCkpKSk7XG4gICAgfVxuXG4gICAgdmFyIGZhbGxiYWNrID0gZnVuY3Rpb24gZmFsbGJhY2socmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICBfdGhpcy5sb2dGYWlsdXJlKHVybCk7XG4gICAgICByZXR1cm4gX3RoaXMuY29ubmVjdFdpdGhGYWxsYmFjayhjb25uZWN0LCBfdGhpcy51cmxzW2luZGV4XSwgaW5kZXggKyAxLCByZXNvbHZlLCByZWplY3QpO1xuICAgIH07XG5cbiAgICBpZiAocmVzb2x2ZSAmJiByZWplY3QpIHtcbiAgICAgIHJldHVybiB0aGlzLmNvbm5lY3QoY29ubmVjdCwgdXJsKS50aGVuKHJlc29sdmUpLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZmFsbGJhY2socmVzb2x2ZSwgcmVqZWN0KTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICBfdGhpcy5jb25uZWN0KGNvbm5lY3QpLnRoZW4ocmVzb2x2ZSkuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICBmYWxsYmFjayhyZXNvbHZlLCByZWplY3QpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH07XG5cbiAgQ29ubmVjdGlvbk1hbmFnZXIucHJvdG90eXBlLnBpbmcgPSBmdW5jdGlvbiBwaW5nKGNvbm4sIHJlc29sdmUsIHJlamVjdCkge1xuICAgIHZhciBjb25uZWN0aW9uU3RhcnRUaW1lcyA9IHt9O1xuICAgIHZhciB1cmwgPSBjb25uLnNlcnZlckFkZHJlc3M7XG5cbiAgICBpZiAoIXRoaXMuaXNVUkwodXJsKSkge1xuICAgICAgdGhyb3cgRXJyb3IoJ1VSTCBOT1QgVkFMSUQnLCB1cmwpO1xuICAgIH1cblxuICAgIGNvbm5lY3Rpb25TdGFydFRpbWVzW3VybF0gPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcblxuICAgIHZhciBkb1BpbmcgPSBmdW5jdGlvbiBkb1BpbmcocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAvLyBQYXNzIGluIGJsYW5rIHJwY191c2VyIGFuZCBycGNfcGFzc3dvcmQuXG4gICAgICBjb25uLmxvZ2luKCcnLCAnJykudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgIHZhciBfdXJsTGF0ZW5jeTtcblxuICAgICAgICAvLyBNYWtlIHN1cmUgY29ubmVjdGlvbiBpcyBjbG9zZWQgYXMgaXQgaXMgc2ltcGx5IGEgaGVhbHRoIGNoZWNrXG4gICAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgICBjb25uLmNsb3NlKCk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgdXJsTGF0ZW5jeSA9IChfdXJsTGF0ZW5jeSA9IHt9LCBfdXJsTGF0ZW5jeVt1cmxdID0gbmV3IERhdGUoKS5nZXRUaW1lKCkgLSBjb25uZWN0aW9uU3RhcnRUaW1lc1t1cmxdLCBfdXJsTGF0ZW5jeSk7XG4gICAgICAgIHJlc29sdmUodXJsTGF0ZW5jeSk7XG4gICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgIGNvbnNvbGUud2FybignUElORyBFUlJPUjogJywgZXJyKTtcbiAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgaWYgKHJlc29sdmUgJiYgcmVqZWN0KSB7XG4gICAgICBkb1BpbmcocmVzb2x2ZSwgcmVqZWN0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGRvUGluZyk7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAqIHNvcnRzIHRoZSBub2RlcyBpbnRvIGEgbGlzdCBiYXNlZCBvbiBsYXRlbmN5XG4gICogQG1lbWJlcm9mIENvbm5lY3Rpb25NYW5hZ2VyXG4gICovXG5cblxuICBDb25uZWN0aW9uTWFuYWdlci5wcm90b3R5cGUuc29ydE5vZGVzQnlMYXRlbmN5ID0gZnVuY3Rpb24gc29ydE5vZGVzQnlMYXRlbmN5KHJlc29sdmUsIHJlamVjdCkge1xuICAgIHZhciBsYXRlbmN5TGlzdCA9IHRoaXMuY2hlY2tDb25uZWN0aW9ucygpO1xuXG4gICAgLy8gU29ydCBsaXN0IGJ5IGxhdGVuY3lcbiAgICB2YXIgY2hlY2tGdW5jdGlvbiA9IGZ1bmN0aW9uIGNoZWNrRnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICBsYXRlbmN5TGlzdC50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICB2YXIgc29ydGVkTGlzdCA9IE9iamVjdC5rZXlzKHJlc3BvbnNlKS5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgICAgcmV0dXJuIHJlc3BvbnNlW2FdIC0gcmVzcG9uc2VbYl07XG4gICAgICAgIH0pO1xuICAgICAgICByZXNvbHZlKHNvcnRlZExpc3QpO1xuICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICBpZiAocmVzb2x2ZSAmJiByZWplY3QpIHtcbiAgICAgIGNoZWNrRnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGNoZWNrRnVuY3Rpb24pO1xuICAgIH1cbiAgfTtcblxuICBDb25uZWN0aW9uTWFuYWdlci5wcm90b3R5cGUuY2hlY2tDb25uZWN0aW9ucyA9IGZ1bmN0aW9uIGNoZWNrQ29ubmVjdGlvbnMocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgdmFyIF90aGlzMiA9IHRoaXM7XG5cbiAgICB2YXIgY2hlY2tGdW5jdGlvbiA9IGZ1bmN0aW9uIGNoZWNrRnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICB2YXIgZnVsbExpc3QgPSBfdGhpczIudXJscztcbiAgICAgIHZhciBjb25uZWN0aW9uUHJvbWlzZXMgPSBbXTtcblxuICAgICAgZnVsbExpc3QuZm9yRWFjaChmdW5jdGlvbiAodXJsKSB7XG4gICAgICAgIHZhciBjb25uID0gbmV3IF9DaGFpbldlYlNvY2tldDIuZGVmYXVsdCh1cmwsIGZ1bmN0aW9uICgpIHt9KTtcblxuICAgICAgICBjb25uZWN0aW9uUHJvbWlzZXMucHVzaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgcmV0dXJuIF90aGlzMi5waW5nKGNvbm4pLnRoZW4oZnVuY3Rpb24gKHVybExhdGVuY3kpIHtcbiAgICAgICAgICAgIHJldHVybiB1cmxMYXRlbmN5O1xuICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGNvbm4uY2xvc2UoKTtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuXG4gICAgICBQcm9taXNlLmFsbChjb25uZWN0aW9uUHJvbWlzZXMubWFwKGZ1bmN0aW9uIChhKSB7XG4gICAgICAgIHJldHVybiBhKCk7XG4gICAgICB9KSkudGhlbihmdW5jdGlvbiAocmVzKSB7XG4gICAgICAgIHJlc29sdmUocmVzLmZpbHRlcihmdW5jdGlvbiAoYSkge1xuICAgICAgICAgIHJldHVybiAhIWE7XG4gICAgICAgIH0pLnJlZHVjZShmdW5jdGlvbiAoZiwgYSkge1xuICAgICAgICAgIHZhciBrZXkgPSBPYmplY3Qua2V5cyhhKVswXTtcbiAgICAgICAgICBmW2tleV0gPSBhW2tleV07XG4gICAgICAgICAgcmV0dXJuIGY7XG4gICAgICAgIH0sIHt9KSk7XG4gICAgICB9KS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBfdGhpczIuY2hlY2tDb25uZWN0aW9ucyhyZXNvbHZlLCByZWplY3QpO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgIGlmIChyZXNvbHZlICYmIHJlamVjdCkge1xuICAgICAgY2hlY2tGdW5jdGlvbihyZXNvbHZlLCByZWplY3QpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoY2hlY2tGdW5jdGlvbik7XG4gICAgfVxuICB9O1xuXG4gIHJldHVybiBDb25uZWN0aW9uTWFuYWdlcjtcbn0oKTtcblxuZXhwb3J0cy5kZWZhdWx0ID0gQ29ubmVjdGlvbk1hbmFnZXI7IiwiJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnRzLl9fZXNNb2R1bGUgPSB0cnVlO1xuXG5mdW5jdGlvbiBfY2xhc3NDYWxsQ2hlY2soaW5zdGFuY2UsIENvbnN0cnVjdG9yKSB7IGlmICghKGluc3RhbmNlIGluc3RhbmNlb2YgQ29uc3RydWN0b3IpKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgY2FsbCBhIGNsYXNzIGFzIGEgZnVuY3Rpb25cIik7IH0gfVxuXG52YXIgR3JhcGhlbmVBcGkgPSBmdW5jdGlvbiAoKSB7XG4gIGZ1bmN0aW9uIEdyYXBoZW5lQXBpKHdzX3JwYywgYXBpX25hbWUpIHtcbiAgICBfY2xhc3NDYWxsQ2hlY2sodGhpcywgR3JhcGhlbmVBcGkpO1xuXG4gICAgdGhpcy53c19ycGMgPSB3c19ycGM7XG4gICAgdGhpcy5hcGlfbmFtZSA9IGFwaV9uYW1lO1xuICB9XG5cbiAgR3JhcGhlbmVBcGkucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbiBpbml0KCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICByZXR1cm4gdGhpcy53c19ycGMuY2FsbChbMSwgdGhpcy5hcGlfbmFtZSwgW11dKS50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgX3RoaXMuYXBpX2lkID0gcmVzcG9uc2U7XG4gICAgICByZXR1cm4gX3RoaXM7XG4gICAgfSk7XG4gIH07XG5cbiAgR3JhcGhlbmVBcGkucHJvdG90eXBlLmV4ZWMgPSBmdW5jdGlvbiBleGVjKG1ldGhvZCwgcGFyYW1zKSB7XG4gICAgcmV0dXJuIHRoaXMud3NfcnBjLmNhbGwoW3RoaXMuYXBpX2lkLCBtZXRob2QsIHBhcmFtc10pLmNhdGNoKGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgY29uc29sZS5sb2coJyEhISBHcmFwaGVuZUFwaSBlcnJvcjogJywgbWV0aG9kLCBwYXJhbXMsIGVycm9yLCBKU09OLnN0cmluZ2lmeShlcnJvcikpO1xuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfSk7XG4gIH07XG5cbiAgcmV0dXJuIEdyYXBoZW5lQXBpO1xufSgpO1xuXG5leHBvcnRzLmRlZmF1bHQgPSBHcmFwaGVuZUFwaTsiLCIiXX0=
