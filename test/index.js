var test = require('tape')
var testTCP = require('./tcp.test.js')
var testTLS = require('./tls.test.js')
var testEIO = require('./eio.test.js')

testTCP()
testTLS()
testEIO()

test.onFinish(function() {
  setImmediate(function() {
    process.exit(0)
  })
})
