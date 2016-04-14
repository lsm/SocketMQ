var json = require('../message/json')
var Buffer = require('../message/type').Buffer
var Message = require('../message/index')

var encode = Message.encode
var decode = Message.decode

var formatId = Buffer(json.FORMAT_ID)
var encodeMsg = json.encodeMsg
var decodeMsg = json.decodeMsg


exports.encode = function(pack) {
  pack.formatId = formatId
  return encode(pack, encodeMsg)
}

exports.decode = function(buf) {
  return decode(buf, decodeMsg)
}
