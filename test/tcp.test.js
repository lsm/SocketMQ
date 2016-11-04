var test = require('tape')
var socketmq = require('../')
var testDefault = require('./default')

module.exports = function() {
  test('tcp: connect event', function(t) {

    var endpoint = 'tcp://127.0.0.1:6363'

    var smqServer = socketmq.bind(endpoint)
    var smqClient1 = socketmq.connect(endpoint, function() {
      t.ok(smqClient1.hasTag(endpoint), 'default tag has been added')
      t.ok(smqClient1.hasConnection(endpoint), 'endpoint connected')
    })
    var smqClient2 = socketmq.connect(endpoint)

    var smqErrClient = socketmq.connect('tcp://127.0.0.1:3636')
    smqErrClient.on('error', function(event) {
      t.equal(event.type, smqErrClient.ERR_STREAM, 'error type match')
      t.equal(event.error.code, 'ECONNREFUSED', 'tcp get stream connection error')
      t.ok(event.stream, 'tcp has stream instance in error event')
    })

    testDefault('tcp', t, smqServer, smqClient1, smqClient2, endpoint)
  })
}
