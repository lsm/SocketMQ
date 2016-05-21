var common = require('../common')
var protocols = {
  tcp: require('ne' + 't'),
  tls: require('tl' + 's')
}


exports.bind = function(protocol, target, smq, options, callback) {
  var server = protocols[protocol].createServer(options, function(socket) {
    common.setupStream(smq, socket, callback, server, target)
  })
  server.listen(target.port, target.hostname)
  server.on('listening', smq.emit.bind(smq, 'bind'))
  return server
}

exports.connect = function(protocol, target, smq, options, callback) {
  var socket = protocols[protocol].connect(target.port, target.hostname, options)
  common.setupStream(smq, socket, callback)
  return socket
}
