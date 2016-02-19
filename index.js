var Socket = require('./lib/socket')

var socketmq = module.exports = function() {
  return new Socket()
}

socketmq.Socket = Socket

socketmq.bind = function(uri, options) {
  var smq = socketmq()
  smq.bind(uri, options)
  return smq
}

socketmq.connect = function(uri, options) {
  var smq = socketmq()
  smq.connect(uri, options)
  return smq
}
