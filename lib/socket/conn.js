var Url = require('url')
var transport = require('../transport/index')
var StreamParser = require('../message/wire').StreamParser

/**
 * Transport & stream operations
 */

exports.send = function(stream, buf) {
  if (stream.writable) {
    stream.write(buf)
  } else {
    this.close(stream, {
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
    var err = 'Transport "' + protocol + '" is not supported. SocketMQ supports: ' + Object.keys(transport).join(', ')
    throw new Error(err)
  }

  if (!target.port)
    target.port = 0

  if (!target.host) {
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
    options = {}
  }
  var endpoint = this.parseConnectionUri(uri)
  var client = endpoint.transport.connect(endpoint.target, this, options, cb)
  client.__smq__ = {
    tags: [],
    endpoint: uri,
    protocol: endpoint.protocol
  }
  this.tag(client, uri)
  return client
}

exports.bind = function(uri, options, cb) {
  if ('function' === typeof options) {
    cb = options
    options = {}
  }
  var endpoint = this.parseConnectionUri(uri)
  var server = endpoint.transport.bind(endpoint.target, this, options, cb)
  server.__smq__ = {
    endpoint: uri,
    protocol: endpoint.protocol
  }
  return server
}

exports.close = function(stream, error) {
  this.removeStream(stream)
  stream.destroy && stream.destroy()
  if (error)
    this.emit('error', error)
}

exports.addStream = function(stream) {
  if (-1 !== this.streams.indexOf(stream))
    return

  var parser = new StreamParser()
  stream.pipe(parser)

  var socket = this
  parser.on('data', function(data) {
    socket.emit('message', data, stream)
  })

  this.streams.push(stream)
  this.emit('connect', stream)
}

exports.removeStream = function(stream) {
  var streams = this.streams
  var idx = streams.indexOf(stream)
  if (idx >= 0) {
    streams.splice(idx, 1)
    this.emit('disconnect', stream)
    return true
  }
}
