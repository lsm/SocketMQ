var test = require('tape')
var socketmq = require('../')
var testDefault = require('./default')

module.exports = function() {
  test('eio: connect event', function(t) {

    var endpoint = 'eio://127.0.0.1:8080'

    var smqServer = socketmq.bind(endpoint)
    var smqClient1 = socketmq.connect(endpoint, {}, function() {
      t.ok(smqClient1.hasTag(endpoint), 'default tag has been added')
      t.ok(smqClient1.hasConnection(endpoint), 'endpoint connected')
    })
    var smqClient2 = socketmq.connect(endpoint)

    testDefault('eio', t, smqServer, smqClient1, smqClient2, endpoint)
  })
}
