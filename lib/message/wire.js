var amp = require('amp')
var TYPES = require('./type').TYPES


exports.encode = function(type, event, formatId, buf, msgId) {
  var args = [TYPES[type], Buffer(event), formatId, buf]

  if (msgId)
    args[4] = Buffer(msgId)

  return amp.encode(args)
}

exports.decode = function(buf) {
  var args = amp.decode(buf)
  var pack = {
    // message type
    type: args[0].toString(),
    // event name
    event: args[1].toString(),
    // message format id
    formatId: args[2].toString(),
    // message data
    msg: args[3]
  }
  // message id
  if (args[4])
    pack.msgId = args[4].toString()
  return pack
}

exports.StreamParser = amp.Stream