var json = require('../message/json')
var Buffer = require('../message/type').Buffer
var Message = require('../message/index')

var encode = Message.encode
var decode = Message.decode

var formatId = Buffer(json.FORMAT_ID)
var encodeMsg = json.encodeMsg
var decodeMsg = json.decodeMsg


exports.encode = function(type, event, msg, meta) {
  return encode({
    type: type,
    event: event,
    formatId: formatId,
    msg: msg,
    meta: meta
  }, encodeMsg)
}

exports.decode = function(buf) {
  return decode(buf, decodeMsg)
}
