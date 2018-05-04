var Duplex = require('stream').Duplex
var Buffer = require('../../message/type').Buffer

exports.getDefaultOptions = function(options) {
  options = options || {}
  options.path = options.path || '/socketmq/engine.io'
  return options
}

exports.createStream = function createStream(eioSocket) {
  var stream = new Duplex({
    objectMode: true
  })

  if (eioSocket.port) {
    // client side socket
    stream.remotePort = eioSocket.port
    stream.remoteAddress = eioSocket.hostname
  } else if (eioSocket.request) {
    // server side connection socket
    stream.id = getSocketID(eioSocket.id)
    stream.socket = eioSocket
    stream.headers = eioSocket.request.headers
    stream.localPort = eioSocket.request.connection.localPort
    // Use id as remotePort if we don't have that information
    stream.remotePort = eioSocket.request.connection.remotePort || eioSocket.id
  }

  //
  // Stream methods
  //

  stream._read = function() {}

  stream._write = function(buf, encoding, next) {
    eioSocket.send(buf)
    next()
  }

  var closing = false
  var destroy = function(err) {
    if (!closing && eioSocket.readyState !== 'closed') {
      closing = true
      eioSocket.close(err)
    }
  }

  if (stream.destroy) {
    stream._destroy = destroy
  } else {
    stream.destroy = destroy
  }

  //
  // Socket events
  //

  // `open` event is only for client side
  eioSocket.on('open', function() {
    stream.emit('connect')
  })

  eioSocket.on('message', function(buf) {
    // Might be an ArrayBuffer in browser
    if (buf && !Buffer.isBuffer(buf) && 'undefined' !== typeof buf.byteLength) {
      buf = new Buffer(buf)
    }
    stream.push(buf)
  })

  eioSocket.once('close', function(reason, desc) {
    stream.push(null)
    stream.writable = false
    stream.emit('close')
  })

  eioSocket.once('error', function(err) {
    if (err && err.description === 400) {
      if (stream.reconnector) {
        stream.reconnector.reconnect = false
      }
    }
    stream.emit('error', err)
  })

  return stream
}

/**
 * Private function for generating random server side stream id.
 */
function getSocketID(seed) {
  var crypto = require('cry' + 'pto')
  var rnd = crypto.randomBytes(128)
  return crypto
    .createHash('sha256')
    .update(rnd)
    .update(seed)
    .update(String(Math.random()))
    .digest('base64')
}
