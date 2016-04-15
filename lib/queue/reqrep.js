var type = require('../message/type')
var REQ = type.REQ
var REP = type.REP
var MID = type.MID


exports.req = function(streams, pack, callback) {
  if (callback) {
    // Generate id for callback and save it in inbox.
    var msgId = '.' + this.n++ + '.' + Math.random()
    pack.meta = pack.meta || {}
    pack.meta[MID] = msgId
    this[REQ][msgId] = callback
  }
  pack.type = REQ
  // Send to one stream
  this.one(streams, pack)
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
