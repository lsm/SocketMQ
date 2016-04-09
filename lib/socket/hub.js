var Socket = require('./index')
var inherits = require('inherits')
var QueueHub = require('../queue/hub')


var Hub = module.exports = function SocketHub() {
  Socket.call(this, QueueHub)
}

inherits(Hub, Socket)
