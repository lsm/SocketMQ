var test = require('tape')
var testTCP = require('./tcp.test.js')
var testTLS = require('./tls.test.js')
var testEIO = require('./eio.test.js')
var testHub = require('./hub.test.js')
var testGateway = require('./gateway.test.js')

testTCP()
testTLS()
testEIO()
testHub()
testGateway()

test.onFinish(function() {
  setImmediate(function() {
    process.exit(0)
  })
})
