var type = require('../message/type')
var PUB = type.PUB
var SUB = type.SUB

exports.pub = function(streams, pack) {
  pack.type = PUB
  this.all(streams, pack)
}

exports.sub = function(event, callback) {
  var inboxes = this[SUB][event]
  inboxes = inboxes || []
  inboxes.push(callback)
  this[SUB][event] = inboxes
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
