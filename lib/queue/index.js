var type = require('../message/type')
var pubsub = require('./pubsub')
var reqrep = require('./reqrep')


var PUB = type.PUB
var REQ = type.REQ
var REP = type.REP


var Queue = module.exports = function(socket) {
  this.n = 0
  this.send = socket.send.bind(socket)
  this.socket = socket
  this._pendings = []

  pubsub._init(this)
  reqrep._init(this)

  // Listen connect event and flush pending messages
  socket.on('connect', this._flush.bind(this))
}

/**
 * Pubsub API
 */

Queue.prototype.pub = pubsub.pub
Queue.prototype.sub = pubsub.sub
Queue.prototype.onPub = pubsub.onPub

/**
 * Reqrep API
 */

Queue.prototype.req = reqrep.req
Queue.prototype.rep = reqrep.rep
Queue.prototype.onReq = reqrep.onReq
Queue.prototype.onRep = reqrep.onRep


/**
 * Dispatch messages to corresponding handlers.
 *
 * @param  {Buffer} data   Raw data buffer
 * @param  {Stream} stream The stream from which the data was sent
 */
Queue.prototype.dispatch = function(data, stream) {
  var decoded = this.decode(data)
  var msg = decoded.msg
  var event = decoded.event
  var msgId = decoded.msgId
  var formatId = decoded.formatId

  if (formatId === type.F_BUFFER || formatId === type.F_STRING)
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
        } else if ('string' !== typeof repMsg && !Buffer.isBuffer(repMsg)) {
          repMsg = [repMsg]
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
  var pendings = this._pendings
  var len = pendings.length
  if (0 < len) {
    // Reset pending array
    this._pendings = []
    var i = 0
    while (i < len) {
      var _p = pendings[i++]
      // this.req/pub(streams, ...)
      this[_p[0]](_p[1], _p[2], _p[3], _p[4])
    }
  }
}
