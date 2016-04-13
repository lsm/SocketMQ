var json = require('../message/json')
var Buffer = require('../message/type').Buffer
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

  if (!encodeMsg && !decodeMsg) {
    // Default using JSON encoder.
    encodeMsg = json.encodeMsg
    decodeMsg = json.decodeMsg
    formatId = Buffer(json.FORMAT_ID)
  }

  this.queue.encode = function(type, event, msg, meta) {
    return encode({
      type: type,
      event: event,
      formatId: formatId,
      msg: msg,
      meta: meta
    }, encodeMsg)
  }
  this.queue.decode = function(buf) {
    return decode(buf, decodeMsg)
  }
}
