var wire = require('./wire')
var type = require('./type')
var Buffer = type.Buffer
var isBuffer = Buffer.isBuffer

/**
 * Encode a message packet into buffer
 *
 * @param  {Object} pack      The abstract packet object with message and meta data.
 *   {
 *     type: 'PUB',
 *     event: 'some event or topic or channel',
 *     formatId: 'j', // The format id of message encoder.
 *     msg: 'the real message data',
 *     msgId: '.12345'
 *   }
 * @param  {Function} [encodeMsg] Message encoding function
 * @return {Buffer}
 */
exports.encode = function(pack, encodeMsg) {
  var msg = pack.msg

  if ('string' === typeof msg) {
    pack.formatId = type.STRING
    pack.msg = Buffer(msg)
  } else if (isBuffer(msg)) {
    pack.formatId = type.BUFFER
  } else {
    pack.msg = encodeMsg(msg)
  }

  return wire.encode(pack)
}

exports.decode = function(buf, decodeMsg) {
  var pack = wire.decode(buf)
  var msg = pack.msg

  switch (pack.fid) {
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
