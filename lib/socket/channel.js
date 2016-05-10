var que = require('./que')
var Socket = require('./index')
var inherits = require('inherits')
var QueueChannel = require('../queue/channel')


var SocketChannel = module.exports = function SocketChannel(socket, ns, chn) {
  if (socket) {
    this.queue = new QueueChannel(socket, ns, chn, this)
    this.streams = socket.streams
  } else {
    Socket.call(this, new QueueChannel(this, ns, chn))
  }
}

inherits(SocketChannel, Socket)

SocketChannel.prototype.reqChn = function(chn, event, msg, callback) {
  var args = que.getArgs(arguments, msg, 2, 2, 3)
  this.queue.req(this.streams, {
    chn: chn,
    event: event,
    msg: args.msg
  }, args.callback)
}

SocketChannel.prototype.pubChn = function(chn, event, msg) {
  var args = que.getArgs(arguments, msg, 2, 1, 3)
  this.queue.pub(this.streams, {
    chn: chn,
    event: event,
    msg: args.msg
  })
}

SocketChannel.prototype.pubSid = function(sid, event, msg) {
  var args = que.getArgs(arguments, msg, 2, 1, 3)
  this.queue.pub(this.streams, {
    sid: sid,
    event: event,
    msg: args.msg
  })
}

SocketChannel.prototype.allow = function(allowFn) {
  this.queue.allow = allowFn
}

SocketChannel.prototype.leave = function() {
  // Leave queue and remove reference
  this.queue.leave()
  delete this.queue
  // Unbind listeners
  this.removeAllListeners('join')
}

