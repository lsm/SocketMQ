var type = require('../message/type')
var Queue = require('./index')
var inherits = require('inherits')

var PUB = type.PUB
var REQ = type.REQ
var MNS = type.MNS
var MCH = type.MCH
var INF = type.INF
var AIN = type.AIN

var QueueChannel = module.exports = function QueueChannel(socket, ns, name) {
  if (!ns)
    throw new Error('Channel queue requires namespace')

  Queue.call(this, socket)
  this.ns = ns
  this.chn = name
  this[AIN] = false
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

  var self = this
  this.allow(pack, stream, function(pack, stream) {
    if (chn && false === self[AIN] && INF === pack.type && AIN === pack.event) {
      self[AIN] = true
      self.socket.emit('join', self)
    }
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
  if (!meta[MCH])
    throw new Error('Channel name is required for sending channel message.')
  return meta
}
