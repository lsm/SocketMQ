var type = require('../message/type')
var REQ = type.REQ


var req = exports.req = function(streams, event, msg, callback) {
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

exports.rep = function(event, repCallback) {
  this.repInbox[event] = repCallback
}

exports.onReq = function(event, args) {
  var repCallback = this.repInbox[event]
  if (repCallback)
    repCallback.apply(null, args)
}

exports.onRep = function(event, args, msgId) {
  var inbox = this.reqInbox[msgId]
  if (inbox) {
    inbox.cb.apply(null, args)
    delete this.reqInbox[msgId]
  }
}

exports._init = function(queue) {
  queue.reqInbox = {}
  queue.repInbox = {}
  queue.pendingReqs = []
}

exports._flush = function(queue) {
  var pendingReqs = queue.pendingReqs
  var reqsLen = pendingReqs.length
  if (0 < reqsLen) {
    var i = 0
    while (i < reqsLen) {
      req.apply(queue, pendingReqs[i++])
    }
  }
}
