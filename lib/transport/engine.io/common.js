var Duplex = require('stream').Duplex

exports.getDefaultOptions = function(options) {
  options = options || {}
  options.path = options.path || '/socketmq/engine.io'
  return options
}

exports.attachStream = function(smq, stream) {
  stream.on('close', function() {
    smq.close(stream)
  })
  stream.on('error', function(err) {
    smq.close(stream)
    smq.emit('streamError', err, stream)
  })
  smq.addStream(stream)
}

exports.createStream = function createStream(socket) {
  var stream = new Duplex({
    objectMode: true
  })

  if (socket.port) {
    // client side socket
    stream.remotePort = socket.port
    stream.remoteAddress = socket.hostname
  } else if (socket.request) {
    // server side connection socket
    stream.localPort = socket.request.connection.localPort
    // Use id as remotePort if we don't have that information
    var remotePort = socket.request.connection.remotePort
    stream.remotePort = remotePort || socket.id
    stream.headers = socket.request.headers
  }

  //
  // Stream methods
  //
  stream._read = function() {}
  stream._write = function(buf, encoding, next) {
    socket.send(buf)
    next()
  }
  var closing = false
  stream.end = function() {
    if (!closing) {
      closing = true
      socket.close()
    }
  }

  //
  // Stream events
  //
  stream.on('error', function() {
    if (!closing) {
      closing = true
      socket.close()
    }
  })
  stream.on('end', function() {
    if (!closing) {
      closing = true
      socket.close()
    }
  })

  //
  // Socket events
  //
  socket.on('message', function(buf) {
    stream.push(buf)
  })

  socket.on('close', function(hadError) {
    stream.push(null)
    stream.writable = false
    stream.emit('close', hadError)
    stream.emit('end')
    stream.end()
  })

  return stream
}