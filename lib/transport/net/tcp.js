var net = require('ne' + 't')
var common = require('./common')


exports.bind = function(target, smq, options, callback) {
  var handler = common.getOnConnectHandler(smq)
  var server = net.createServer(function(sock) {
    handler(sock, server, target)
    callback && callback(sock)
  })
  server.listen(target.port, target.hostname)
  server.on('listening', smq.emit.bind(smq, 'bind'))

  return server
}

exports.connect = function(target, smq, options, callback) {
  var handler = common.getOnConnectHandler(smq)
  var sock = net.connect(target.port, target.hostname, function() {
    handler(sock)
    callback && callback(sock)
  })

  return sock
}
