/**
 * Module dependencies
 */

var type = require('./lib/message/type')
var Socket = require('./lib/socket/index')
var SocketChannel = require('./lib/socket/channel')

/**
 * SocketMQ main module
 */
var socketmq = module.exports = function() {
  return new Socket()
}

/**
 * Expose types
 * @type {Object}
 */
socketmq.type = type

/**
 * Expose Socket constructor
 * @type {Function}
 */
socketmq.Socket = Socket

/**
 * Create a new SocketMQ instance and bind to endpoint.
 * @type {Function}
 */
socketmq.bind = function(uri, options, callback) {
  var smq = socketmq()
  smq.bind(uri, options, callback)
  return smq
}

/**
 * Create a new SocketMQ instance and connect to endpoint.
 * @type {Function}
 */
socketmq.connect = function(uri, options, callback) {
  var smq = socketmq()
  smq.connect(uri, options, callback)
  return smq
}

/**
 * Channel constructor
 */

socketmq.channel = function(ns, name) {
  return new SocketChannel(null, ns, name)
}

/**
 * Server constructors
 */

socketmq.hub = function() {
  var SocketHub = require('./lib/socket' + '/hub')
  return new SocketHub()
}

socketmq.gateway = function() {
  var SocketGateway = require('./lib/socket' + '/gateway')
  return new SocketGateway()
}
