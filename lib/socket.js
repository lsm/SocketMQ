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

util.inherits(Socket, EventEmitter)

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

Socket.prototype.send = function(stream, buf) {
  if (stream.writable)
    stream.write(buf)
  else
    this.emit('error', Socket.ERR_UNWRITABLE, stream)
}

Socket.prototype.pub = function(event, msg) {
  var len = arguments.length
  if (2 < len) {
    len--
    var i = 1
    msg = [msg]
    while (i++ < len) {
      msg[i - 1] = arguments[i]
    }
  }
  this.queue.pub(event, msg)
}

Socket.prototype.sub = function(event, callback) {
  this.queue.sub(event, callback)
}

Socket.prototype.req = function(event, msg, callback) {
  var len = arguments.length
  if (3 < len) {
    len -= 2
    var i = 1
    msg = [msg]
    while (i++ < len) {
      msg[i - 1] = arguments[i]
    }
    callback = arguments[i]
  }
  this.queue.req(event, msg, callback)
}

Socket.prototype.rep = function(event, callback) {
  this.queue.rep(event, callback)
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

  this.streams.push(stream)
  this.emit('connect', stream)
}

Socket.prototype.removeStream = function(stream) {
  this.streams = this.streams.filter(function(s) {
    return stream !== s
  })
  this.emit('disconnect', stream)
}
