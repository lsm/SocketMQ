var amp = require('amp')

exports.PUB = 'PUB'
exports.REQ = 'REQ'
exports.REP = 'REP'

var TYPES = exports.TYPES = {}
TYPES[exports.PUB] = Buffer(exports.PUB)
TYPES[exports.REQ] = Buffer(exports.REQ)
TYPES[exports.REP] = Buffer(exports.REP)

// Message format ids
var BUFFER = Buffer('b')
var STRING = Buffer('s')

exports.F_JSON = 'j'
exports.F_BUFFER = 'b'
exports.F_STRING = 's'
exports.F_MSGPACK = 'm'

var isBuffer = Buffer.isBuffer
var jsonEncode = JSON.stringify
var jsonDecode = JSON.parse

exports.json = {
  encodeMsg: function(msg) {
    return Buffer(jsonEncode(msg))
  },

  decodeMsg: function(buf) {
    return jsonDecode(buf)
  }
}

exports.encode = function(encodeMsg, type, event, formatId, msg, msgId) {
  var args = [TYPES[type], Buffer(event)]

  if ('string' === typeof msg) {
    args[2] = STRING
    args[3] = Buffer(msg)
  } else if (isBuffer(msg)) {
    args[2] = BUFFER
    args[3] = msg
  } else {
    args[2] = formatId
    args[3] = encodeMsg(msg)
  }

  if (msgId) {
    args[4] = Buffer(msgId)
  }

  return amp.encode(args)
}

exports.decode = function(decodeMsg, buf) {
  var decoded = amp.decode(buf)
  var result = {}

  // message type
  result.type = decoded[0].toString()
  // event name
  result.event = decoded[1].toString()
  // message format id
  result.formatId = decoded[2].toString()

  switch (result.formatId) {
    case exports.F_BUFFER:
      // Buffer, use value directly
      result.msg = decoded[3]
      break
    case exports.F_STRING:
      // string
      result.msg = decoded[3].toString()
      break
    default:
      // decode using the provided decoding function
      result.msg = decodeMsg(decoded[3])
  }

  // message id
  if (decoded[4]) {
    result.msgId = decoded[4].toString()
  }

  return result
}

exports.StreamParser = amp.Stream
