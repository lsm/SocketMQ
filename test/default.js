var test = require('tape')

module.exports = function(name, t, smqServer, smqClient) {
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
  var str = 'str'
  var buffer = Buffer('buffer')

  test(name + ': pub/sub', function(t) {
    t.plan(5)

    smqServer.sub('test string', function(str1) {
      t.equal(str1, str, 'string match')
    })

    smqServer.sub('test buffer', function(buf1) {
      t.ok(Buffer.isBuffer(buf1), 'get buffer')
      t.equal(buf1.compare(buffer), 0, 'buffer match')
    })

    smqServer.sub('test multi arguments', function(arg1, arg2) {
      t.equal(arg1, msg1, 'arg1 match')
      t.equal(arg2, msg2, 'arg2 match')
    })

    smqClient.pub('test string', str)
    smqClient.pub('test buffer', buffer)
    smqClient.pub('test multi arguments', msg1, msg2)
  })

  test(name + ': req/rep', function(t) {
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
    })
  })
}
