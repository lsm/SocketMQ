var test = require('tape')

module.exports = function(name, T, smqServer, smqClient1, smqClient2) {
  T.plan(12)

  var serverStream1
  var serverStream2

  smqServer.on('connect', function(stream) {
    if (serverStream1)
      serverStream2 = stream
    else
      serverStream1 = stream
    T.pass('server connect event')
    T.ok(stream.readable, 'stream is readable')
    T.ok(stream.writable, 'stream is writable')
  })

  var clientStream1
  smqClient1.on('connect', function(stream) {
    clientStream1 = stream
    T.pass('client connect event')
    T.ok(stream.readable, 'stream is readable')
    T.ok(stream.writable, 'stream is writable')
  })

  smqClient2.on('connect', function(stream) {
    T.pass('client connect event')
    T.ok(stream.readable, 'stream is readable')
    T.ok(stream.writable, 'stream is writable')
  })

  var msg1 = 'msg1'
  var msg2 = 'msg2'
  var str = 'str'
  var buffer = Buffer('buffer')

  test(name + ': pub/sub', function(t) {
    t.plan(11)

    smqServer.sub('test string', function(str1) {
      t.equal(str1, str, 'string match')
    })

    smqServer.sub('test buffer', function(buf1) {
      t.ok(Buffer.isBuffer(buf1), 'get buffer')
      t.equal(buf1.toString(), buffer.toString(), 'buffer match')
    })

    smqServer.sub('test multi arguments', function(arg1, arg2) {
      t.equal(arg1, msg1, 'arg1 match')
      t.equal(arg2, msg2, 'arg2 match')
    })

    smqClient1.pub('test string', str)
    smqClient1.pub('test buffer', buffer)
    smqClient1.pub('test multi arguments', msg1, msg2)

    // Pub to multiple clients

    smqClient1.sub('from server', function(arg1, arg2, arg3) {
      t.equal(arg1, msg1, 'client1 arg1 match')
      t.equal(arg2, msg2, 'client1 arg2 match')
      t.equal(arg3, str, 'client1 str match')
    })

    smqClient2.sub('from server', function(arg1, arg2, arg3) {
      t.equal(arg1, msg1, 'client2 arg1 match')
      t.equal(arg2, msg2, 'client2 arg2 match')
      t.equal(arg3, str, 'client2 str match')
    })

    smqServer.pub('from server', msg1, msg2, str)
  })

  test(name + ': req/rep', function(t) {
    t.plan(5)

    smqClient1.rep('test rep', function(arg1, arg2, reply) {
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

  test(name + ': tag clients', function(t) {
    t.notEqual(serverStream1.remotePort, serverStream2.remotePort, 'get 2 clients')

    if (serverStream1.remotePort === clientStream1.localPort) {
      smqServer.tag(serverStream1, 'client1')
      smqServer.tag(serverStream2, 'client2')
    } else {
      smqServer.tag(serverStream1, 'client2')
      smqServer.tag(serverStream2, 'client1')
    }

    t.ok(smqServer.hasTag('client1'), 'has tag "client1"')
    t.ok(smqServer.hasTag('client2'), 'has tag "client2"')

    t.end()
  })

  test(name + ': send messages to tagged clients', function(t) {
    t.plan(14)

    smqClient1.rep('only for client1', function(msg, arg1, reply) {
      t.equal(msg, 'hello client1', 'hello client1 match')
      t.equal(arg1, msg1, 'arg1 match')
      reply('data from client1', msg2)
    })

    var i = 3
    while (i-- > 0) {
      // tag, topic/event, messages..., callback
      smqServer.reqTag('client1', 'only for client1', 'hello client1', msg1, function(data, arg2) {
        t.equal(data, 'data from client1', 'data from client1 match')
        t.equal(arg2, msg2, 'arg2 match')
      })
    }

    smqClient2.sub('only for client2', function(msg, arg2) {
      t.equal(msg, 'hello client2', 'hello client2 match')
      t.equal(arg2, msg2, 'arg2 match')
    })

    smqClient1.sub('only for client2', function(msg, arg2) {
      t.notOk(true, 'get msg for client2')
    })

    smqServer.pubTag('client2', 'only for client2', 'hello client2', msg2)
  })
}
