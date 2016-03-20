

exports.getOnConnectHandler = function(socket) {
  return function(sock) {
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
