var Url = require('url')
var util = require('util')
var Queue = require('./queue')
var Message = require('./message')
var transport = require('./transport')
var EventEmitter = require('events').EventEmitter

var PUB = Message.PUB
var REQ = Message.REQ
var REP = Message.REP

var wireEncode = Message.encode
var wireDecode = Message.decode

/**
 * Abstract socket class provides our user facing API.
 */
var Socket = module.exports = function() {
  EventEmitter.call(this)

  this.streams = []
  this.queue = new Queue()
  this.onMessage = this.onMessage.bind(this)

  this.setMsgEncoder()
}

Socket.ERR_TIMEOUT = Socket.prototype.ERR_TIMEOUT = -1

util.inherits(Socket, EventEmitter)

function send(stream, buf) {
  if (stream && stream.writable) {
    stream.write(buf)
  }
}

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
    formatId = Message.JSON
  }

  this.encode = function(type, event, msg, id) {
    return wireEncode(encode, type, event, formatId, msg, id)
  }
  this.decode = function(buf) {
    return wireDecode(decode, buf)
  }
}

Socket.prototype.pub = function(event, msg) {
  var buf = this.encode(PUB, event, msg)
  this.queue.pub(send, this.streams, buf)
}

Socket.prototype.sub = function(event, callback) {
  this.queue.sub(event, callback)
}

Socket.prototype.req = function(event, msg, callback, errback) {
  var queue = this.queue
  var que = queue.req(this.streams, callback)
  var buf = this.encode(REQ, event, msg, que.msgId)
  var smq = this

  // Handle timeout
  setTimeout(function() {
    if (queue.waitingForRep(que.msgId)) {
      que.stream.__timeoutCount = (que.stream.__timeoutCount || 0) + 1
      if (que.stream.__timeoutCount > 3) {
        smq.close(que.stream)
      }
      queue.removeReqInbox(que.msgId)
      errback && errback(Socket.ERR_TIMEOUT)
    }
  }, 2000)

  send(que.stream, buf)
}

Socket.prototype.rep = function(event, callback) {
  this.queue.rep(event, callback)
}

Socket.prototype.onMessage = function(data, stream) {
  var decoded = this.decode(data)
  var type = decoded[0]
  var event = decoded[1]
  var msg = decoded[3]
  var inboxId = decoded[4]
  var queue = this.queue

  switch (type) {
    case PUB:
      queue.onPub(event, msg)
      break
    case REQ:
      // Make reply function
      var encode = this.encode
      var reply = function(msg) {
        var buf = encode(REP, event, msg, inboxId)
        send(stream, buf)
      }
      queue.onReq(event, msg, reply)
      break
    case REP:
      queue.onRep(event, msg, inboxId)
      break
  }
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
