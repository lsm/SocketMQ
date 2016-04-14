var type = require('../message/type')
var PUB = type.PUB
var SUB = type.SUB

exports.pub = function(streams, pack) {
  var len = streams.length
  if (0 === len)
    return this.push(['pub', streams, pack])

  pack.type = PUB
  var send = this.send
  var buf = this.encode(pack)

  while (len-- > 0) {
    send(streams[len], buf)
  }
}

exports.sub = function(event, callback) {
  var inboxes = this[SUB][event]
  inboxes = inboxes || []
  inboxes.push(callback)
  this[SUB][event] = inboxes
  this.ack(this.socket.streams)
}

exports.onPub = function(event, args) {
  var inboxes = this[SUB][event]
  if (inboxes) {
    var i = 0
    var len = inboxes.length
    // Call each callback with args in inboxes.
    while (i < len) {
      inboxes[i++].apply(null, args)
    }
  }
}
