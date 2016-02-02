var amp = require('amp')

exports.PUB = 'PUB'
exports.REQ = 'REQ'
exports.REP = 'REP'

exports.B_PUB = new Buffer(exports.PUB)
exports.B_REQ = new Buffer(exports.REQ)
exports.B_REP = new Buffer(exports.REP)

exports.encode = function(type, event, msg, id) {
  var args = [type, new Buffer(event)]

  if (msg) {
    args.push(Buffer.isBuffer(msg) ? msg : new Buffer(msg))
  }

  if (id) {
    args.push(new Buffer(id))
  }

  return amp.encode(args)
}
exports.decode = function(buf) {
  var decoded = amp.decode(buf)

  // message type
  decoded[0] = decoded[0].toString()
  // event name
  decoded[1] = decoded[1].toString()

  // message if any
  if (decoded[2]) {
    decoded[2] = decoded[2].toString()
  }

  // message id
  if (decoded[3]) {
    decoded[3] = decoded[3].toString()
  }

  return decoded
}
exports.StreamParser = amp.Stream
