var fs = require('fs')
var path = require('path')
var test = require('tape')
var socketmq = require('../')

var certPath = path.join(__dirname, '../benchmark/certs')

module.exports = function() {
  var smqHub = socketmq.hub()
  var eioClient
  var tcpClient
  var tlsClient
  var eioStream
  var tcpStream

  test('hub: eio + tcp + tls', function(t) {
    t.plan(2)

    // Endpoints
    var eioEndpoint = 'eio://127.0.0.1:8081'
    var tcpEndpoint = 'tcp://127.0.0.1:6364'
    var tlsEndpoint = 'tls://localhost:46364'

    // Servers
    smqHub.bind(eioEndpoint, function(stream) {
      eioStream = stream
      t.ok(stream, 'eio stream')
    })
    smqHub.bind(tcpEndpoint, function(stream) {
      tcpStream = stream
      t.ok(stream, 'tcp stream')
    })
    smqHub.bind(tlsEndpoint, {
      key: fs.readFileSync(certPath + '/server-key.pem'),
      cert: fs.readFileSync(certPath + '/server-cert.pem'),
      ca: [fs.readFileSync(certPath + '/client-cert.pem')]
    })

    // Clients
    var tlsClientOptions = {
      key: fs.readFileSync(certPath + '/client-key.pem'),
      cert: fs.readFileSync(certPath + '/client-cert.pem'),
      ca: [fs.readFileSync(certPath + '/server-cert.pem')]
    }

    eioClient = socketmq.connect(eioEndpoint)
    tcpClient = socketmq.connect(tcpEndpoint)
    tlsClient = socketmq.connect(tlsEndpoint, tlsClientOptions)

    eioClient.pub('eio pub', ['eio', 3])
  })

  test('hub: pub/sub', function(t) {
    t.plan(6)
    var msg = 'hub pub sub'

    eioClient.sub('eio sub', function(arg1) {
      t.equal(arg1, msg, 'eio get pub from tls')
      t.equal(eioStream.__smq_tags__[0], 'SUB::eio sub', 'eio stream has SUB tag')
    })

    tcpClient.sub('tcp sub', function(arg1) {
      t.equal(arg1, msg, 'tcp get pub from tls')
      t.equal(tcpStream.__smq_tags__[0], 'SUB::tcp sub', 'tcp stream has SUB tag')
    })

    tlsClient.sub('eio sub', function() {
      t.notOk(true, 'tls should not get "eio pub" msg from itself')
    })
    tlsClient.sub('tcp sub', function() {
      t.notOk(true, 'tls should not get "tcp pub" msg from itself')
    })

    tlsClient.sub('eio pub', function(arr) {
      t.equal(arr[0], 'eio', 'eio->tls arr[0] match')
      t.equal(arr[1], 3, 'eio->tls arr[1] match')
    })

    tlsClient.pub('tcp sub', msg)
    tlsClient.pub('eio sub', msg)
  })

  test('hub: req/rep', function(t) {
    t.plan(7)
    var msg = 'hub request'
    var msgNoCB = 'hub request no cb'
    var reMsg = 'hub reply'
    var event = 'req rep'

    tlsClient.rep(event, function(arg1, reply) {
      t.equal(arg1, msg, 'tls req match')
      reply(reMsg)
    })

    tcpClient.req(event, msg, function(arg1) {
      t.equal(arg1, reMsg, 'tcp rep match')
    })

    tcpClient.rep('without callback', function(arg1, reply) {
      t.equal(arg1, msgNoCB, 'without callback arg1 match')
      t.equal(reply, undefined, 'without callback no reply')
    })
    tlsClient.req('without callback', msgNoCB)

    eioClient.rep('without callback multiple args', function(arg1, arg2, reply) {
      t.equal(arg1, msgNoCB, 'without callback multiple args arg1 match')
      t.equal(arg2, reMsg, 'without callback multiple args arg2 match')
      t.equal(reply, undefined, 'without callback multiple args no reply')
    })
    tlsClient.req('without callback multiple args', msgNoCB, reMsg)
  })

  test('hub: channel', function(t) {
    t.plan(8)
    var tlsChatLobby = tlsClient.channel('chat', 'lobby')
    var tcpRadioLobby = tcpClient.channel('radio', 'lobby')
    var eioChatLobby = eioClient.channel('chat', 'lobby')
    var tlsRadio = tlsClient.channel('radio')

    var msgLobby = 'message to lobby'
    var msgRadio = 'I am a creep'
    var repRadio = 'I wish I was special'

    tlsClient.sub('to chat/lobby', function(msg) {
      t.equal(msg, msgLobby, 'main socket chat/lobby message')
    })

    tlsChatLobby.sub('to chat/lobby', function(msg) {
      t.equal(msg, msgLobby, 'to chat/lobby message')
    })

    tcpClient.sub('to chat/lobby', function() {
      t.ok(false, 'should not receive message for other namespace')
    })

    tcpRadioLobby.sub('to chat/lobby', function() {
      t.ok(false, 'should not receive message for other namespace')
    })

    tcpRadioLobby.rep('creep', function(msg, reply) {
      t.equal(msg, msgRadio, 'radio/lobby req')
      reply(repRadio)
    })

    tlsRadio.reqChn('lobby', 'creep', msgRadio, function(msg) {
      t.equal(msg, repRadio, 'radio/lobby rep')
    })

    eioChatLobby.rep('no callback', function(arg1, arg2, arg3, reply) {
      t.equal(arg1, msgLobby, 'arg1 match')
      t.equal(arg2, msgRadio, 'arg2 match')
      t.equal(arg3, repRadio, 'arg3 match')
      t.equal(reply, undefined, 'no reply function')
    })

    eioChatLobby.pub('to chat/lobby', msgLobby)

    tlsChatLobby.req('no callback', msgLobby, msgRadio, repRadio)
  })
}
