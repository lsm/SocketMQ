var Url = require('url')
var util = require('util')
var StreamParser = require('../message/wire').StreamParser
var Queue = require('../queue')
var Message = require('../message')
var json = require('../message/json')
var transport = require('../transport')
var EventEmitter = require('eventemitter3')

var encode = Message.encode
var decode = Message.decode

/**
 * Abstract socket class provides our user facing API.
 */
var Socket = module.exports = function() {
  this.streams = []
  this.queue = new Queue(this)
  this.onMessage = this.queue.dispatch.bind(this.queue)

  this.setMsgEncoder()
}

util.inherits(Socket, EventEmitter)

Socket.ERR_TIMEOUT = Socket.prototype.ERR_TIMEOUT = 'timeout'
Socket.ERR_UNWRITABLE = Socket.prototype.ERR_UNWRITABLE = 'unwritable'
Socket.ERR_NO_TAGGED_STREAM = Socket.prototype.ERR_NO_TAGGED_STREAM = 'no stream for tag'

/**
 * Message operations
 */

Socket.prototype.setMsgEncoder = function(encoder, formatId) {
  var encodeMsg
  var decodeMsg

  if ('object' === typeof encoder) {
    // an encoder object
    encodeMsg = encoder.encode || encoder.pack
    decodeMsg = encoder.decode || encoder.unpack
  }

  if (!encodeMsg && !decodeMsg) {
    // Default using JSON encoder.
    encodeMsg = json.encodeMsg
    decodeMsg = json.decodeMsg
    formatId = Buffer(json.FORMAT_ID)
  }

  this.queue.encode = function(type, event, msg, id) {
    return encode({
      type: type,
      event: event,
      msg: msg,
      msgId: id
    }, formatId, encodeMsg)
  }
  this.queue.decode = function(buf) {
    return decode(buf, decodeMsg)
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
  var streams = this.getStreamsByTag(tag)
  if (streams.length > 0)
    this.queue.pub(streams, event, msg)
  else
    this.emit('error', Socket.ERR_NO_TAGGED_STREAM, tag, event, msg)

  if (streams.length === 0) {
    console.log('err %s, %s, %s', tag, event, msg);
  }
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
  var streams = this.getStreamsByTag(tag)
  if (streams.length > 0)
    this.queue.req(streams, event, msg, callback)
  else
    this.emit('error', Socket.ERR_NO_TAGGED_STREAM, tag, event, msg)
}

Socket.prototype.rep = function(event, callback) {
  this.queue.rep(event, callback)
}

// Queue private functions

function getArgs(args, result, start, endOffset, min) {
  var len = args.length
  if (min < len) {
    len -= endOffset
    var i = start
    result = [result]
    while (i++ < len) {
      result[i - start] = args[i]
    }
  } else if ('string' !== typeof result && !Buffer.isBuffer(result)) {
    result = [result]
  }
  return result
}

/**
 * Tagging support
 */

Socket.prototype.tag = function(stream, tags) {
  var streams

  if ('string' === typeof stream) {
    streams = this.getStreamsByEndpoint(stream)
    if (0 === streams.length)
      return false
  } else {
    streams = [stream]
  }

  if (!Array.isArray(tags))
    tags = [tags]

  var result = 0
  streams.forEach(function(stream) {
    tags.forEach(function(tag) {
      result += addTag(tag, stream)
    })
  })

  return result
}

Socket.prototype.hasTag = function(tag) {
  return this.streams.some(function(stream) {
    return stream.__smq_tags__.indexOf(tag) > -1
  })
}

Socket.prototype.getStreamsByTag = function(tag) {
  return this.streams.filter(function(stream) {
    var tags = stream.__smq_tags__
    return Array.isArray(tags)
      && tags.indexOf(tag) > -1
  })
}

Socket.prototype.getStreamsByEndpoint = function(endpoint) {
  return this.streams.filter(function(stream) {
    return endpoint === stream.__smq_endpoint__
  })
}

Socket.prototype.hasConnection = function(endpoint) {
  return this.getStreamsByEndpoint(endpoint).length > 0
}

// Tagging private functions

function addTag(tag, stream) {
  var added = 0
  var _tags = stream.__smq_tags__ || []
  if (-1 === _tags.indexOf(tag)) {
    _tags.push(tag)
    added = 1
  }
  stream.__smq_tags__ = _tags
  return added
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
    protocol: protocol,
    transport: transport[protocol]
  }
}

Socket.prototype.connect = function(uri, options, cb) {
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

Socket.prototype.bind = function(uri, options, cb) {
  if ('function' === typeof options) {
    cb = options
    options = null
  }
  var endpoint = this.parseConnectionUri(uri)
  var server = endpoint.transport.bind(endpoint.target, this, options, cb)
  server.__smq_endpoint__ = uri
  return server
}

Socket.prototype.close = function(stream) {
  this.removeStream(stream)
  stream.destroy && stream.destroy()
}

Socket.prototype.addStream = function(stream) {
  var parser = new StreamParser()
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
