var amp = require('amp')

exports.PUB = 'PUB'
exports.REQ = 'REQ'
exports.REP = 'REP'

var TYPES = exports.TYPES = {}
TYPES[exports.PUB] = Buffer(exports.PUB)
TYPES[exports.REQ] = Buffer(exports.REQ)
TYPES[exports.REP] = Buffer(exports.REP)

// Message format ids
const BUFFER = exports.BUFFER = Buffer('b')
const STRING = exports.STRING = Buffer('s')
exports.JSON = Buffer('j')

const isBuffer = Buffer.isBuffer

const jsonEncode = JSON.stringify
const jsonDecode = JSON.parse

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

  // message type
  decoded[0] = decoded[0].toString()
  // event name
  decoded[1] = decoded[1].toString()
  // message format id
  decoded[2] = decoded[2].toString()

  // decoded[2] is formatId
  switch (decoded[2]) {
    case 'b':
      // buffer, do nothing
      break
    case 's':
      // string
      decoded[3] = decoded[3].toString()
      break
    default:
      // decode using the provided decoding function
      decoded[3] = decodeMsg(decoded[3])
  }

  // message id
  if (decoded[4]) {
    decoded[4] = decoded[4].toString()
  }

  return decoded
}

exports.StreamParser = amp.Stream
