var inf = require('./inf')
var msg = require('./msg')
var type = require('../message/type')
var pubsub = require('./pubsub')
var reqrep = require('./reqrep')
var Buffer = type.Buffer
var isBuffer = Buffer.isBuffer


var PUB = type.PUB
var SUB = type.SUB
var REQ = type.REQ
var REP = type.REP
var MID = type.MID


var Queue = module.exports = function(socket) {
  this.n = 0
  this.send = socket.send.bind(socket)
  this.socket = socket
  this._pendings = []

  // Initialize inboxes
  this[SUB] = {}
  this[REQ] = {}
  this[REP] = {}

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

  setTimeout(function() {
    // Acknowledge existing streams
    if (socket.streams.length > 0)
      queue.ack(socket.streams)
  }, 0)
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
 * Message API
 */

Queue.prototype.encode = msg.encode
Queue.prototype.decode = msg.decode

/**
 * Common sending patterns
 */

Queue.prototype.one = function(streams, pack) {
  var len = streams.length
  var stream = streams[this.n++ % len]
  if (!stream)
    return this.push(['one', streams, pack])

  var buf = pack.buf || this.encode(pack)
  // send the buf to selected stream
  this.send(stream, buf)
}

Queue.prototype.all = function(streams, pack) {
  var len = streams.length
  if (0 === len)
    return this.push(['all', streams, pack])

  var send = this.send
  var buf = pack.buf || this.encode(pack)

  while (len-- > 0) {
    send(streams[len], buf)
  }
}


/**
 * Info API
 */
Queue.prototype.ack = inf.ack
Queue.prototype.inf = inf.inf


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
  var fid = pack.fid

  if (fid === type.F_BUFFER || fid === type.F_STRING)
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
        if (meta && meta[MID]) {
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
            } else if ('string' !== typeof repMsg && !isBuffer(repMsg)) {
              repMsg = [repMsg]
            }
            var buf = encode({
              type: REP,
              event: event,
              msg: repMsg,
              meta: meta
            })
            send(stream, buf)
          }
          msg.push(reply)
        }
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
