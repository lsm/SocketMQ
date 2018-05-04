var Url = require('url')
var transport = require('../transport/index')
var StreamParser = require('../message/wire').StreamParser
var makeReconnector = require('reconnect-core')

/**
 * Transport & stream operations
 */

exports.send = function(stream, buf) {
  if (stream.writable) {
    stream.write(buf)
  } else {
    this.removeStream(stream, {
      data: buf,
      type: this.ERR_UNWRITABLE,
      stream: stream
    })
  }
}

exports.parseConnectionUri = function(uri) {
  var target = Url.parse(uri)
  var protocol = target.protocol.slice(0, -1)

  if (!transport[protocol]) {
    var err =
      'Transport "' +
      protocol +
      '" is not supported. SocketMQ supports: ' +
      Object.keys(transport).join(', ')
    throw new Error(err)
  }

  if (!target.port) {
    target.port = 0
  }

  if (!target.host && 'eio' !== protocol) {
    target.hostname = '127.0.0.1'
    target.host = '127.0.0.1' + (target.port ? ':' + target.port : '')
  }

  return {
    target: target,
    protocol: protocol,
    transport: transport[protocol]
  }
}

exports.connect = function(uri, options, cb) {
  if ('function' === typeof options) {
    cb = options
    options = null
  }
  if (!options) {
    options = {}
  }

  if (options.reconnect === true) {
    // Default reconnect option while `reconnect` is true.
    options.reconnect = {
      strategy: 'fibonacci',
      maxDelay: 60e3,
      initialDelay: 1e3,
      failAfter: Infinity,
      immediate: false,
      randomisationFactor: 0
    }
  }

  var smq = this
  var endpoint = this.parseConnectionUri(uri)
  var connect = function() {
    var client = endpoint.transport.connect(endpoint.target, smq, options, cb)
    client.__smq__ = {
      tags: [],
      endpoint: uri,
      protocol: endpoint.protocol
    }
    return client
  }

  if (options.reconnect) {
    var _reconnect = makeReconnector(connect)
    connect = function() {
      return (
        _reconnect(options.reconnect)
          // We can safely ignore this error as the `smq` instance will always
          // get the error event.
          .on('error', function() {})
          .on('connect', function(client) {
            client.reconnector = this
          })
          .on('reconnect', function(n, delay) {
            // Simplely emit reconnect event through `smq` when it's a real
            // reconnection.
            if (n > 0 || delay > 0) {
              smq.emit('reconnect', n, delay)
            }
          })
          .connect()._connection
      )
    }
  }

  var client = connect()
  this.tag(client, uri)
  return client
}

exports.bind = function(uri, options, cb) {
  if ('function' === typeof options) {
    cb = options
    options = null
  }
  var endpoint = this.parseConnectionUri(uri)
  var server = endpoint.transport.bind(endpoint.target, this, options || {}, cb)
  server.__smq__ = {
    endpoint: uri,
    protocol: endpoint.protocol
  }
  return server
}

exports.addStream = function(stream) {
  if (-1 !== this.streams.indexOf(stream)) {
    return
  }

  var parser = new StreamParser()
  stream.pipe(parser)

  var socket = this
  parser.on('data', function(data) {
    socket.emit('message', data, stream)
  })

  this.streams.push(stream)
  this.emit('connect', stream)
}

exports.removeStream = function(stream, error) {
  if (error) {
    this.emit('error', error)
  }
  var streams = this.streams
  var idx = streams.indexOf(stream)
  if (idx > -1) {
    streams.splice(idx, 1)
    this.emit('disconnect', stream)
  }
  stream.destroy && stream.destroy(error)
}
