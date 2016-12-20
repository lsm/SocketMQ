var Buffer = require('../message/type').Buffer
var isBuffer = Buffer.isBuffer

/**
 * Queue operations
 */

// pub/sub pair

exports.pub = function(event, msg) {
  this.queue.pub(this.streams, {
    event: event,
    msg: getMsg(arguments, 1)
  })
}

exports.pubTag = function(tag, event, msg) {
  msg = getMsg(arguments, 2)
  var streams = this.getStreamsByTag(tag)
  if (streams.length > 0) {
    this.queue.pub(streams, {
      event: event,
      msg: msg
    })
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
  this.queue.req(this.streams, {
    event: event,
    msg: args.msg
  }, args.callback)
}

exports.reqTag = function(tag, event, msg, callback) {
  var args = getMsgAndCallback(arguments, 2)
  var streams = this.getStreamsByTag(tag)
  if (streams.length > 0) {
    this.queue.req(streams, {
      event: event,
      msg: args.msg
    }, args.callback)
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

  return {
    msg: getMsg(args, start, len),
    callback: callback
  }
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
  } else {
    // only one or no rgument is msg
    msg = args[start]
    if (!msg)
      return msg

    if ('string' !== typeof msg && !isBuffer(msg))
      msg = [msg]
  }

  return msg
}
