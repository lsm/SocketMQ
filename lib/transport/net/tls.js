var tls = require('tl' + 's')
var common = require('./common')


exports.bind = function(target, smq, options, callback) {
  var handler = common.getOnConnectHandler(smq)
  var server = tls.createServer(options, function(sock) {
    handler(sock, server, target)
    callback && callback(sock)
  })
  server.listen(target.port, target.hostname)
  server.on('listening', smq.emit.bind(smq, 'bind'))

  return server
}

exports.connect = function(target, smq, options, callback) {
  var handler = common.getOnConnectHandler(smq)
  var sock = tls.connect(target.port, target.hostname, options, function() {
    handler(sock)
    callback && callback(sock)
  })

  return sock
}
