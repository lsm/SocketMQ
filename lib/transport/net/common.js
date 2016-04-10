

exports.getOnConnectHandler = function(socket) {
  return function(sock, server, target) {
    if (server) {
      sock.__smq_endpoint__ = server.__smq_endpoint__
      sock.__smq_protocol__ = target.protocol
    }

    sock.setNoDelay(true)
    sock.setKeepAlive(true, 200)

    sock.on('close', function() {
      socket.close(sock)
    })

    sock.on('error', function(err) {
      socket.close(sock)
      socket.emit('streamError', err, sock)
    })

    socket.addStream(sock)
  }
}
