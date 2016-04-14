var type = require('../message/type')

var INF = type.INF
var SUB = type.SUB
var REP = type.REP
var MNS = type.MNS
var MCH = type.MCH
var ACK = type.ACK


exports.inf = function(streams, pack) {
  var len = streams.length
  if (0 === len)
    return this.push(['inf', streams, pack])

  pack.type = INF
  var send = this.send
  var buf = this.encode(pack)

  while (len-- > 0) {
    send(streams[len], buf)
  }
}

exports.ack = function(streams) {
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
    this.inf(streams, {
      event: ACK,
      msg: msg,
      meta: meta
    })
  }
}
