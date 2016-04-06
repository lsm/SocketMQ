

exports.getOnConnectHandler = function(socket) {
  return function(sock, server) {
    if (server)
      sock.__smq_endpoint__ = server.__smq_endpoint__

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
