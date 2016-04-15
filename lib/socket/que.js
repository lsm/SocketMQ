var Buffer = require('../message/type').Buffer
var isBuffer = Buffer.isBuffer

/**
 * Queue operations
 */

// pub/sub pair

exports.pub = function(event, msg) {
  var args = getArgs(arguments, msg, 1, 1, 2)
  this.queue.pub(this.streams, {
    event: event,
    msg: args.msg
  })
}

exports.pubTag = function(tag, event, msg) {
  var args = getArgs(arguments, msg, 2, 1, 3)
  var streams = this.getStreamsByTag(tag)
  if (streams.length > 0) {
    this.queue.pub(streams, {
      event: event,
      msg: args.msg
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
  var args = getArgs(arguments, msg, 1, 2, 2)
  callback = arguments[arguments.length - 1]
  this.queue.req(this.streams, {
    event: event,
    msg: args.msg
  }, args.callback)
}

exports.reqTag = function(tag, event, msg, callback) {
  var args = getArgs(arguments, msg, 2, 2, 3)
  var streams = this.getStreamsByTag(tag)
  if (streams.length > 0) {
    this.queue.req(streams, {
      event: event,
      msg: args.msg
    }, args.callback)
  } else {
    this.emit('error', this.ERR_NO_TAGGED_STREAM, tag, event, msg)
  }
}

exports.rep = function(event, callback) {
  this.queue.rep(event, callback)
}

// Queue private functions

var getArgs = exports.getArgs = function getArgs(args, msg, start, endOffset, min) {
  var len = args.length
  var callback = args[len - 1]
  if (min < len) {
    len -= endOffset
    var i = start
    msg = [msg]
    while (i++ < len) {
      msg[i - start] = args[i]
    }
    if (2 === endOffset && 'function' !== typeof callback) {
      // We are expecting a callback but didn't get one, so the callback is
      // part of the message.
      msg.push(callback)
      callback = undefined
    }
  } else if ('string' !== typeof msg && !isBuffer(msg)) {
    msg = [msg]
  }

  return {
    msg: msg,
    callback: callback
  }
}
