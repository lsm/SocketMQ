var test = require('tape')

module.exports = function(t, smqServer, smqClient) {
  smqServer.on('connect', function(stream) {
    t.pass('server connect event')
    t.ok(stream.readable, 'stream is readable')
    t.ok(stream.writable, 'stream is writable')
  })

  smqClient.on('connect', function(stream) {
    t.pass('client connect event')
    t.ok(stream.readable, 'stream is readable')
    t.ok(stream.writable, 'stream is writable')
  })


  var msg1 = 'msg1'
  var msg2 = 'msg2'

  test('pub/sub', function(t) {
    t.plan(2)

    smqServer.sub('test sub', function(arg1, arg2) {
      t.equal(arg1, msg1, 'pub arg1 match')
      t.equal(arg2, msg2, 'pub arg2 match')
    })

    smqClient.pub('test sub', msg1, msg2)
  })

  test('req/rep', function(t) {
    t.plan(5)

    smqClient.rep('test rep', function(arg1, arg2, reply) {
      t.equal(arg1, msg1, 'req arg1 match')
      t.equal(arg2, msg2, 'req arg2 match')
      reply(null, arg2, arg1)
    })

    smqServer.req('test rep', msg1, msg2, function(err, arg2, arg1) {
      t.equal(err, null, 'rep err match')
      t.equal(arg1, msg1, 'rep arg1 match')
      t.equal(arg2, msg2, 'rep arg1 match')
      finish()
    })
  })
}

function finish() {
  setImmediate(function() {
    process.exit(0)
  })
}
