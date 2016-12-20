var amp = require('amp')
var json = require('./json')
var type = require('./type')
var TYPES = type.TYPES
var Buffer = type.Buffer


exports.encode = function(pack) {
  var args = [TYPES[pack.type], Buffer(pack.event)]
  var metaIdx = 4

  if (pack.msg) {
    args[2] = pack.formatId
    args[3] = pack.msg
  } else {
    metaIdx = 2
  }

  if (pack.meta)
    args[metaIdx] = json.encodeMsg(pack.meta)

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
    formatId: args[2],
    // message data
    msg: args[3]
  }
  // message meta data
  var metaIdx = 4

  // message format id in string
  if (pack.msg) {
    pack.fid = pack.formatId.toString()
  } else {
    pack.formatId = undefined
    metaIdx = 2
  }

  if (args[metaIdx])
    pack.meta = json.decodeMsg(args[metaIdx])

  return pack
}

exports.StreamParser = amp.Stream
