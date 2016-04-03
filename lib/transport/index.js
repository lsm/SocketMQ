exports.tcp = require('./net/tcp')
exports.tls = require('./net/tls')

exports.eio = {
  bind: require('./engine.io/bind'),
  connect: require('./engine.io/connect')
}
