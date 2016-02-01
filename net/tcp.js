var net = require('net')
var common = require('./common')


exports.bind = function(target, socket) {
  var handler = common.getOnConnectHandler(socket)
  var server = net.createServer(handler)
  server.listen(target.port, target.hostname)
  server.on('listening', socket.emit.bind(socket, 'bind'));

  return server
}

exports.connect = function(target, socket) {
  var sock = new net.Socket()
  var handler = common.getOnConnectHandler(socket)
  sock.connect(target.port, target.hostname, function() {
    handler(sock)
  })

  return sock
}
