var que = require('./que')
var Socket = require('./index')
var inherits = require('inherits')
var QueueChannel = require('../queue/channel')


var SocketChannel = module.exports = function SocketChannel(socket, ns, chn) {
  this.queue = new QueueChannel(socket, ns, chn)
  this.queue.encode = socket.queue.encode
  this.queue.decode = socket.queue.decode
  this.streams = socket.streams
}

inherits(SocketChannel, Socket)

SocketChannel.prototype.reqChn = function(chn, event, msg, callback) {
  msg = que.getArgs(arguments, msg, 2, 2, 4)
  callback = arguments[arguments.length - 1]
  this.queue.req(this.streams, chn, event, msg, callback)
}

SocketChannel.prototype.req = function(event, msg, callback) {
  if (!this.queue.chn)
    throw new Error('SocketMQ has no default channel name')
  this.reqChn(this.queue.chn, event, msg, callback || function() {})
}

SocketChannel.prototype.pubChn = function(chn, event, msg) {
  msg = que.getArgs(arguments, msg, 2, 1, 3)
  this.queue.pub(this.streams, chn, event, msg)
}

SocketChannel.prototype.pub = function(event, msg) {
  if (!this.queue.chn)
    throw new Error('SocketMQ has no default channel name')
  this.pubChn(this.queue.chn, event, msg)
}

