var test = require('tape')
var socketmq = require('../')
var testDefault = require('./default')

module.exports = function() {
  test('connect event tcp', function(t) {
    t.plan(6)

    var smqServer = socketmq.bind('tcp://127.0.0.1:6363')
    var smqClient = socketmq.connect('tcp://127.0.0.1:6363')

    testDefault('tcp', t, smqServer, smqClient)
  })
}
