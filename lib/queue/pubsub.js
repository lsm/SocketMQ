var type = require('../message/type')
var PUB = type.PUB


exports.pub = function(streams, event, msg) {
  var len = streams.length
  if (0 === len)
    return this._pendings.push(['pub', streams, event, msg])

  var send = this.send
  var buf = this.encode(PUB, event, msg)
  while (len-- > 0) {
    send(streams[len], buf)
  }
}

exports.sub = function(event, callback) {
  var inbox = this.subInboxes[event]
  inbox = inbox || []
  inbox.push(callback)
  this.subInboxes[event] = inbox
}

exports.onPub = function(event, args) {
  var inbox = this.subInboxes[event]
  if (inbox) {
    var i = 0
    var len = inbox.length
    // Call each callback with args in inbox.
    while (i < len) {
      inbox[i++].apply(null, args)
    }
  }
}

exports._init = function(queue) {
  queue.subInboxes = {}
}
