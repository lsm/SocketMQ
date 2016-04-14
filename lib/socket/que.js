var Buffer = require('../message/type').Buffer
var isBuffer = Buffer.isBuffer

/**
 * Queue operations
 */

// pub/sub pair

exports.pub = function(event, msg) {
  msg = getArgs(arguments, msg, 1, 1, 2)
  this.queue.pub(this.streams, {
    event: event,
    msg: msg
  })
}

exports.pubTag = function(tag, event, msg) {
  msg = getArgs(arguments, msg, 2, 1, 3)
  var streams = this.getStreamsByTag(tag)
  if (streams.length > 0) {
    this.queue.pub(streams, {
      event: event,
      msg: msg
    })
  } else {
    this.emit('error', this.ERR_NO_TAGGED_STREAM, tag, event, msg)
  }
}

exports.sub = function(event, callback) {
  this.queue.sub(event, callback)
}

// req/rep pair

exports.req = function(event, msg, callback) {
  msg = getArgs(arguments, msg, 1, 2, 3)
  callback = arguments[arguments.length - 1]
  this.queue.req(this.streams, {
    event: event,
    msg: msg
  }, callback)
}

exports.reqTag = function(tag, event, msg, callback) {
  msg = getArgs(arguments, msg, 2, 2, 4)
  callback = arguments[arguments.length - 1]
  var streams = this.getStreamsByTag(tag)
  if (streams.length > 0) {
    this.queue.req(streams, {
      event: event,
      msg: msg
    }, callback)
  } else {
    this.emit('error', this.ERR_NO_TAGGED_STREAM, tag, event, msg)
  }
}

exports.rep = function(event, callback) {
  this.queue.rep(event, callback)
}

// Queue private functions

var getArgs = exports.getArgs = function getArgs(args, result, start, endOffset, min) {
  var len = args.length
  if (min < len) {
    len -= endOffset
    var i = start
    result = [result]
    while (i++ < len) {
      result[i - start] = args[i]
    }
  } else if ('string' !== typeof result && !isBuffer(result)) {
    result = [result]
  }
  return result
}
