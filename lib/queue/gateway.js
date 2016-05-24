var type = require('../message/type')
var wire = require('../message/wire')
var Queue = require('./index')
var inherits = require('inherits')
var prefixTags = require('../socket/tag').prefixTags


var PUB = type.PUB
var SUB = type.SUB
var REQ = type.REQ
var REP = type.REP
var INF = type.INF
var MID = type.MID
var MNS = type.MNS
var MCH = type.MCH
var ACK = type.ACK
var SID = type.SID
var JON = type.JON
var CKE = type.CKE
var SSN = type.SSN


var QueueGateway = module.exports = function QueueGateway(socket) {
  Queue.call(this, socket)

  socket.on('connect', function(stream) {
    // Tag untrusted stream with its id, disconnect if id is not provided.
    if (socket.isUntrusted(stream)) {
      if (stream.id)
        socket.tag(stream, prefixTags(SID, stream.id))
      else
        socket.close(stream)
    }
  })
}

inherits(QueueGateway, Queue)

QueueGateway.prototype.onGatewayPub = function(streams, pack, buf, excludedStream) {
  var meta = pack.meta
  // PUB message could only come from trusted stream -> untrusted
  // We select streams by tag, which means the PUB message could be sent to many
  // streams as long as the stream has correct tag no matter trusted or untrusted.
  // It allows multiple people (streams) to get messages when the tag name match
  // exactly `[ns]::[channel]::SUB::[event]`.
  // The tag could only be set by the `onGatewayInf` function
  var tag = prefixTags(SUB, pack.event)
  tag = prefixTags(meta[MCH], tag)
  tag = prefixTags(meta[MNS], tag)
  var _streams = this.socket.getStreamsByTag(tag, streams, excludedStream)

  // In case we have SID in meta we only want to send to the stream which has
  // SID as one of its tag.
  if (meta[SID])
    _streams = this.getStreamsBySid(meta[SID], _streams)

  var len = _streams.length
  if (0 === len)
    // No stream or only has one stream which is the excluded one.
    return

  // Clean up senstive data before sending to untrusted streams
  cleanMeta(meta)
  buf = wire.encode(pack)
  this.all(_streams, {
    buf: buf
  })
}

QueueGateway.prototype.onGatewayReq = function(streams, pack, reply, excludedStream) {
  var meta = pack.meta
  // REQ message could only come from untrusted stream -> trusted stream
  // controlled by `validatePack`. When we reach this point the untrusted stream
  // already has the correct tag previously set by `onGatewayInf`. We can route
  // this pack to any streams which has tag `[ns]::REP::[event]`. The remote
  // pack receiver should decide how to handle the [channel] info based on
  // application logic.
  // This allows stateless backend servers with stateful frontend clients.
  var tag = prefixTags(REP, pack.event)
  tag = prefixTags(meta[MNS], tag)
  var _streams = this.socket.getStreamsByTag(tag, streams, excludedStream)

  var len = _streams.length
  var stream = _streams[this.n++ % len]
  if (!stream)
    // No stream or only has one stream which is the excluded one.
    return

  // Generate id for callback and save it in inbox.
  if (meta && meta[MID]) {
    meta[MID] = this.n + '.' + meta[MID]
    this[REQ][meta[MID]] = reply
  // send the buf to selected stream
  }
  var buf = wire.encode(pack)
  this.send(stream, buf)
}

QueueGateway.prototype.onGatewayRep = function(pack) {
  var msgId = pack.meta[MID]
  var cb = this[REQ][msgId]
  if (cb) {
    cb(pack)
    delete this[REQ][msgId]
  }
}

/**
 * General rules here:
 * 1. Untrusted -> trusted:
 *   - Allow send REQ messages
 *   - Allow receive SUB messages (INF ACK msg[SUB])
 * 2. Trusted -> untrusted
 *   - Allow send REP messages
 *   - Allow receive REQ messages
 *   - Allow send PUB messages
 */
QueueGateway.prototype.onGatewayInf = function(pack, stream) {
  var flush = false

  if (ACK === pack.event) {
    var meta = pack.meta
    var msg = pack.msg
    if (this.socket.isUntrusted(stream) && meta[SID]) {
      // The ACK is coming from an untrusted stream which means this is a join
      // request. For now we only allow untrusted stream to receive SUB messages.
      // REP is allowed as long as the REQ message is allowed to pass through
      // the gateway and trusted stream send back the REP.
      var ackMsg = {}
      if (msg[SUB])
        ackMsg[SUB] = msg[SUB]
      // Route this message to one of any streams which has tag `[ns]::ACK`
      var tag = prefixTags(meta[MNS], ACK)
      var streams = this.socket.getStreamsByTag(tag, null, stream)
      if (streams.length > 0) {
        this.one(streams, {
          type: INF,
          event: ACK,
          msg: ackMsg,
          meta: meta
        })
      }
    } else {
      // If ACK from trusted streams, it could be one of following 2 cases:
      if (meta[SID]) {
        // 1. Trusted stream is replying an ACK event previously sent from an
        // untrusted stream (request to join). In this case (ACK), it tells we
        // should allow messages meta maching `[ns]::[channel]::REQ::[event]`
        // from untrusted stream to be passed through the gateway.
        // We only allow REQ message from untrusted stream.
        // Let's find our untrusted stream first.
        var sidStreams = this.getStreamsBySid(meta[SID])
        if (1 === sidStreams.length) {
          var sidStream = sidStreams[0]
          if (msg[REP]) {
            // 1.1 Trusted stream tells what REQ events (from the untrusted stream)
            // the gateway should allow to go through. Let's prepare tags
            // for untrusted stream. Tags should be identical as what we have
            // in 8. of `validatePack`:
            // `[ns]::[channel]::REQ::[event]`
            var sidREQTags = msg[REP]
            sidREQTags = prefixTags(REQ, sidREQTags)
            sidREQTags = prefixTags(meta[MCH], sidREQTags)
            sidREQTags = prefixTags(meta[MNS], sidREQTags)
            // Tag the untrusted stream
            this.socket.tag(sidStream, sidREQTags)
            flush = true
          }
          if (msg[SUB]) {
            // 1.2 Trusted stream tells what SUB events the untrusted stream allow to
            // receive. Prepare tags in following format:
            // [ns]::[channel]::SUB::[event]
            var sidSUBTags = msg[SUB]
            sidSUBTags = prefixTags(SUB, sidSUBTags)
            sidSUBTags = prefixTags(meta[MCH], sidSUBTags)
            sidSUBTags = prefixTags(meta[MNS], sidSUBTags)
            // Tag the untrusted stream
            this.socket.tag(sidStream, sidSUBTags)
            flush = true
          }
          if (true === flush) {
            // Let's ACK untrusted stream that some permissions are granted.
            // But, we will only ACK [ns], [channel] and what ever other info
            // in meta to the unstrusted stream. No [event] info will be exposed.
            // SSN value will be attached to the stream if exists for fast
            // second time authentication.
            // Also delete SID & SSN before forward the meta.
            if (meta[SSN])
              sidStream.__smq__.ssn = meta[SSN]
            cleanMeta(meta)
            this.one(sidStreams, {
              type: INF,
              event: JON,
              msg: '',
              meta: meta
            })
          }
        }
      } else {
        // 2. Trusted stream is telling which [ns], message types and events
        // it accepts ([ns]::REP::[event]) when there's no stream id [SID] in
        // message meta. We only allow REP messages here. See `onGatewayReq`.
        if (msg[REP]) {
          var repTags = prefixTags(REP, msg[REP])
          repTags = prefixTags(meta[MNS], repTags)
          // Tag [ns]::REP::[event]
          this.socket.tag(stream, repTags)
        }
        // Also tag [ns]::ACK for the purpose of ACK
        this.socket.tag(stream, prefixTags(meta[MNS], ACK))
        flush = true
      }
    }
  }
  flush && this._flush()
}

QueueGateway.prototype.getStreamsBySid = function(sid, streams) {
  var sidTag = prefixTags(SID, sid)
  var sidStreams = this.socket.getStreamsByTag(sidTag, streams)
  return 1 === sidStreams.length ? sidStreams : []
}

QueueGateway.prototype.beforeDispatch = function(pack, stream, dispatch) {
  dispatch(pack, stream)
}

QueueGateway.prototype.validatePack = function(pack, stream) {
  // General rules for all packs:
  var meta = pack.meta
  // 1. Gateway requires meta data.
  if (!meta)
    return false
  // 2. Always use id from stream if exists.
  if (stream.id)
    meta[SID] = stream.id
  // 3. Gateway requires namespace in message meta.
  if (!meta[MNS])
    return false

  var type = pack.type
  // 4. Message requires channel info unless it's a INF pack
  // from trusted streams see 6.
  if (INF !== type && !meta[MCH])
    return false

  // More strict rules for untrusted streams:
  if (this.socket.isUntrusted(stream)) {
    // 5. Only allow REQ/INF message for untrusted stream.
    if (REQ !== type && INF !== type)
      return false
    // 6. Requires channel & SID info for all messages.
    if (!meta[MCH] && !meta[SID])
      return false
    // 7. Only allow ACK and LVE events for INF pack from untrusted stream.
    if (INF === type && ACK !== pack.event && LVE !== pack.event)
      return false
    // 8. Only allow REQ message when untrusted stream has correct tag.
    // Tag format: [ns]::[channel]::REQ::[event]
    if (REQ === type) {
      var tag = prefixTags(REQ, pack.event)
      tag = prefixTags(meta[MCH], tag)
      tag = prefixTags(meta[MNS], tag)
      if (!this.socket.hasTag(tag, stream))
        return false
    }
    // Set cookie in meta for authentication/authorization
    if (stream.headers && stream.headers.cookie)
      meta[CKE] = stream.headers.cookie
    // Set SSN in meta for fast re-authentication
    if (stream.__smq__.ssn)
      meta[SSN] = stream.__smq__.ssn
  } else {
    // 9. Trusted stream could only send INF, PUB and REP messages
    if (INF !== type && PUB !== type && REP !== type)
      return false
    // 10. Require SID for REP pack.
    if (REP === type && !meta[SID])
      return false
  }

  return true
}

QueueGateway.prototype.dispatch = function(buf, stream) {
  var pack = wire.decode(buf)
  if (true === this.validatePack(pack, stream)) {
    var gateway = this
    var meta = pack.meta
    this.beforeDispatch(pack, stream, function(pack, stream) {
      switch (pack.type) {
        case PUB:
          gateway.onGatewayPub(gateway.socket.streams, pack, buf, stream)
          break
        case REQ:
          var reply
          var msgId = meta[MID]
          if (msgId) {
            // Make reply function
            var send = gateway.send
            reply = function(repPack) {
              cleanMeta(meta)
              repPack.type = REP
              repPack.meta[MID] = msgId
              var buf = wire.encode(repPack)
              send(stream, buf)
            }
          }
          gateway.onGatewayReq(gateway.socket.streams, pack, reply, stream)
          break
        case REP:
          gateway.onGatewayRep(pack)
          break
        case INF:
          pack = gateway.decode(buf)
          pack.meta = meta
          gateway.onGatewayInf(pack, stream)
          break
      }
    })
  }
}

/**
 * Private functions
 */

function cleanMeta(meta) {
  delete meta[SID]
  delete meta[SSN]
}
