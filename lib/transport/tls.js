var tls = require('tls')
var common = require('./common')


exports.bind = function(target, socket, options) {
  var handler = common.getOnConnectHandler(socket)
  var server = tls.createServer(options, function(sock) {
    console.log('server connected',
      sock.authorized ? 'authorized' : 'unauthorized');
    handler(sock)
  })
  server.listen(target.port, target.hostname)
  server.on('listening', socket.emit.bind(socket, 'bind'));

  return server
}

exports.connect = function(target, socket, options) {
  var handler = common.getOnConnectHandler(socket)
  var sock = tls.connect(target.port, target.hostname, options, function() {
    console.log('client connected',
      sock.authorized ? 'authorized' : 'unauthorized');
    handler(sock)
  })

  return sock
}
