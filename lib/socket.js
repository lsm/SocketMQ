var util = require('util')
var Queue = require('./queue')
var Message = require('./message')
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

  this.on('stream error', function(err, stream) {
    console.log('stream error', err)
  })

  this.setMsgEncoder()
}

util.inherits(Socket, EventEmitter)

function send(stream, buf) {
  if (stream && stream.writable) {
    stream.write(buf)
  }
}

Socket.prototype.setMsgEncoder = function(encode, decode) {
  var type = typeof encode
  if (encode && 'function' !== type && 'object' === type) {
    // an encoder object
    decode = encode.decode || encode.unpack
    encode = encode.encode || encode.pack
  }

  if (!encode && !decode) {
    encode = Message.json.encodeMsg
    decode = Message.json.decodeMsg
  }

  this.encode = function(type, event, msg, id) {
    return wireEncode(encode, type, event, msg, id)
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

Socket.prototype.req = function(event, msg, callback) {
  var q = this.queue.req(this.streams, callback)
  var buf = this.encode(REQ, event, msg, q.id)
  send(q.stream, buf)
}

Socket.prototype.rep = function(event, callback) {
  this.queue.rep(event, callback)
}

Socket.prototype.onMessage = function(data, stream) {
  var decoded = this.decode(data)
  var type = decoded[0]
  var event = decoded[1]
  var msg = decoded[2]
  var inboxId = decoded[3]
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
