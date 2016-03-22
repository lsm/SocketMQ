var test = require('tape')

module.exports = function(name, T, smqServer, smqClient1, smqClient2) {
  T.plan(15)

  var serverStream1
  var serverStream2

  function onServerConnect(stream) {
    if (serverStream1)
      serverStream2 = stream
    else
      serverStream1 = stream
    T.pass('server connect event')
    T.ok(stream.readable, 'stream is readable')
    T.ok(stream.writable, 'stream is writable')
  }

  smqServer.on('connect', onServerConnect)

  var clientStream1
  function onClient1Connect(stream) {
    clientStream1 = stream
    T.pass('client1 connect event')
    T.ok(stream.readable, 'stream is readable')
    T.ok(stream.writable, 'stream is writable')
    if ('tcp' === name)
      T.ok(smqClient1.hasTag('tcp://127.0.0.1:6363'), 'client1 has default tag')
    if ('tls' === name)
      T.ok(smqClient1.hasTag('tls://localhost:46363'), 'client1 has default tag')
  }

  smqClient1.on('connect', onClient1Connect)

  var clientStream2
  smqClient2.on('connect', function(stream) {
    clientStream2 = stream
    T.pass('client2 connect event')
    T.ok(stream.readable, 'stream is readable')
    T.ok(stream.writable, 'stream is writable')
    if ('tcp' === name)
      T.ok(smqClient2.hasTag('tcp://127.0.0.1:6363'), 'client2 has default tag')
    if ('tls' === name)
      T.ok(smqClient2.hasTag('tls://localhost:46363'), 'client2 has default tag')
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
      t.notOk(true, 'client1 should not get messages for client2')
    })

    smqServer.pubTag('client2', 'only for client2', 'hello client2', msg2)
  })

  test(name + ': disconnect', function(t) {
    t.plan(1)
    smqClient1.on('disconnect', function(stream) {
      t.equal(stream, clientStream1)
    })
    clientStream1.end()
  })

  test(name + ': error', function(t) {
    t.plan(3)

    smqClient1.on('error', function(error) {
      t.equal(error, smqClient1.ERR_UNWRITABLE, 'emit unwritable error')
    })

    smqClient1.removeListener('connect', onClient1Connect)
    smqClient1.addStream(clientStream1)
    smqClient1.pub('event', 'can not be sent')
    smqClient1.removeAllListeners('disconnect')
    smqClient1.removeStream(clientStream1)

    smqClient2.on('error', function(error) {
      t.equal(error, smqClient2.ERR_NO_TAGGED_STREAM, 'client emit no stream for tag error')
    })
    smqClient2.reqTag('no such tag', 'event', 'message', function() {})

    smqServer.on('error', function(error) {
      t.equal(error, smqClient2.ERR_NO_TAGGED_STREAM, 'server emit no stream for tag error')
    })
    smqServer.pubTag('no such tag', 'event', 'message')
  })

  if ('tcp' === name) {
    // @todo tls fire duplicated `disconnect` event

    test(name + ': streamError', function(t) {
      t.plan(3)
      smqClient2.on('disconnect', function(stream) {
        t.equal(stream, clientStream2, 'disconnect stream match')
      })
      smqClient2.on('streamError', function(err, stream) {
        t.equal(err, 'some error', 'streamError error match')
        t.equal(stream, clientStream2, 'streamError stream match')
      })
      clientStream2.emit('error', 'some error')
    })

    test(name + ': pending messages', function(t) {
      t.plan(3)

      var reqEvent = name + ' pending req'
      smqClient1.req(reqEvent, 'pending req msg', function(data) {
        t.equal(data, 'pending req reply', 'pending req reply')
      })

      smqServer.rep(reqEvent, function(msg, reply) {
        t.equal(msg, 'pending req msg', 'pending req msg')
        reply('pending req reply')
      })

      var pubEvent = name + ' pending pub'
      smqClient1.pub(pubEvent, 'pending pub msg')
      smqServer.sub(pubEvent, function(msg) {
        t.equal(msg, 'pending pub msg', 'pending pub msg')
      })

      smqServer.removeListener('connect', onServerConnect)
      smqClient1.connect('tcp://127.0.0.1:6363')
    })
  }
}
