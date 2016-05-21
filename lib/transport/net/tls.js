var tls = require('tl' + 's')
var common = require('../common')


exports.bind = function(target, smq, options, callback) {
  var server = tls.createServer(options, function(socket) {
    common.setupStream(smq, socket, callback, server, target)
  })
  server.listen(target.port, target.hostname)
  server.on('listening', smq.emit.bind(smq, 'bind'))
  return server
}

exports.connect = function(target, smq, options, callback) {
  var socket = tls.connect(target.port, target.hostname, options)
  common.setupStream(smq, socket, callback)
  return socket
}
