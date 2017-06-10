var test = require('tape')
var socketmq = require('../index')

module.exports = function(name, T, smqServer, smqClient1, smqClient2, endpoint, options) {
  // 4 were in the tcp/tls/eio transport tests
  T.plan(25)

  var serverStream1
  var serverStream2

  function onServerConnect(stream) {
    if (serverStream1)
      serverStream2 = stream
    else
      serverStream1 = stream
    T.pass('server connect event')
    T.ok(stream.readable, 'server stream is readable')
    T.ok(stream.writable, 'server stream is writable')
  }

  smqServer.on('connect', onServerConnect)

  var clientStream1
  function onClient1Connect(stream) {
    clientStream1 = stream
    T.pass('client1 connect event')
    T.ok(stream.readable, 'stream1 is readable')
    T.ok(stream.writable, 'stream1 is writable')
    T.ok(smqClient1.hasTag(endpoint), 'client1 has default tag')
    T.equal(smqClient1.tag(endpoint, 'tag by uri'), 1, 'tag by endpoint uri')
    T.equal(smqClient1.tag(endpoint, 'tag by uri'), 0, 'tag existing tag again')
    T.ok(smqClient1.hasTag('tag by uri'), 'client1 has tag tagged by endpoint uri')
  }

  smqClient1.on('connect', onClient1Connect)

  var clientStream2
  smqClient2.on('connect', function(stream) {
    clientStream2 = stream
    T.pass('client2 connect event')
    T.ok(stream.readable, 'stream2 is readable')
    T.ok(stream.writable, 'stream2 is writable')
    T.ok(smqClient2.hasTag(endpoint), 'client2 has default tag')
    T.equal(smqClient1.tag(endpoint + '123456', 'tag by non-existent uri'), false, 'tag by non-existent uri')
    T.notOk(smqClient1.hasTag('tag by non-existent uri'), 'tag by non-existent uri')
  })

  var msg1 = 'msg1'
  var msg2 = 'msg2'
  var obj = {
    key: 'value'
  }
  var arr = ['a', 1, obj]
  var num = 6
  var str = 'str'
  var buffer = Buffer('buffer')

  test(name + ': pub/sub', function(t) {
    t.plan(20)

    smqServer.sub('test string', function(str1) {
      t.equal(str1, str, 'string match')
    })

    smqServer.sub('test buffer', function(buf1) {
      t.ok(Buffer.isBuffer(buf1), 'get buffer')
      t.equal(buf1.toString(), buffer.toString(), 'buffer match')
    })

    smqServer.sub('test object', function(obj1) {
      t.ok(obj1 && 'object' === typeof obj1, 'get object')
      t.equal(obj1.key, obj.key, 'object match')
    })

    smqServer.sub('test array', function(arr1) {
      t.ok(arr1 && Array.isArray(arr1), 'get array')
      t.equal(arr1[0], 'a', 'array[0] match')
      t.equal(arr1[1], 1, 'array[1] match')
      t.equal(arr1[2].key, obj.key, 'array[2] match')
    })

    smqServer.sub('test number', function(num1) {
      t.equal(num1, 6, 'number match')
    })

    smqServer.sub('test multi arguments', function(arg1, arg2) {
      t.equal(arg1, msg1, 'arg1 match')
      t.equal(arg2, msg2, 'arg2 match')
    })

    smqServer.sub('test no arguments', function(arg1, arg2) {
      t.equal(arg1, undefined, 'no arg1')
      t.equal(arg2, undefined, 'no arg2')
    })

    smqClient1.pub('test string', str)
    smqClient1.pub('test buffer', buffer)
    smqClient1.pub('test object', obj)
    smqClient1.pub('test array', arr)
    smqClient1.pub('test number', num)
    smqClient1.pub('test multi arguments', msg1, msg2)
    smqClient1.pub('test no arguments')

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
    t.plan(20)

    // Single argument with callback
    smqServer.rep('test reply object', function(arg1, reply) {
      t.equal(arg1.key, obj.key, 'req object match')
      reply(obj)
    })
    smqClient2.req('test reply object', obj, function(obj1) {
      t.equal(obj1.key, obj.key, 'rep object match')
    })

    // Multiple arguments with callback
    smqServer.rep('test rep', function(arg1, arg2, reply) {
      t.equal(arg1, msg1, 'req arg1 match')
      t.equal(arg2, msg2, 'req arg2 match')
      reply(null, arg2, arg1)
    })
    smqClient1.req('test rep', msg1, msg2, function(err, arg2, arg1) {
      t.equal(err, null, 'rep err match')
      t.equal(arg1, msg1, 'rep arg1 match')
      t.equal(arg2, msg2, 'rep arg1 match')
    })

    // Single arguments no callback
    smqServer.rep('without callback', function(arg1, reply) {
      t.equal(arg1, msg1, 'without callback arg1 match')
      t.equal(reply, undefined, 'without callback no reply')
    })
    smqClient1.req('without callback', msg1)

    // Multiple arguments no callback
    smqServer.rep('without callback multiple args', function(arg1, arg2, reply) {
      t.equal(arg1, msg1, 'without callback multiple args arg1 match')
      t.equal(arg2, msg2, 'without callback multiple args arg2 match')
      t.equal(reply, undefined, 'without callback multiple args no reply')
    })
    smqClient2.req('without callback multiple args', msg1, msg2)

    // No argument with no callback
    smqServer.rep('without arguments', function(arg1, arg2, arg3) {
      t.equal(arg1, undefined, 'no arguments arg1')
      t.equal(arg2, undefined, 'no arguments arg2')
      t.equal(arg3, undefined, 'no arguments arg3')
    })
    smqClient2.req('without arguments')

    // With only callback
    var onlyCallbackMsg = 'onlyCallbackMsg'
    smqServer.rep('with only callback', function(reply) {
      t.equal(typeof reply, 'function', 'got reply function')
      reply(onlyCallbackMsg)
    })
    smqClient2.req('with only callback', function(msg) {
      t.equal(msg, onlyCallbackMsg, 'replied message match')
    })

    // With undefined message and callback
    var undefinedCallbackMsg = 'undefinedCallbackMsg'
    smqServer.rep('with undefined & callback', function(msg, reply) {
      t.equal(msg, null, 'got msg value undefined')
      t.equal(typeof reply, 'function', 'got reply function')
      reply(undefinedCallbackMsg)
    })
    smqClient2.req('with undefined & callback', undefined, function(msg) {
      t.equal(msg, undefinedCallbackMsg, 'replied message match')
    })
  })

  test(name + ': tag clients', function(t) {
    t.notEqual(serverStream1.remotePort, serverStream2.remotePort, 'get 2 clients')

    if (serverStream1.remotePort === clientStream1.localPort || !clientStream1.localPort) {
      smqServer.tag(serverStream1, 'client1')
      smqServer.tag(serverStream2, 'client2')
    } else {
      smqServer.tag(serverStream1, 'client2')
      smqServer.tag(serverStream2, 'client1')
    }

    t.ok(smqServer.hasTag('client1'), 'has tag "client1"')
    t.ok(smqServer.hasTag('client2'), 'has tag "client2"')

    t.notOk(smqServer.tag(serverStream1, {}), 'tagging should fail if the tag is an object')
    t.notOk(smqServer.tag(serverStream1, 1), 'tagging should fail if the tag is a number')
    t.notOk(smqServer.tag(serverStream1, function() {}), 'tagging should fail if the tag is a number')
    t.notOk(smqServer.tag(serverStream1, arguments), 'tagging should fail if the tag is not a array')

    t.end()
  })

  test(name + ': send messages to tagged clients', function(t) {
    t.plan(18)

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

    smqClient1.sub('pubTag for client1 no msg', function(arg1, arg2) {
      t.equal(arg1, undefined, 'no arg1')
      t.equal(arg2, undefined, 'no arg2')
    })
    smqServer.pubTag('client1', 'pubTag for client1 no msg')

    smqClient1.rep('reqTag for client1 no msg', function(arg1, arg2) {
      t.equal(arg1, undefined, 'no arg1')
      t.equal(arg2, undefined, 'no arg2')
    })
    smqServer.reqTag('client1', 'reqTag for client1 no msg')
  })

  test(name + ': channel UNSUBS', function(t) {
    t.plan(6)

    var s1 = smqServer.channel('unsub')
    var c1 = smqClient2.channel('unsub', 'channel1')
    var c2 = smqClient2.channel('unsub', 'channel1')

    var message = 'test'

    s1.rep('reply', function(channel, msg) {
      t.equal(channel, 'channel1', 'channel name')
      t.equal(msg, message, 'message content')
    })

    c1.req('reply', message)
    c2.req('reply', message)

    c2.leave(socketmq.type.UNSUBS)

    setTimeout(function() {
      c1.req('reply', message)
    }, 100)
  })

  test(name + ': disconnect', function(t) {
    t.plan(1)
    smqClient1.once('disconnect', function(stream) {
      t.equal(stream, clientStream1, 'clientStream1 disconnected')
    })
    clientStream1.end()
  })

  test(name + ': error', function(t) {
    t.plan(3)

    smqClient1.on('error', function(event) {
      t.equal(event.type, smqClient1.ERR_UNWRITABLE, 'emit unwritable error')
    })

    smqClient1.removeListener('connect', onClient1Connect)
    smqClient1.addStream(clientStream1)
    smqClient1.pub('event', 'can not be sent')
    smqClient1.removeAllListeners('disconnect')
    smqClient1.removeStream(clientStream1)

    smqClient2.once('error', function handle(event) {
      t.equal(event.type, smqClient2.ERR_NO_TAGGED_STREAM, 'client emit no stream for tag error')
    })
    smqClient2.reqTag('no such tag', 'event', 'message', function() {})

    smqServer.on('error', function(event) {
      t.equal(event.type, smqClient2.ERR_NO_TAGGED_STREAM, 'server emit no stream for tag error')
    })
    smqServer.pubTag('no such tag', 'event', 'message')
  })

  test(name + ': error ERR_STREAM', function(t) {
    t.plan(4)
    smqClient2.on('disconnect', function(stream) {
      t.equal(stream, clientStream2, 'disconnect stream match')
    })
    smqClient2.on('error', function(event) {
      t.equal(event.type, smqClient2.ERR_STREAM, 'error type match')
      t.equal(event.error, 'some error', 'error match')
      t.equal(event.stream, clientStream2, 'error stream match')
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
    smqClient1.connect(endpoint, options)
  })

  test(name + ': channel', function(t) {
    t.plan(16)

    var serverChatChannel = smqServer.channel('chat')
    var serverRadioChannel = smqServer.channel('radio', 'lobby')
    var clientChatLobby = smqClient1.channel('chat', 'lobby')
    var clientRadioLobby = smqClient1.channel('radio', 'lobby')
    var clientChatPrivate = smqClient1.channel('chat', 'private')

    var msgLobby = 'message to lobby'
    var msgPrivate = 'message to private'
    var msgRadio = 'I am a creep'
    var repRadio = 'I wish I was special'

    // This will be called twice
    serverChatChannel.sub('to lobby', function(channel, msg) {
      t.equal(['lobby', 'private'].indexOf(channel) > -1, true, 'chat to lobby channel ' + channel)
      t.equal(msg, msgLobby, 'to lobby message')
    })

    clientChatLobby.sub('to private', function() {
      t.ok(false, 'Channel chat/lobby should never receive private message')
    })

    clientChatPrivate.sub('to private', function(msg) {
      t.equal(msg, msgPrivate, 'to private message')
    })

    clientRadioLobby.rep('creep', function(msg, reply) {
      t.equal(msg, msgRadio, 'radio/lobby req message')
      reply(repRadio)
    })

    serverRadioChannel.rep('not creep', function() {
      t.ok(false, 'Should not receive message for other channel')
    })

    clientChatLobby.pub('to lobby', msgLobby)
    clientRadioLobby.pub('to lobby', msgLobby)
    clientChatPrivate.pub('to lobby', msgLobby)
    serverChatChannel.pubChn('private', 'to private', msgPrivate)
    serverRadioChannel.req('creep', msgRadio, function(msg) {
      t.equal(msg, repRadio, 'radio/lobby rep message')
    })
    clientRadioLobby.reqChn('other channel', 'not creep', 'hello')

    serverChatChannel.sub('to lobby no msg', function(channel, msg) {
      t.equal(channel, 'lobby', 'channel "lobby"')
      t.equal(msg, undefined, 'no msg')
    })
    clientChatLobby.pub('to lobby no msg')

    clientChatPrivate.sub('to private no msg', function(msg) {
      t.equal(msg, undefined, 'no msg')
    })
    serverChatChannel.pubChn('private', 'to private no msg')

    serverChatChannel.sub('to private no msg', function(channel, msg) {
      t.equal(channel, 'private', 'channel "private"')
      t.equal(msg, undefined, 'no msg')
    })
    clientChatPrivate.pub('to private no msg')

    serverChatChannel.rep('req lobby no msg', function(channel, msg) {
      t.equal(channel, 'lobby', 'channel "lobby"')
      t.equal(msg, undefined, 'no msg')
    })
    clientChatLobby.req('req lobby no msg')
    clientChatPrivate.reqChn('lobby', 'req lobby no msg')
  })

  test(name + ': channel disconnect', function(t) {
    t.plan(5)
    var serverChannel = smqServer.channel('namespace')
    var clientChannel = smqClient1.channel('namespace', 'room')

    serverChannel.sub('message', function(channel, msg) {
      t.equal('room', channel, 'channel name is correct')
      t.equal('some message', msg, 'message is correct')
      setTimeout(function() {
        smqClient1.close(smqClient1.streams[0])
      }, 100)
    })

    clientChannel.on('leave', function(reason, ns, chn) {
      t.equal(reason, socketmq.type.DISCON, 'leave reason DISCON')
      t.equal(ns, 'namespace', 'ns is namespace')
      t.equal(chn, 'room', 'channel is room')
    })

    clientChannel.pub('message', 'some message')
  })
}
