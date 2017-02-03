var Buffer = require('../message/type').Buffer
var isBuffer = Buffer.isBuffer

/**
 * Queue operations
 */

// pub/sub pair

exports.pub = function(event, msg) {
  var pack = getMsg(arguments, 1)
  pack.event = event
  this.queue.pub(this.streams, pack)
}

exports.pubTag = function(tag, event, msg) {
  var pack = getMsg(arguments, 2)
  pack.event = event
  var streams = this.getStreamsByTag(tag)
  if (streams.length > 0) {
    this.queue.pub(streams, pack)
  } else {
    this.emit('error', {
      tag: tag,
      type: this.ERR_NO_TAGGED_STREAM,
      event: event,
      message: msg
    })
  }
}

exports.sub = function(event, callback) {
  this.queue.sub(event, callback)
}

// req/rep pair

exports.req = function(event, msg, callback) {
  var args = getMsgAndCallback(arguments, 1)
  var pack = {
    msg: args.msg,
    event: event
  }
  this.queue.req(this.streams, pack, args.callback)
}

exports.reqTag = function(tag, event, msg, callback) {
  var args = getMsgAndCallback(arguments, 2)
  var pack = {
    msg: args.msg,
    event: event
  }
  var streams = this.getStreamsByTag(tag)
  if (streams.length > 0) {
    this.queue.req(streams, pack, args.callback)
  } else {
    this.emit('error', {
      tag: tag,
      type: this.ERR_NO_TAGGED_STREAM,
      event: event,
      message: msg
    })
  }
}

exports.rep = function(event, callback) {
  this.queue.rep(event, callback)
}

// Queue private functions

var getMsgAndCallback = exports.getMsgAndCallback = function(args, start) {
  var len = args.length
  var callback = args[len - 1]
  if ('function' === typeof callback)
    len--
  else
    callback = undefined

  var result
  if (len > start)
    result = getMsg(args, start, len)
  else
    result = {}

  result.callback = callback
  return result
}

var getMsg = exports.getMsg = function(args, start, end) {
  var msg
  var len = args.length
  end = end || len

  if (end > start + 1) {
    // Multiple msg arguments
    msg = []
    var i = start
    while (i < end) {
      msg[i - start] = args[i]
      i++
    }
  } else if (end > start) {
    // One msg arguments
    msg = args[start]
    if ('string' !== typeof msg && !isBuffer(msg))
      msg = [msg]
  }

  return {
    msg: msg
  }
}
