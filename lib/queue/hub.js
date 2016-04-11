var type = require('../message/type')
var wire = require('../message/wire')
var Queue = require('./index')
var Buffer = type.Buffer
var inherits = require('inherits')

var PUB = type.PUB
var SUB = type.SUB
var REQ = type.REQ
var REP = type.REP
var INF = type.INF
var MID = type.MID
var MNS = type.MNS
var ACK = type.ACK


var Hub = module.exports = function QueueHub(socket) {
  Queue.call(this, socket)
}

inherits(Hub, Queue)

Hub.prototype.onHubPub = function(streams, pack, buf, excludedStream) {
  var tag = this.socket.prefixTags(SUB, pack.event)
  var meta = pack.meta

  if (meta && meta[MNS])
    tag = this.socket.prefixTags(meta[MNS], tag)

  var _streams = this.socket.getStreamsByTag(tag, streams)
  var len = _streams.length
  if (0 === len || (1 === len && excludedStream === _streams[0]))
    // No stream or only has one stream which is the excluded one.
    return this.push(['onHubPub', streams, pack, buf, excludedStream])

  var send = this.send
  while (len-- > 0) {
    var stream = _streams[len]
    if (stream !== excludedStream)
      send(stream, buf)
  }
}

Hub.prototype.onHubReq = function(streams, pack, reply) {
  var tag = this.socket.prefixTags(REP, pack.event)
  var meta = pack.meta

  if (meta && meta[MNS])
    tag = this.socket.prefixTags(meta[MNS], tag)

  var _streams = this.socket.getStreamsByTag(tag, streams)
  var len = _streams.length
  var stream = _streams[this.n++ % len]
  if (!stream)
    return this.push(['onHubReq', streams, pack, reply])

  // Generate id for callback and save it in inbox.
  if (meta && meta[MID]) {
    meta[MID] += '.' + this.n
    pack.formatId = Buffer(pack.formatId)
    var buf = wire.encode(pack)
    this.reqInbox[meta[MID]] = {
      cb: reply
    }
    // send the buf to selected stream
    this.send(stream, buf)
  }
}

Hub.prototype.onHubRep = function(pack) {
  var msgId = pack.meta[MID]
  var inbox = this.reqInbox[msgId]
  if (inbox) {
    inbox.cb(pack)
    delete this.reqInbox[msgId]
  }
}

Hub.prototype.onHubInf = function(pack, stream) {
  switch (pack.event) {
    case ACK:
      // An info message tells what REQ/PUB event the stream will respond to.
      var msg = pack.msg
      var meta = pack.meta
      var tags
      if (msg[REP]) {
        tags = this.socket.prefixTags(REP, msg[REP])
        if (meta && meta[MNS])
          // We have namespace, tag again
          tags = this.socket.prefixTags(meta[MNS], tags)
        this.socket.tag(stream, tags)
      }
      if (msg[SUB]) {
        tags = this.socket.prefixTags(SUB, msg[SUB])
        if (meta && meta[MNS])
          // We have namespace, tag again
          tags = this.socket.prefixTags(meta[MNS], tags)
        this.socket.tag(stream, tags)
      }
      this._flush()
      break
  }
}

Hub.prototype.beforeDispatch = function(pack, stream, dispatch) {
  dispatch(pack, stream)
}

Hub.prototype.dispatch = function(buf, stream) {
  var pack = wire.decode(buf)
  var meta = pack.meta

  var hub = this
  this.beforeDispatch(pack, stream, function(pack, stream) {
    switch (pack.type) {
      case PUB:
        hub.onHubPub(hub.socket.streams, pack, buf, stream)
        break
      case REQ:
        // Make reply function
        var send = hub.send
        var msgId = meta[MID]
        var reply = function(repPack) {
          repPack.meta[MID] = msgId
          repPack.formatId = Buffer(repPack.formatId)
          var buf = wire.encode(repPack)
          send(stream, buf)
        }
        hub.onHubReq(hub.socket.streams, pack, reply)
        break
      case REP:
        hub.onHubRep(pack)
        break
      case INF:
        pack = hub.decode(buf)
        hub.onHubInf(pack, stream)
        break
    }
  })
}
