var Message = require('../message/index')

var encode = Message.encode
var decode = Message.decode

/**
 * Message operations
 */

exports.setMsgEncoder = function(encoder, formatId) {
  var encodeMsg
  var decodeMsg

  if ('object' === typeof encoder) {
    // an encoder object
    encodeMsg = encoder.encode || encoder.pack
    decodeMsg = encoder.decode || encoder.unpack
  }

  if (!encodeMsg || !decodeMsg)
    throw new Error('Missing either encode/pack or decode/unpack function.')

  this.queue.encode = function(pack) {
    pack.formatId = formatId
    return encode(pack, encodeMsg)
  }
  this.queue.decode = function(buf) {
    return decode(buf, decodeMsg)
  }
}
