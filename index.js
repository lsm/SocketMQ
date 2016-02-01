var Url = require('url');
var net = require('./net')
var Socket = exports.Socket = require('./socket')

exports.bind = function(url, options) {
  return createSocketMQ('bind', url, options)
}

exports.connect = function(url, options) {
  return createSocketMQ('connect', url, options)
}

function isProtocolSupported(protocol) {
  if (!net[protocol]) {
    var err = 'Transport "' + protocol + '" is not supported. SocketMQ supports: ' + Object.keys(net).join(', ')
    throw new Error(err)
  }
  return protocol
}

function createSocketMQ(type, url, options) {
  var target = Url.parse(url)
  var protocol = isProtocolSupported(target.protocol.slice(0, -1))

  var socket = new Socket()
  net[protocol][type](target, socket, options)

  return socket
}
