var type = require('../message/type')
var pubsub = require('./pubsub')
var reqrep = require('./reqrep')
var Buffer = type.Buffer


var PUB = type.PUB
var SUB = type.SUB
var REQ = type.REQ
var REP = type.REP
var INF = type.INF
var MID = type.MID
var MNS = type.MNS
var MCH = type.MCH
var ACK = type.ACK


var Queue = module.exports = function(socket) {
  this.n = 0
  this.send = socket.send.bind(socket)
  this.socket = socket
  this._pendings = []

  pubsub._init(this)
  reqrep._init(this)

  // Listen connect event
  var queue = this
  var flush = this._flush.bind(this)
  socket.on('connect', function(stream) {
    // Acknowldge REP/SUB
    if (stream.writable)
      queue.ack([stream])
    // Flush pending messages
    flush()
  })

  socket.on('message', function(data, stream) {
    queue.dispatch(data, stream)
  })
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
 * Common sending patterns
 */

Queue.prototype.one = function(streams, type, event, msg, meta, callback) {
  var len = streams.length
  var stream = streams[this.n++ % len]
  if (!stream)
    return this.push(['one', streams, type, event, msg, meta, callback])

  // Generate id for callback and save it in inbox.
  if (callback && REQ === type) {
    var msgId = '.' + this.n
    meta = meta || {}
    meta[MID] = msgId
    this.reqInbox[msgId] = {
      cb: callback
    }
  }

  var buf = this.encode(type, event, msg, meta)
  // send the buf to selected stream
  this.send(stream, buf)
}


/**
 * Info API
 */

Queue.prototype.inf = function(streams, event, msg, meta) {
  var len = streams.length
  if (0 === len)
    return this.push(['inf', streams, event, msg, meta])

  var send = this.send
  var buf = this.encode(INF, event, msg, meta)
  while (len-- > 0) {
    send(streams[len], buf)
  }
}

Queue.prototype.ack = function(streams) {
  var repEvents = Object.keys(this.repInbox)
  var subEvents = Object.keys(this.subInboxes)
  var msg = {}

  if (repEvents.length > 0)
    msg[REP] = repEvents
  if (subEvents.length > 0)
    msg[SUB] = subEvents

  var meta
  if (this.ns) {
    meta = {}
    meta[MNS] = this.ns
    if (this.chn)
      meta[MCH] = this.chn
  }

  if (msg[REP] || msg[SUB] || this.chn)
    this.inf(streams, ACK, msg, meta)
}

Queue.prototype.push = function(arr) {
  this._pendings.push(arr)
}

/**
 * Dispatching pack
 */

Queue.prototype.beforeDispatch = function(pack, stream, dispatch) {
  dispatch(pack, stream)
}

/**
 * Dispatch messages to corresponding handlers.
 *
 * @param  {Buffer} data   Raw data buffer
 * @param  {Stream} stream The stream from which the data was sent
 */
Queue.prototype.dispatch = function(data, stream) {
  var pack = this.decode(data)
  var formatId = pack.formatId

  if (formatId === type.F_BUFFER || formatId === type.F_STRING)
    pack.msg = [pack.msg]

  var queue = this
  this.beforeDispatch(pack, stream, function(pack, stream) {
    var msg = pack.msg
    var meta = pack.meta
    var event = pack.event

    switch (pack.type) {
      case PUB:
        queue.onPub(event, msg)
        break
      case REQ:
        // Make reply function
        var send = queue.send
        var encode = queue.encode
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
          var buf = encode(REP, event, repMsg, meta)
          send(stream, buf)
        }
        msg.push(reply)
        queue.onReq(event, msg)
        break
      case REP:
        var msgId = meta[MID]
        queue.onRep(event, msg, msgId)
        break
    }
  })
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
      this[_p[0]](_p[1], _p[2], _p[3], _p[4], _p[5], _p[6])
    }
  }
}
