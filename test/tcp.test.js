var test = require('tape')
var socketmq = require('../')
var testDefault = require('./default')

module.exports = function() {
  test('connect event tcp', function(t) {

    var smqServer = socketmq.bind('tcp://127.0.0.1:6363')
    var smqClient1 = socketmq.connect('tcp://127.0.0.1:6363')
    var smqClient2 = socketmq.connect('tcp://127.0.0.1:6363')

    testDefault('tcp', t, smqServer, smqClient1, smqClient2)
  })
}
