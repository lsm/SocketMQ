var http = require('http')
var engine = require('engine.io')
var common = require('./common')
var createStream = common.createStream
var attachStream = common.attachStream
var getDefaultOptions = common.getDefaultOptions


module.exports = function bind(target, smq, options, callback) {
  var httpServer
  // Lazy create http server
  if (target instanceof http.Server) {
    httpServer = target
  } else {
    httpServer = http.createServer()
    httpServer.listen(target.port, target.hostname)
  }
  options = getDefaultOptions(options)
  // Create engine.io server
  var engineServer = engine.Server(options)
  engineServer.attach(httpServer, options)

  // Handler new client connections
  engineServer.on('connection', function(socket) {
    var stream = createStream(socket)
    attachStream(smq, stream)
    callback && callback(stream)
  })

  return engineServer
}
