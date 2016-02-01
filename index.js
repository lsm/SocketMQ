var Url = require('url');
var transport = require('./transport')
var Socket = exports.Socket = require('./socket')

exports.bind = function(url, options) {
  return createSocketMQ('bind', url, options)
}

exports.connect = function(url, options) {
  return createSocketMQ('connect', url, options)
}

function isProtocolSupported(protocol) {
  if (!transport[protocol]) {
    var err = 'Transport "' + protocol + '" is not supported. SocketMQ supports: ' + Object.keys(transport).join(', ')
    throw new Error(err)
  }
  return protocol
}

function createSocketMQ(type, url, options) {
  var target = Url.parse(url)
  var protocol = isProtocolSupported(target.protocol.slice(0, -1))

  var socket = new Socket()
  transport[protocol][type](target, socket, options)

  return socket
}
