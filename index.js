var Url = require('url');
var transport = require('./lib/transport')
var Socket = exports.Socket = require('./lib/socket')

exports.bind = function(url, options) {
  return createSocketMQ('bind', url, options)
}

exports.connect = function(url, options) {
  return createSocketMQ('connect', url, options)
}

function createSocketMQ(type, url, options) {
  var target = Url.parse(url)
  var protocol = target.protocol.slice(0, -1)

  if (!transport[protocol]) {
    var err = 'Transport "' + protocol + '" is not supported. SocketMQ supports: ' + Object.keys(transport).join(', ')
    throw new Error(err)
  }

  var socket = new Socket()
  transport[protocol][type](target, socket, options)

  return socket
}
