var net = require('net')

function getLifecycleHandlers(socket) {
  return function(sock) {
    sock.setNoDelay(true)

    sock.on('close', function() {
      socket.removeStream(sock)
      sock.destroy()
    })

    sock.on('error', function(err) {
      socket.removeStream(sock)
      socket.emit('stream error', err, sock)
      sock.destroy()
    })

    if (sock.server) {
      // Sock connected to server, add to stream directly.
      socket.addStream(sock)
    } else {
      sock.on('connect', function() {
        socket.addStream(sock)
      })
    }
  }
}

exports.bind = function(target, socket, options) {
  var handler = getLifecycleHandlers(socket)
  var server = net.createServer(handler)
  server.listen(target.port, target.hostname)
  server.on('listening', socket.emit.bind(socket, 'bind'));
  return server
}

exports.connect = function(target, socket, options) {
  var handler = getLifecycleHandlers(socket)
  var sock = net.createConnection(target.port, target.hostname)
  handler(sock)
  return sock
}
