var Url = require('url')
var util = require('util')
var Queue = require('./queue')
var Message = require('./message')
var transport = require('./transport')
var EventEmitter = require('events').EventEmitter

var wireEncode = Message.encode
var wireDecode = Message.decode

/**
 * Abstract socket class provides our user facing API.
 */
var Socket = module.exports = function() {
  EventEmitter.call(this)

  this.streams = []
  this.queue = new Queue(this)
  this.onMessage = this.queue.onMessage.bind(this.queue)

  this.setMsgEncoder()
}

Socket.ERR_TIMEOUT = Socket.prototype.ERR_TIMEOUT = 'timeout'
Socket.ERR_UNWRITABLE = Socket.prototype.ERR_UNWRITABLE = 'unwritable'
Socket.ERR_NO_TAGGED_STREAM = Socket.prototype.ERR_UNWRITABLE = 'no stream for tag'

util.inherits(Socket, EventEmitter)

/**
 * Message operations
 */

Socket.prototype.setMsgEncoder = function(encoder, formatId) {
  var encode
  var decode

  if ('object' === typeof encoder) {
    // an encoder object
    encode = encoder.encode || encoder.pack
    decode = encoder.decode || encoder.unpack
  }

  if (!encode && !decode) {
    // Default using JSON encoder.
    encode = Message.json.encodeMsg
    decode = Message.json.decodeMsg
    formatId = Buffer(Message.F_JSON)
  }

  this.queue.encode = function(type, event, msg, id) {
    return wireEncode(encode, type, event, formatId, msg, id)
  }
  this.queue.decode = function(buf) {
    return wireDecode(decode, buf)
  }
}

/**
 * Queue operations
 */

// pub/sub pair

Socket.prototype.pub = function(event, msg) {
  msg = getArgs(arguments, msg, 1, 1, 2)
  this.queue.pub(this.streams, event, msg)
}

Socket.prototype.pubTag = function(tag, event, msg) {
  msg = getArgs(arguments, msg, 2, 1, 3)
  var streams = filterStreamsWithTag(this.streams, tag)
  if (streams.length > 0)
    this.queue.pub(streams, event, msg)
  else
    this.emit('error', exports.ERR_NO_TAGGED_STREAM, tag, event, msg)
}

Socket.prototype.sub = function(event, callback) {
  this.queue.sub(event, callback)
}

// req/rep pair

Socket.prototype.req = function(event, msg, callback) {
  msg = getArgs(arguments, msg, 1, 2, 3)
  callback = arguments[arguments.length - 1]
  this.queue.req(this.streams, event, msg, callback)
}

Socket.prototype.reqTag = function(tag, event, msg, callback) {
  msg = getArgs(arguments, msg, 2, 2, 4)
  callback = arguments[arguments.length - 1]
  var streams = filterStreamsWithTag(this.streams, tag)
  if (streams.length > 0)
    this.queue.req(streams, event, msg, callback)
  else
    this.emit('error', exports.ERR_NO_TAGGED_STREAM, tag, event, msg)
}

Socket.prototype.rep = function(event, callback) {
  this.queue.rep(event, callback)
}

// Queue private functions

function getArgs(args, result, start, end, min) {
  var len = args.length
  if (min < len) {
    len -= end
    var i = start
    result = [result]
    while (i++ < len) {
      result[i - 1] = args[i]
    }
  }
  return result
}

function filterStreamsWithTag(streams, tag) {
  return streams.filter(function(stream) {
    return stream.__smq_tags__.indexOf(tag) > -1
  })
}

/**
 * Transport & stream operations
 */

Socket.prototype.send = function(stream, buf) {
  if (stream.writable)
    stream.write(buf)
  else
    this.emit('error', Socket.ERR_UNWRITABLE, stream)
}

Socket.prototype.parseConnectionUri = function(uri) {
  var target = Url.parse(uri)
  var protocol = target.protocol.slice(0, -1)

  if (!transport[protocol]) {
    var err = 'Transport "' + protocol + '" is not supported. SocketMQ supports: ' + Object.keys(transport).join(', ')
    throw new Error(err)
  }

  return {
    target: target,
    transport: transport[protocol]
  }
}

Socket.prototype.connect = function(uri, options) {
  var endpoint = this.parseConnectionUri(uri)
  return endpoint.transport.connect(endpoint.target, this, options)
}

Socket.prototype.bind = function(uri, options) {
  var endpoint = this.parseConnectionUri(uri)
  return endpoint.transport.bind(endpoint.target, this, options)
}

Socket.prototype.close = function(sock) {
  this.removeStream(sock)
  sock.destroy && sock.destroy()
}

Socket.prototype.addStream = function(stream) {
  var parser = new Message.StreamParser()
  stream.pipe(parser)
  var onMessage = this.onMessage

  parser.on('data', function(data) {
    onMessage(data, stream)
  })

  // Add remoteAddress as default tag if exists
  stream.__smq_tags__ = []
  if (stream.remoteAddress)
    stream.__smq_tags__.push(stream.remoteAddress)

  this.streams.push(stream)
  this.emit('connect', stream)
}

Socket.prototype.removeStream = function(stream) {
  this.streams = this.streams.filter(function(s) {
    return stream !== s
  })
  this.emit('disconnect', stream)
}
