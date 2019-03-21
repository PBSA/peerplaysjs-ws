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

  /**
  * sorts the nodes into a list based on latency
  * 
  * @memberof ConnectionManager
  */


  ConnectionManager.prototype.sortNodesByLatency = function sortNodesByLatency(resolve, reject) {
    var latencyList = this.checkConnections();

    //sort list by latency
    var checkFunction = function checkFunction(resolve, reject) {
      latencyList.then(function (response) {
        console.log('unsorted latency list: ', response);
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

  ConnectionManager.prototype.checkConnections = function checkConnections() {
    var rpc_user = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
    var rpc_password = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';

    var _this2 = this;

    var resolve = arguments[2];
    var reject = arguments[3];

    var connectionStartTimes = {};

    var checkFunction = function checkFunction(resolve, reject) {
      var fullList = _this2.urls.concat(_this2.url);
      var connectionPromises = [];

      fullList.forEach(function (url) {
        var conn = new _ChainWebSocket2.default(url, function () {});
        connectionStartTimes[url] = new Date().getTime();
        connectionPromises.push(function () {
          return conn.login(rpc_user, rpc_password).then(function () {
            var _ref2;

            conn.close();
            return _ref2 = {}, _ref2[url] = new Date().getTime() - connectionStartTimes[url], _ref2;
          }).catch(function () {
            if (url === _this2.url) {
              _this2.url = _this2.urls[0];
            } else {
              _this2.urls = _this2.urls.filter(function (a) {
                return a !== url;
              });
            }

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
        return _this2.checkConnections(rpc_user, rpc_password, resolve, reject);
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