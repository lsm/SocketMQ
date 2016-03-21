var test = require('tape')
var socketmq = require('../')
var testDefault = require('./default')


test('connect event', function(t) {
  t.plan(6)

  var smqServer = socketmq.bind('tcp://127.0.0.1:6363')
  var smqClient = socketmq.connect('tcp://0.0.0.0:6363')

  testDefault(t, smqServer, smqClient)
})
