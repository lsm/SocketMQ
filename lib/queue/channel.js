var type = require('../message/type')
var Queue = require('./index')
var inherits = require('inherits')

var PUB = type.PUB
var REQ = type.REQ
var MNS = type.MNS
var MCH = type.MCH
var INF = type.INF
var AIN = type.AIN
var OUT = type.OUT
var SID = type.SID

var QueueChannel = module.exports = function QueueChannel(socket, ns, name) {
  if (!ns)
    throw new Error('Channel queue requires namespace')

  Queue.call(this, socket)
  this.ns = ns
  this.chn = name
}

inherits(QueueChannel, Queue)


QueueChannel.prototype.req = function(streams, pack, callback) {
  pack.meta = getChannelMeta(this, pack)
  this._req(streams, pack, callback)
}

QueueChannel.prototype.pub = function(streams, pack) {
  pack.meta = getChannelMeta(this, pack)
  this._pub(streams, pack)
}

QueueChannel.prototype.allow = function(pack, stream, dispatch) {
  dispatch(pack, stream)
}

QueueChannel.prototype.leave = function() {
  // Unbind event listeners first
  this.socket.removeListener('connect', this.onconnect)
  this.socket.removeListener('message', this.onmessage)
  // Ack remote that we are leaving this channel
  var outPack = this.getAckPack()
  if (outPack) {
    outPack.event = OUT
    this.inf(this.socket.streams, outPack)
  }
  // Remove reference of socket
  delete this.socket
}

/**
 * Dispatch messages to corresponding handlers.
 *
 * @param  {Buffer} data   Raw data buffer
 * @param  {Stream} stream The stream from which the data was sent
 */
QueueChannel.prototype.beforeDispatch = function(pack, stream, dispatch) {
  var meta = pack.meta
  // Ignore messages which has incorrect meta info.
  if (!meta || !meta[MNS] || this.ns !== meta[MNS] || !meta[MCH])
    return

  var chn = meta[MCH]
  // Ignore message which doesn't match
  if (this.chn) {
    if (chn !== this.chn)
      return
  } else if (PUB === pack.type || REQ === pack.type) {
    // No channel information, inject channel name to PUB/REQ messages
    pack.msg.unshift(chn)
  }

  var socket = this.socket
  this.allow(pack, stream, function(pack, stream) {
    if (chn && INF === pack.type && AIN === pack.event)
      socket.emit('join', chn)
    dispatch(pack, stream)
  })
}

/**
 * Private functions
 */

QueueChannel.prototype._req = Queue.prototype.req
QueueChannel.prototype._pub = Queue.prototype.pub

function getChannelMeta(queue, pack) {
  var meta = pack.meta || {}
  meta[MNS] = queue.ns
  meta[MCH] = pack.chn || queue.chn
  if (pack.sid)
    meta[SID] = pack.sid
  if (!meta[MCH])
    throw new Error('Channel name is required for sending channel message.')
  return meta
}
