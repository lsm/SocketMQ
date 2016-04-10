var Url = require('url')
var transport = require('../transport/index')
var StreamParser = require('../message/wire').StreamParser

/**
 * Transport & stream operations
 */

exports.send = function(stream, buf) {
  if (stream.writable)
    stream.write(buf)
  else
    this.emit('error', this.ERR_UNWRITABLE, stream)
}

exports.parseConnectionUri = function(uri) {
  var target = Url.parse(uri)
  var protocol = target.protocol.slice(0, -1)

  if (!transport[protocol]) {
    var err = 'Transport "' + protocol + '" is not supported. SocketMQ supports: ' + Object.keys(transport).join(', ')
    throw new Error(err)
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
  var endpoint = this.parseConnectionUri(uri)
  var client = endpoint.transport.connect(endpoint.target, this, options, cb)
  client.__smq_endpoint__ = uri
  this.tag(client, uri)
  return client
}

exports.bind = function(uri, options, cb) {
  if ('function' === typeof options) {
    cb = options
    options = null
  }
  var endpoint = this.parseConnectionUri(uri)
  var server = endpoint.transport.bind(endpoint.target, this, options, cb)
  server.__smq_endpoint__ = uri
  return server
}

exports.close = function(stream) {
  this.removeStream(stream)
  stream.destroy && stream.destroy()
}

exports.addStream = function(stream) {
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
  this.streams = this.streams.filter(function(s) {
    return stream !== s
  })
  this.emit('disconnect', stream)
}
