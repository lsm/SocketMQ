var amp = require('amp')

exports.PUB = 'PUB'
exports.REQ = 'REQ'
exports.REP = 'REP'

exports.B_PUB = new Buffer(exports.PUB)
exports.B_REQ = new Buffer(exports.REQ)
exports.B_REP = new Buffer(exports.REP)

exports.encode = function(msgEncode, type, event, msg, id) {
  var args = [type, new Buffer(event)]

  if (msg) {
    args[2] = msgEncode(msg)
  }

  if (id) {
    args[3] = new Buffer(id)
  }

  return amp.encode(args)
}
exports.decode = function(msgDecode, buf) {
  var decoded = amp.decode(buf)

  // message type
  decoded[0] = decoded[0].toString()
  // event name
  decoded[1] = decoded[1].toString()

  // message if any
  if (decoded[2]) {
    decoded[2] = msgDecode(decoded[2])
  }

  // message id
  if (decoded[3]) {
    decoded[3] = decoded[3].toString()
  }

  return decoded
}
exports.StreamParser = amp.Stream
