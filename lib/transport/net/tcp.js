var net = require('ne' + 't')
var common = require('../common')


exports.bind = function(target, smq, options, callback) {
  var server = net.createServer(function(socket) {
    common.setupStream(smq, socket, callback, server, target)
  })
  server.listen(target.port, target.hostname)
  server.on('listening', smq.emit.bind(smq, 'bind'))
  return server
}

exports.connect = function(target, smq, options, callback) {
  var socket = net.connect(target.port, target.hostname)
  common.setupStream(smq, socket, callback)
  return socket
}
