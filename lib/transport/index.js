exports.tcp = require('./net/tcp')
exports.tls = require('./net/tls')

exports.eio = {
  bind: function(target, smq, options, callback) {
    return require('./engine.io/bind')(target, smq, options, callback)
  },
  connect: function(target, smq, options, callback) {
    return require('./engine.io/connect')(target, smq, options, callback)
  }
}
