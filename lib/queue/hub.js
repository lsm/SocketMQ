var util = require('util')
var type = require('../message/type')
var wire = require('../message/wire')
var Queue = require('./index')

var PUB = type.PUB
var REQ = type.REQ
var REP = type.REP


var Hub = module.exports = function QueueHub(socket) {
  Queue.call(this, socket)
}

util.inherits(Hub, Queue)

Hub.prototype.pub = function(streams, buf, excludedStream) {
  var len = streams.length
  if (0 === len || (1 === len && excludedStream === streams[0]))
    // No stream or only has one stream which is the excluded one.
    return this._pendings.push(['pub', streams, buf, excludedStream])

  var send = this.send
  while (len-- > 0) {
    var stream = streams[len]
    if (stream !== excludedStream)
      send(stream, buf)
  }
}


Hub.prototype.dispatch = function(buf, stream) {
  var pack = wire.decode(buf)
  var msgId = pack.msgId
  var msg = pack.msg

  switch (pack.type) {
    case PUB:
      this.pub(this.socket.streams, buf, stream)
      break
    case REQ:
      // Make reply function
      var send = this.send
      var encode = this.encode
      var reply = function(repMsg) {
        var len = arguments.length
        if (len > 1) {
          len--
          var i = 0
          repMsg = [repMsg]
          while (i++ < len) {
            repMsg[i] = arguments[i]
          }
        } else if ('string' !== typeof repMsg && !Buffer.isBuffer(repMsg)) {
          repMsg = [repMsg]
        }
        var buf = encode(REP, event, repMsg, msgId)
        send(stream, buf)
      }
      msg.push(reply)
      this.onReq(event, msg)
      break
    case REP:
      this.onRep(event, msg, msgId)
      break
  }
}
