var type = require('../message/type')
var Queue = require('./index')
var inherits = require('inherits')

var PUB = type.PUB
var REQ = type.REQ
var MNS = type.MNS
var MCH = type.MCH
var INF = type.INF
var JON = type.JON
var LVE = type.LVE
var SID = type.SID
var JOINED = type.JOINED
var EXITED = type.EXITED
var DISCON = type.DISCON

var QueueChannel = module.exports = function QueueChannel(socket, ns, name, emitter) {
  if (!ns)
    throw new Error('Channel queue requires namespace')

  Queue.call(this, socket)
  this.ns = ns
  this.chn = name
  this.emitter = emitter || socket
  this.joined = false
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

QueueChannel.prototype.join = function(chn) {
  this.chn = chn

  // Bind linsteners if not already bound
  if (-1 === this.socket.listeners('connect').indexOf(this.onconnect))
    this.socket.on('connect', this.onconnect)
  if (-1 === this.socket.listeners('message').indexOf(this.onmessage))
    this.socket.on('message', this.onmessage)

  // Send ack
  var streams = this.socket.streams
  if (streams.length > 0)
    this.ack(streams)
}

QueueChannel.prototype.leave = function(reason) {
  // Reason is EXITED by default if it's not provided
  reason = reason || EXITED

  // Unbind event listeners first
  this.socket.removeListener('connect', this.onconnect)
  this.socket.removeListener('message', this.onmessage)

  // Ack remote that we are leaving this channel when we leave it by ourselves
  if (EXITED === reason) {
    var leavePack = this.getAckPack()
    if (leavePack) {
      leavePack.event = LVE
      this.inf(this.socket.streams, leavePack)
    }
  }

  this.joined = false
  this.emitter.emit('leave', reason, this.ns, this.chn)
}

QueueChannel.prototype.onLeavePack = function(pack, stream) {
  var reason = pack.msg && pack.msg[0]
  if (reason) {
    if (this.chn)
      this.emitter.leave(reason)
    else if (this.left && (EXITED === reason || DISCON === reason))
      this.left(pack, stream)
  }
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
    if ('*' === chn) {
      // Only allow LVE event INF pack when chn is `*`
      if (LVE !== pack.event || INF !== pack.type)
        return
    } else if (chn !== this.chn) {
      return
    }
  } else if (PUB === pack.type || REQ === pack.type) {
    // No channel information, inject channel name to PUB/REQ messages
    pack.msg.unshift(chn)
  }

  var self = this
  var emitter = this.emitter
  this.allow(pack, stream, function(pack, stream) {
    if (chn && INF === pack.type && JON === pack.event) {
      self.joined = true
      self._flush()
      emitter.emit('join', JOINED, meta[MNS], chn)
    }
    dispatch(pack, stream)
  })
}

/**
 * Private functions
 */

QueueChannel.prototype._req = Queue.prototype.req
QueueChannel.prototype._pub = Queue.prototype.pub
QueueChannel.prototype._flushAll = Queue.prototype._flush

QueueChannel.prototype._flush = function() {
  var len = this._pendings.length
  if (0 < len) {
    if (this.chn && true !== this.joined)
      // Only flush INF pack if we have channel name and not joined yet.
      // Reset pendings array to what left.
      this.pendings = flushInf(this, len)
    else
      this._flushAll()
  }
}

function flushInf(queue, len) {
  var pendings = queue._pendings
  var newPendings = []

  var i = 0
  while (i < len) {
    var _p = pendings[i++]
    if ('inf' === _p[0])
      queue[_p[0]](_p[1], _p[2], _p[3], _p[4], _p[5], _p[6])
    else
      newPendings.push(_p)
  }

  return newPendings
}

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
