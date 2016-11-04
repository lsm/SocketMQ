

exports.setupStream = function(smq, stream, callback, server) {
  stream.setNoDelay && stream.setNoDelay(true)
  stream.setKeepAlive && stream.setKeepAlive(true, 200)

  stream.once('close', function() {
    smq.close(stream)
  })

  stream.on('error', function(err) {
    smq.close(stream, {
      type: smq.ERR_STREAM,
      error: err,
      stream: stream
    })
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
