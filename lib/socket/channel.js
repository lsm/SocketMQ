var que = require('./que')
var type = require('../message/type')
var Socket = require('./index')
var inherits = require('inherits')
var QueueChannel = require('../queue/channel')

var DISCON = type.DISCON
var EXITED = type.EXITED
var UNSUBS = type.UNSUBS


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
  var args = que.getMsgAndCallback(arguments, 2)
  var pack = {
    chn: chn,
    msg: args.msg,
    event: event
  }
  this.queue.req(this.streams, pack, args.callback)
}

SocketChannel.prototype.pubChn = function(chn, event, msg) {
  var pack = que.getMsg(arguments, 2)
  pack.chn = chn
  pack.event = event
  this.queue.pub(this.streams, pack)
}

SocketChannel.prototype.pubSid = function(sid, event, msg) {
  var pack = que.getMsg(arguments, 2)
  pack.sid = sid
  pack.event = event
  this.queue.pub(this.streams, pack)
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

  // Bind linsteners if not already bound
  if (-1 === this.socket.listeners('connect').indexOf(this.queue.onconnect))
    this.socket.on('connect', this.queue.onconnect)
  if (-1 === this.socket.listeners('message').indexOf(this.queue.onmessage))
    this.socket.on('message', this.queue.onmessage)
  if (-1 === this.socket.listeners('disconnect').indexOf(this.disconnect))
    this.socket.on('disconnect', this.ondisconnect)

  this.chn = chn
  this.queue.join(chn)
}

SocketChannel.prototype.leave = function(reason) {
  if (!this.chn)
    return false

  // Reason is EXITED by default if it's not provided
  reason = reason || EXITED

  // Assume we don't use this instance anymore after left with reason EXITED or UNSUBS.
  if (EXITED === reason || UNSUBS === reason) {
    // Unbind all event listeners of this instance.
    this.socket.removeListener('connect', this.queue.onconnect)
    this.socket.removeListener('message', this.queue.onmessage)
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
