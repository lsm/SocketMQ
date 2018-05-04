exports.setupStream = function(smq, stream, callback, server) {
  stream.setNoDelay && stream.setNoDelay(true)
  stream.setKeepAlive && stream.setKeepAlive(true, 200)

  stream.once('close', function() {
    smq.removeStream(stream)
  })

  stream.on('error', function(err) {
    // Only remove stream with original error. Avoid removing twice.
    if (err && !err.stream) {
      smq.removeStream(stream, {
        type: smq.ERR_STREAM,
        error: err,
        stream: stream
      })
    }
  })

  if (server) {
    stream.__smq__ = {
      tags: [],
      endpoint: server.__smq__.endpoint,
      protocol: server.__smq__.protocol
    }
    smq.addStream(stream)
    callback && callback(stream)
  } else {
    stream.once('connect', function() {
      smq.addStream(stream)
      callback && callback(stream)
    })
  }
}
