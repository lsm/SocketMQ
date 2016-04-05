var util = require('util')
var type = require('../message/type')
var wire = require('../message/wire')
var Queue = require('./index')

var PUB = type.PUB
var REQ = type.REQ
var REP = type.REP
var INF = type.INF


var Hub = module.exports = function QueueHub(socket) {
  Queue.call(this, socket)
}

util.inherits(Hub, Queue)

Hub.prototype.onHubPub = function(streams, buf, excludedStream) {
  var len = streams.length
  if (0 === len || (1 === len && excludedStream === streams[0]))
    // No stream or only has one stream which is the excluded one.
    return this._pendings.push(['onHubPub', streams, buf, excludedStream])

  var send = this.send
  while (len-- > 0) {
    var stream = streams[len]
    if (stream !== excludedStream)
      send(stream, buf)
  }
}

Hub.prototype.onHubReq = function(pack, reply) {
  var streams = this.socket.getStreamsByTag(pack.event)
  var len = streams.length
  var stream = streams[this.n++ % len]
  if (!stream)
    return this._pendings.push(['onHubReq', pack, reply])

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
  if (REP === pack.event)
    // An info message tells what REQ event the stream will respond
    this.socket.tag(stream, pack.msg)
}

Hub.prototype.dispatch = function(buf, stream) {
  var pack = wire.decode(buf)
  var msgId = pack.msgId

  switch (pack.type) {
    case PUB:
      this.onHubPub(this.socket.streams, buf, stream)
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
      this.onHubReq(pack, reply)
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
