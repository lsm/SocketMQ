var eio = require('engine.io-client')
var common = require('./common')
var createStream = common.createStream
var attachStream = common.attachStream
var getDefaultOptions = common.getDefaultOptions


module.exports = function connect(target, smq, options, callback) {
  var uri = 'ws://' + target.hostname
  if (target.port)
    uri = uri + ':' + target.port

  options = getDefaultOptions(options)

  var socket = eio(uri, options)
  var stream = createStream(socket)

  socket.on('open', function() {
    attachStream(smq, stream)
    callback && callback(stream)
  })

  return stream
}
