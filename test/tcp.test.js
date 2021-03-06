var test = require('tape')
var socketmq = require('../')
var testDefault = require('./default')

module.exports = function() {
  var endpoint = 'tcp://127.0.0.1:6363'
  var smqServer
  var smqClient1
  var smqClient2

  test('tcp: connect event', function(t) {
    smqServer = socketmq.bind(endpoint)
    smqServer.on('bind', function() {
      smqClient1 = socketmq.connect(endpoint, function() {
        t.ok(smqClient1.hasTag(endpoint), 'default tag has been added')
        t.ok(smqClient1.hasConnection(endpoint), 'endpoint connected')
      })
      smqClient2 = socketmq.connect(endpoint)
      testDefault('tcp', t, smqServer, smqClient1, smqClient2, endpoint)
    })

    var smqErrClient = socketmq.connect('tcp://127.0.0.1:3636')
    smqErrClient.on('error', function(event) {
      t.equal(event.type, smqErrClient.ERR_STREAM, 'error type match')
      t.equal(event.error.code, 'ECONNREFUSED', 'tcp get stream connection error')
      t.ok(event.stream, 'tcp has stream instance in error event')
    })

    var noport = 'tcp://'
    socketmq.bind(noport)
    t.pass('Bind should not crash when no port is not provided.')
  })
}
