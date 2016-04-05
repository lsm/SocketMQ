var Socket = require('./lib/socket/index')
var SocketHub = require('./lib/socket/hub')

var socketmq = module.exports = function() {
  return new Socket()
}

socketmq.Socket = Socket

socketmq.bind = function(uri, options, callback) {
  var smq = socketmq()
  smq.bind(uri, options, callback)
  return smq
}

socketmq.connect = function(uri, options, callback) {
  var smq = socketmq()
  smq.connect(uri, options, callback)
  return smq
}

socketmq.hub = function() {
  return new SocketHub()
}
