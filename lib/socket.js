var util = require('util')
var Queue = require('./queue')
var Message = require('./Message')
var EventEmitter = require('events').EventEmitter

var PUB = Message.PUB
var REQ = Message.REQ
var REP = Message.REP

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
}

util.inherits(Socket, EventEmitter)

function send(stream, buf) {
  if (stream && stream.writable) {
    stream.write(buf)
  }
}

Socket.prototype.pub = function(event, msg) {
  var buf = Message.encode(PUB, event, msg)
  this.queue.pub(send, this.streams, buf)
}

Socket.prototype.sub = function(event, callback) {
  this.queue.sub(event, callback)
}

Socket.prototype.req = function(event, msg, callback) {
  var q = this.queue.req(this.streams, callback)
  var buf = Message.encode(REQ, event, msg, q.id)
  send(q.stream, buf)
}

Socket.prototype.rep = function(event, callback) {
  this.queue.rep(event, callback)
}

Socket.prototype.onMessage = function(data, stream) {
  var decoded = Message.decode(data)
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
      var reply = function(msg) {
        var buf = Message.encode(REP, event, msg, inboxId)
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
  var idx = this.streams.indexOf(stream)
  delete this.streams[idx]
  this.emit('disconnect', stream)
}
