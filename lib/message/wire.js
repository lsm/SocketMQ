var amp = require('amp')
var json = require('./json')
var type = require('./type')
var TYPES = type.TYPES
var Buffer = type.Buffer


exports.encode = function(pack) {
  var args = [TYPES[pack.type], Buffer(pack.event), pack.formatId, pack.msg]

  if (pack.meta)
    args[4] = json.encodeMsg(pack.meta)

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
  // message meta data
  if (args[4])
    pack.meta = json.decodeMsg(args[4])
  return pack
}

exports.StreamParser = amp.Stream
