

exports.setupStream = function(smq, stream, callback, server, target) {
  stream.setNoDelay && stream.setNoDelay(true)
  stream.setKeepAlive && stream.setKeepAlive(true, 200)

  stream.on('close', function() {
    smq.close(stream)
  })

  stream.on('error', function(err) {
    smq.close(stream)
    smq.emit('stream error', err, stream)
  })

  if (server) {
    stream.__smq_endpoint__ = server.__smq_endpoint__
    stream.__smq_protocol__ = target.protocol
    smq.addStream(stream)
    callback && callback(stream)
  } else {
    stream.once('connect', function() {
      smq.addStream(stream)
      callback && callback(stream)
    })
  }
}
