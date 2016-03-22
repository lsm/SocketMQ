var tls = require('tls')
var common = require('./common')


exports.bind = function(target, socket, options, callback) {
  var handler = common.getOnConnectHandler(socket)
  var server = tls.createServer(options, function(sock) {
    callback && callback(sock)
    handler(sock)
  })
  server.listen(target.port, target.hostname)
  server.on('listening', socket.emit.bind(socket, 'bind'))

  return server
}

exports.connect = function(target, socket, options, callback) {
  var handler = common.getOnConnectHandler(socket)
  var sock = tls.connect(target.port, target.hostname, options, function() {
    callback && callback(sock)
    handler(sock)
  })

  return sock
}
