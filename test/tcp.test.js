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
    smqErrClient.on('stream error', function(err, socket) {
      t.equal(err.code, 'ECONNREFUSED', 'tcp get stream connection error')
      t.ok(socket, 'tcp has socket instance in error event')
    })

    testDefault('tcp', t, smqServer, smqClient1, smqClient2, endpoint)
  })
}
