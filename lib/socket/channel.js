var que = require('./que')
var type = require('../message/type')
var Socket = require('./index')
var inherits = require('inherits')
var QueueChannel = require('../queue/channel')

var DISCON = type.DISCON
var EXITED = type.EXITED


var SocketChannel = module.exports = function SocketChannel(socket, ns, chn) {
  this.ns = ns
  this.chn = chn
  this.ondisconnect = this.ondisconnect.bind(this)

  if (socket) {
    this.queue = new QueueChannel(socket, ns, chn, this)
    this.socket = socket
    this.streams = socket.streams
  } else {
    Socket.call(this, new QueueChannel(this, ns, chn))
    this.socket = this
  }

  this.socket.on('disconnect', this.ondisconnect)
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

SocketChannel.prototype.left = function(leftFn) {
  this.queue.left = leftFn
}

SocketChannel.prototype.join = function(chn) {
  if (!chn)
    throw new Error('`join` requires channel name')

  if (this.chn && chn !== this.chn)
    throw new Error('Already in channel "' + this.chn + '", leave it first.')

  if (-1 === this.socket.listeners('disconnect').indexOf(this.disconnect))
    this.socket.on('disconnect', this.ondisconnect)

  this.chn = chn
  this.queue.join(chn)
}

SocketChannel.prototype.leave = function(reason) {
  if (!this.chn)
    return false

  reason = reason || EXITED
  if (EXITED === reason) {
    // Assume we don't need this instance anymore after left with reason EXITED.
    this.socket.removeListener('disconnect', this.ondisconnect)
  }

  this.queue.leave(reason)
  // Remove chn so we know we are not in a channel any more.
  delete this.chn
  return true
}

SocketChannel.prototype.ondisconnect = function() {
  // Only handle disconnect event when we are in a specific channel.
  if (this.chn && 0 === this.streams.length)
    // We assume all streams provide same functionalities so only consider this
    // instance leave a channel when there are no connected streams available.
    this.leave(DISCON)
}
