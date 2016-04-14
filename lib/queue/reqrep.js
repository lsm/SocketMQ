var type = require('../message/type')
var REQ = type.REQ
var REP = type.REP
var MID = type.MID


exports.req = function(streams, pack, callback) {
  var len = streams.length
  var stream = streams[this.n++ % len]
  if (!stream)
    return this.push(['req', streams, pack, callback])

  // Generate id for callback and save it in inbox.
  var msgId = '.' + this.n
  pack.type = REQ
  pack.meta = pack.meta || {}
  pack.meta[MID] = msgId
  var buf = this.encode(pack)
  this[REQ][msgId] = callback
  // send the buf to selected stream
  this.send(stream, buf)
}

exports.rep = function(event, repCallback) {
  this[REP][event] = repCallback
  this.ack(this.socket.streams)
}

exports.onReq = function(event, args) {
  var repCallback = this[REP][event]
  if (repCallback)
    repCallback.apply(null, args)
}

exports.onRep = function(event, args, msgId) {
  var cb = this[REQ][msgId]
  if (cb) {
    cb.apply(null, args)
    delete this[REQ][msgId]
  }
}
