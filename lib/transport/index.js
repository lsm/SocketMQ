var net = require('./ne' + 't')

exports.tcp = {
  bind: function(target, smq, options, callback) {
    return net.bind('tcp', target, smq, options, callback)
  },
  connect: function(target, smq, options, callback) {
    return net.connect('tcp', target, smq, options, callback)
  }
}

exports.tls = {
  bind: function(target, smq, options, callback) {
    return net.bind('tls', target, smq, options, callback)
  },
  connect: function(target, smq, options, callback) {
    return net.connect('tls', target, smq, options, callback)
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
