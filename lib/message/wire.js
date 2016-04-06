var amp = require('amp')
var type = require('./type')
var TYPES = type.TYPES
var Buffer = type.Buffer

exports.encode = function(pack) {
  var args = [TYPES[pack.type], Buffer(pack.event), pack.formatId, pack.msg]

  if (pack.msgId)
    args[4] = Buffer(pack.msgId)

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
