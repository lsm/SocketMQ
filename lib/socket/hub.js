var util = require('util')
var Socket = require('./index')
var QueueHub = require('../queue/hub')


var Hub = module.exports = function SocketHub() {
  Socket.call(this)

  this.queue = new QueueHub(this)
  this.onMessage = this.queue.dispatch.bind(this.queue)

  this.setMsgEncoder()
}

util.inherits(Hub, Socket)
