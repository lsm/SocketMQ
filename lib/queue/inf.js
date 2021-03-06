var type = require('../message/type')

var INF = type.INF
var SUB = type.SUB
var REP = type.REP
var MNS = type.MNS
var MCH = type.MCH
var ACK = type.ACK


exports.inf = function(streams, pack) {
  pack.type = INF
  this.all(streams, pack)
}

exports.ack = function(streams) {
  var pack = this.getAckPack()
  streams = streams || this.socket.streams

  if (pack)
    this.inf(streams, pack)
}

exports.getAckPack = function() {
  var repEvents = Object.keys(this[REP])
  var subEvents = Object.keys(this[SUB])
  var msg = {}

  if (repEvents.length > 0)
    msg[REP] = repEvents
  if (subEvents.length > 0)
    msg[SUB] = subEvents

  var meta
  if (this.ns) {
    meta = {}
    meta[MNS] = this.ns
    if (this.chn)
      meta[MCH] = this.chn
  }

  if (msg[REP] || msg[SUB] || this.chn) {
    var pack = {
      event: ACK,
      msg: msg
    }
    if (meta)
      pack.meta = meta
    return pack
  }
}
