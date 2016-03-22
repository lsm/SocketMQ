var Message = require('./message')

var PUB = Message.PUB
var REQ = Message.REQ
var REP = Message.REP


var Queue = module.exports = function(socket) {
  this.n = 0
  this.send = socket.send.bind(socket)
  this.socket = socket
  this.reqInbox = {}
  this.repInbox = {}
  this.subInboxes = {}
  this.pendingReqs = []
  this.pendingPubs = []

  // Listen connect event and flush pending messages
  socket.on('connect', this._flush.bind(this))
}

Queue.prototype.pub = function(streams, event, msg) {
  var len = streams.length
  if (0 === len)
    return this.pendingPubs.push([streams, event, msg])

  var send = this.send
  var buf = this.encode(PUB, event, msg)
  while (len-- > 0) {
    send(streams[len], buf)
  }
}

Queue.prototype.sub = function(event, callback) {
  var inbox = this.subInboxes[event]
  inbox = inbox || []
  inbox.push(callback)
  this.subInboxes[event] = inbox
}

Queue.prototype.onPub = function(event, args) {
  var inbox = this.subInboxes[event]
  if (inbox) {
    var i = 0
    var len = inbox.length
    // Call each callback with args in inbox.
    while (i < len) {
      inbox[i++].apply(null, args)
    }
  }
}

Queue.prototype.req = function(streams, event, msg, callback) {
  var len = streams.length
  var stream = streams[this.n++ % len]
  if (!stream)
    return this.pendingReqs.push([streams, event, msg, callback])

  // Generate id for callback and save it in inbox.
  var msgId = '.' + this.n
  var buf = this.encode(REQ, event, msg, msgId)
  this.reqInbox[msgId] = {
    cb: callback
  }
  // send the buf to selected stream
  this.send(stream, buf)
}

Queue.prototype.waitingForRep = function(msgId) {
  return this.reqInbox.hasOwnProperty(msgId)
}

Queue.prototype.removeReqInbox = function(msgId) {
  delete this.reqInbox[msgId]
}

Queue.prototype.rep = function(event, repCallback) {
  this.repInbox[event] = repCallback
}

Queue.prototype.onReq = function(event, args) {
  var repCallback = this.repInbox[event]
  if (repCallback)
    repCallback.apply(null, args)
}

Queue.prototype.onRep = function(event, msg, msgId) {
  var inbox = this.reqInbox[msgId]
  if (inbox) {
    inbox.cb.apply(null, msg)
    this.removeReqInbox(msgId)
  }
}

Queue.prototype.onMessage = function(data, stream) {
  var decoded = this.decode(data)
  var msg = decoded.msg
  var event = decoded.event
  var msgId = decoded.msgId
  var formatId = decoded.formatId

  if (formatId === Message.F_BUFFER || formatId === Message.F_STRING)
    msg = [msg]

  switch (decoded.type) {
    case PUB:
      this.onPub(event, msg)
      break
    case REQ:
      // Make reply function
      var send = this.send
      var encode = this.encode
      var reply = function(repMsg) {
        var len = arguments.length
        if (len > 1) {
          len--
          var i = 0
          repMsg = [repMsg]
          while (i++ < len) {
            repMsg[i] = arguments[i]
          }
        }
        var buf = encode(REP, event, repMsg, msgId)
        send(stream, buf)
      }
      msg.push(reply)
      this.onReq(event, msg)
      break
    case REP:
      this.onRep(event, msg, msgId)
      break
  }
}

Queue.prototype._flush = function() {
  var pendingReqs = this.pendingReqs
  var reqsLen = pendingReqs.length
  if (0 < reqsLen) {
    var i = 0
    var req = this.req
    while (i < reqsLen) {
      req.apply(this, pendingReqs[i++])
    }
  }

  var pendingPubs = this.pendingPubs
  var pubsLen = pendingPubs.length
  if (0 < pubsLen) {
    var j = 0
    var pub = this.pub
    while (j < pubsLen) {
      pub.apply(this, pendingPubs[j++])
    }
  }
}
