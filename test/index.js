var test = require('tape')
var testTCP = require('./tcp.test.js')
var testTLS = require('./tls.test.js')

testTCP()
testTLS()

test.onFinish(function() {
  setImmediate(function() {
    process.exit(0)
  })
})
