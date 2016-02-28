
var Queue = module.exports = function() {
  this.n = 0
  this.reqInbox = {}
  this.subInboxes = {}
  this.repInbox = {}
}

Queue.prototype.pub = function(send, streams, buf) {
  var len = streams.length
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

Queue.prototype.onPub = function(event, msg) {
  var inbox = this.subInboxes[event]
  if (inbox) {
    var i = 0
    var len = inbox.length
    // Call each callback with msg in inbox.
    while (i < len) {
      inbox[i++](msg)
    }
  }
}

Queue.prototype.req = function(streams, callback, timeoutId) {
  var len = streams.length
  var stream = streams[this.n++ % len]
  // Generate id for callback and save it in inbox.
  var msgId = '.' + this.n
  this.reqInbox[msgId] = {
    cb: callback,
    tid: timeoutId
  }
  // send the buf to selected stream
  return {
    msgId: msgId,
    stream: stream
  }
}

Queue.prototype.waitingForRep = function(msgId) {
  return this.reqInbox.hasOwnProperty(msgId)
}

Queue.prototype.removeReqInbox = function(msgId) {
  delete this.reqInbox[msgId]
}

Queue.prototype.rep = function(event, callback) {
  this.repInbox[event] = callback
}

Queue.prototype.onReq = function(event, msg, reply) {
  var repCallback = this.repInbox[event]
  if (repCallback) {
    repCallback(msg, reply)
  }
}

Queue.prototype.onRep = function(event, msg, msgId) {
  var inbox = this.reqInbox[msgId]
  if (inbox) {
    clearTimeout(inbox.tid)
    inbox.cb(msg)
    this.removeReqInbox(msgId)
  }
}
