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


var Hub = module.exports = function QueueHub(socket) {
  Queue.call(this, socket)
}

inherits(Hub, Queue)

Hub.prototype.onHubPub = function(streams, pack, buf, excludedStream) {
  var tag = this.prefixInfTags(SUB, pack.event)
  var _streams = this.socket.getStreamsByTag(tag, streams)
  var len = _streams.length
  if (0 === len || (1 === len && excludedStream === _streams[0]))
    // No stream or only has one stream which is the excluded one.
    return this._pendings.push(['onHubPub', streams, pack, buf, excludedStream])

  var send = this.send
  while (len-- > 0) {
    var stream = _streams[len]
    if (stream !== excludedStream)
      send(stream, buf)
  }
}

Hub.prototype.onHubReq = function(streams, pack, reply) {
  var tag = this.prefixInfTags(REP, pack.event)
  var _streams = this.socket.getStreamsByTag(tag, streams)
  var len = _streams.length
  var stream = _streams[this.n++ % len]
  if (!stream)
    return this._pendings.push(['onHubReq', streams, pack, reply])

  // Generate id for callback and save it in inbox.
  pack.msgId += '.' + this.n
  pack.formatId = Buffer(pack.formatId)
  var buf = wire.encode(pack)
  this.reqInbox[pack.msgId] = {
    cb: reply
  }
  // send the buf to selected stream
  this.send(stream, buf)
}

Hub.prototype.onHubRep = function(pack) {
  var msgId = pack.msgId
  var inbox = this.reqInbox[msgId]
  if (inbox) {
    inbox.cb(pack)
    delete this.reqInbox[msgId]
  }
}

Hub.prototype.onHubInf = function(pack, stream) {
  switch (pack.event) {
    case REP:
    case SUB:
      // An info message tells what REQ/PUB event the stream will respond to.
      var tags = this.prefixInfTags(pack.event, pack.msg)
      this.socket.tag(stream, tags)
      this._flush()
      break
  }
}

Hub.prototype.prefixInfTags = function(type, tags) {
  function prefix(tag) {
    return type + '::' + tag
  }
  if ('string' === typeof tags) {
    return prefix(tags)
  } else if (Array.isArray(tags)) {
    return tags.map(prefix)
  }
}

Hub.prototype.dispatch = function(buf, stream) {
  var pack = wire.decode(buf)
  var msgId = pack.msgId

  switch (pack.type) {
    case PUB:
      this.onHubPub(this.socket.streams, pack, buf, stream)
      break
    case REQ:
      // Make reply function
      var send = this.send
      var reply = function(repPack) {
        repPack.msgId = msgId
        repPack.formatId = Buffer(repPack.formatId)
        var buf = wire.encode(repPack)
        send(stream, buf)
      }
      this.onHubReq(this.socket.streams, pack, reply)
      break
    case REP:
      this.onHubRep(pack)
      break
    case INF:
      pack = this.decode(buf)
      this.onHubInf(pack, stream)
      break
  }
}
