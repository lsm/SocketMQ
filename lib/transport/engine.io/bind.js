var http = require('htt' + 'p')
var engine = require('engine.i' + 'o')
var common = require('./common')
var setupStream = require('../common').setupStream
var createStream = common.createStream
var getDefaultOptions = common.getDefaultOptions


module.exports = function bind(target, smq, options, callback) {
  var httpServer
  options = getDefaultOptions(options)
  // Lazy create http server
  if (options.httpServer) {
    httpServer = options.httpServer
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
    setupStream(smq, stream, callback, engineServer, target)
  })

  return engineServer
}
