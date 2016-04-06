var Buffer = require('./type').Buffer
var jsonEncode = JSON.stringify
var jsonDecode = JSON.parse

exports.FORMAT_ID = 'j'

exports.encodeMsg = function(msg) {
  return Buffer(jsonEncode(msg))
},

exports.decodeMsg = function(buf) {
  return jsonDecode(buf)
}
