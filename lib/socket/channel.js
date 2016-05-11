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
  this.ns = ns
  this.chn = chn
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

SocketChannel.prototype.join = function(chn) {
  if (!chn)
    throw new Error('`join` requires channel name')

  if (this.chn)
    throw new Error('Already in channel "' + this.chn + '", leave it first.')

  this.chn = chn
  this.queue.join(chn)
}

SocketChannel.prototype.leave = function() {
  if (!this.chn)
    return false
  this.queue.leave()
  // Remove chn so we know we are not in any channel.
  delete this.chn
  return true
}

