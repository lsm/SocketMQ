var Buffer = require('../message/type').Buffer
var isBuffer = Buffer.isBuffer

/**
 * Queue operations
 */

// pub/sub pair

exports.pub = function(event, msg) {
  var pack = {
    event: event
  }
  if (arguments.length > 1)
    pack.msg = getMsg(arguments, 1)
  this.queue.pub(this.streams, pack)
}

exports.pubTag = function(tag, event, msg) {
  var pack = {
    event: event
  }
  if (arguments.length > 2)
    pack.msg = getMsg(arguments, 2)
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
    event: event
  }
  if (args.hasMsg)
    pack.msg = args.msg
  this.queue.req(this.streams, pack, args.callback)
}

exports.reqTag = function(tag, event, msg, callback) {
  var pack = {
    event: event
  }
  var args = getMsgAndCallback(arguments, 2)
  if (args.hasMsg)
    pack.msg = args.msg
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

  var result = {
    callback: callback
  }

  if (len > start) {
    result.msg = getMsg(args, start, len)
    result.hasMsg = true
  }

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
  } else {
    // only one or no argument is msg
    msg = args[start]
    if (!msg)
      return msg

    if ('string' !== typeof msg && !isBuffer(msg))
      msg = [msg]
  }

  return msg
}
