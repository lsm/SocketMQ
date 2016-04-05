var wire = require('./wire')
var type = require('./type')

var isBuffer = Buffer.isBuffer

/**
 * Encode a message packet into buffer
 *
 * @param  {Object} pack      The abstract packet object with message and meta data.
 *   {
 *     type: 'PUB',
 *     event: 'some event or topic or channel',
 *     msg: 'the real message data',
 *     msgId: '.12345'
 *   }
 * @param {String} [formatId] The format id of message encoder.
 * Optional when `msg` is String or Buffer.
 * @param  {Function} [encodeMsg] Message encoding function
 * @return {[type]}           [description]
 */
exports.encode = function(pack, formatId, encodeMsg) {
  var msg = pack.msg

  if ('string' === typeof msg) {
    formatId = type.STRING
    msg = Buffer(msg)
  } else if (isBuffer(msg)) {
    formatId = type.BUFFER
  } else {
    msg = encodeMsg(msg)
  }

  return wire.encode(pack.type, pack.event, formatId, msg, pack.msgId)
}

exports.decode = function(buf, decodeMsg) {
  var pack = wire.decode(buf)
  var msg = pack.msg

  switch (pack.formatId) {
    case type.F_BUFFER:
      // Buffer, use value directly
      break
    case type.F_STRING:
      // string
      pack.msg = msg.toString()
      break
    default:
      // decode using the provided decoding function
      pack.msg = decodeMsg(msg)
  }

  return pack
}
