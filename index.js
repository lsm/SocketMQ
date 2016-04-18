var Socket = require('./lib/socket/index')
var SocketChannel = require('./lib/socket/channel')

var socketmq = module.exports = function() {
  return new Socket()
}

socketmq.Socket = Socket

socketmq.bind = function(uri, options, callback) {
  var smq = socketmq()
  smq.bind(uri, options, callback)
  return smq
}

socketmq.connect = function(uri, options, callback) {
  var smq = socketmq()
  smq.connect(uri, options, callback)
  return smq
}

socketmq.channel = function(ns, name) {
  return new SocketChannel(null, ns, name)
}

/**
 * Server side API
 * @return {[type]} [description]
 */

socketmq.hub = function() {
  var SocketHub = require('./lib/socket' + '/hub')
  return new SocketHub()
}

socketmq.gateway = function() {
  var SocketGateway = require('./lib/socket' + '/gateway')
  return new SocketGateway()
}
