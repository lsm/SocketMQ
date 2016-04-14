var type = require('../message/type')
var Queue = require('./index')
var inherits = require('inherits')

var PUB = type.PUB
var REQ = type.REQ
var MID = type.MID
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

QueueChannel.prototype.req = function(streams, chn, event, msg, callback) {
  var len = streams.length
  var stream = streams[this.n++ % len]
  if (!stream)
    return this.push(['req', streams, chn, event, msg, callback])

  // Generate id for callback and save it in inbox.
  var msgId = '.' + this.n
  var meta = {}
  meta[MID] = msgId
  meta[MNS] = this.ns
  meta[MCH] = chn
  REQ, event, msg, meta
  var buf = this.encode({
    type: REQ,
    event: event,
    msg: msg,
    meta: meta
  })
  this[REQ][msgId] = callback
  // send the buf to selected stream
  this.send(stream, buf)
}

QueueChannel.prototype.pub = function(streams, chn, event, msg) {
  var len = streams.length
  if (0 === len)
    return this.push(['pub', streams, chn, event, msg])

  var meta = {}
  meta[MNS] = this.ns
  meta[MCH] = chn
  var send = this.send
  var buf = this.encode({
    type: PUB,
    event: event,
    msg: msg,
    meta: meta
  })
  while (len-- > 0) {
    send(streams[len], buf)
  }
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
