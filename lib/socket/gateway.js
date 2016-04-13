var Socket = require('./index')
var inherits = require('inherits')
var QueueGateway = require('../queue/gateway')


var Gateway = module.exports = function SocketGateway() {
  Socket.call(this, QueueGateway)
}

inherits(Gateway, Socket)


Gateway.prototype.isUntrusted = function(stream) {
  throw new Error('Please implement `isUntrusted` for SocketMQ Gateway.')
}
