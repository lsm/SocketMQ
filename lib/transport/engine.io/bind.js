var http = require('http')
var engine = require('engine.io')
var common = require('./common')
var createStream = common.createStream
var attachStream = common.attachStream
var getDefaultOptions = common.getDefaultOptions


module.exports = function bind(target, smq, options, callback) {
  var httpServer
  options = getDefaultOptions(options)
  // Lazy create http server
  if (options.httpServer) {
    httpServer = target
    delete options.httpServer
  } else {
    httpServer = http.createServer()
    httpServer.listen(target.port, target.hostname)
  }

  // Create engine.io server
  var engineServer = engine.attach(httpServer, options)

  // Handle new client connections
  engineServer.on('connection', function(socket) {
    var stream = createStream(socket)
    stream.__smq_endpoint__ = engineServer.__smq_endpoint__
    attachStream(smq, stream)
    callback && callback(stream)
  })

  return engineServer
}
