exports.tcp = {
  bind: function(target, smq, options, callback) {
    return require('./net' + '/tcp').bind(target, smq, options, callback)
  },
  connect: function(target, smq, options, callback) {
    return require('./net' + '/tcp').connect(target, smq, options, callback)
  }
}

exports.tls = {
  bind: function(target, smq, options, callback) {
    return require('./net' + '/tls').bind(target, smq, options, callback)
  },
  connect: function(target, smq, options, callback) {
    return require('./net' + '/tls').connect(target, smq, options, callback)
  }
}

exports.eio = {
  bind: function(target, smq, options, callback) {
    return require('./engine.io' + '/bind')(target, smq, options, callback)
  },
  connect: function(target, smq, options, callback) {
    return require('./engine.io/connect')(target, smq, options, callback)
  }
}
