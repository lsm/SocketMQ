var amp = require('amp')

exports.PUB = 'PUB'
exports.REQ = 'REQ'
exports.REP = 'REP'

var TYPES = exports.TYPES = {}
TYPES[exports.PUB] = Buffer(exports.PUB)
TYPES[exports.REQ] = Buffer(exports.REQ)
TYPES[exports.REP] = Buffer(exports.REP)

var jsonEncode = JSON.stringify
var jsonDecode = JSON.parse

exports.json = {
  encode: function(type, event, msg, id) {
    var args = [TYPES[type], Buffer(event)]

    if (msg) {
      args[2] = Buffer(jsonEncode(msg))
    }

    if (id) {
      args[3] = Buffer(id)
    }

    return amp.encode(args)
  },

  decode: function(buf) {
    var decoded = amp.decode(buf)

    // message type
    decoded[0] = decoded[0].toString()
    // event name
    decoded[1] = decoded[1].toString()

    // message if any
    if (decoded[2]) {
      decoded[2] = jsonDecode(decoded[2])
    }

    // message id
    if (decoded[3]) {
      decoded[3] = decoded[3].toString()
    }

    return decoded
  }
}

exports.encode = function(msgEncode, type, event, msg, id) {
  var args = [type, event]

  if (msg) {
    args[2] = msg
  }

  if (id) {
    args[3] = id
  }

  return amp.encode([msgEncode(args)])
}

exports.decode = function(msgDecode, buf) {
  var decoded = amp.decode(buf)
  if (decoded) {
    return msgDecode(decoded[0])
  } else {
    return null
  }
}

exports.StreamParser = amp.Stream
