

exports.getOnConnectHandler = function(socket) {
  return function(sock) {
    sock.setNoDelay(true)
    sock.setKeepAlive(true, 200)

    sock.on('close', function() {
      socket.removeStream(sock)
      sock.destroy()
    })

    sock.on('error', function(err) {
      socket.removeStream(sock)
      socket.emit('stream error', err, sock)
      sock.destroy()
    })

    socket.addStream(sock)
  }
}
