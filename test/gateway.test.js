var fs = require('fs')
var path = require('path')
var test = require('tape')
var socketmq = require('../')
var type = require('../lib/message/type')

var certPath = path.join(__dirname, '../benchmark/certs')

module.exports = function() {
  var smqGateway = socketmq.gateway()

  smqGateway.isUntrusted = function(stream) {
    return 'eio:' === stream.__smq_protocol__
  }

  var eioClient
  var tcpClient
  var tlsClient
  var eioStream
  var tcpStream

  test('gateway: eio + tcp + tls', function(t) {
    t.plan(3)

    // Endpoints
    var eioEndpoint = 'eio://127.0.0.1:8082'
    var tcpEndpoint = 'tcp://127.0.0.1:6365'
    var tlsEndpoint = 'tls://localhost:46365'

    // Servers
    smqGateway.bind(eioEndpoint, function(stream) {
      eioStream = stream
      t.ok(stream, 'eio stream')
    })
    smqGateway.bind(tcpEndpoint, function(stream) {
      tcpStream = stream
      t.ok(stream, 'tcp stream')
    })
    smqGateway.bind(tlsEndpoint, {
      key: fs.readFileSync(certPath + '/server-key.pem'),
      cert: fs.readFileSync(certPath + '/server-cert.pem'),
      ca: [fs.readFileSync(certPath + '/client-cert.pem')]
    }, function(stream) {
      t.ok(stream, 'tls stream')
    })

    // Clients
    var tlsClientOptions = {
      key: fs.readFileSync(certPath + '/client-key.pem'),
      cert: fs.readFileSync(certPath + '/client-cert.pem'),
      ca: [fs.readFileSync(certPath + '/server-cert.pem')]
    }

    eioClient = socketmq.channel('/chat', 'my room')
    eioClient.connect(eioEndpoint)

    tcpClient = socketmq.channel('/chat')
    tcpClient.connect(tcpEndpoint)

    tlsClient = socketmq.channel('/chat', 'your room')
    tlsClient.connect(tlsEndpoint, tlsClientOptions)
  })

  test('gateway: allow/join', function(t) {
    t.plan(5)

    var allow = false
    tcpClient.allow(function(pack, stream, dispatch) {
      if (type.INF === pack.type && type.ACK === pack.event) {
        if (false === allow) {
          allow = true
          // INF ACK from eio
          t.equal(pack.msg.SUB[0], 'eio sub', 'INF ACK SUB')
          var meta = pack.meta
          t.equal(meta.MNS, '/chat', 'INF ACK MNS')
          t.equal(meta.MCH, 'my room', 'INF ACK MCH')
          t.equal(meta.SID, eioStream.id, 'INF ACK SID')
        }
        // Tell gateway what message we allow
        var msg = {
          SUB: ['eio sub'],
          REP: ['chat message', 'without callback', 'without callback multiple args']
        }
        tcpClient.queue.one([stream], {
          type: type.INF,
          event: type.ACK,
          msg: msg,
          meta: meta
        })
      }
      pack.meta.session = {
        id: 1
      }
      dispatch(pack, stream)
    })

    tlsClient.allow(function() {
      t.ok(false, 'tls should not get anything')
    })

    eioClient.on('join', function() {
      t.ok(true, 'eioClient joined')
    })

    eioClient.sub('eio sub', function() {})
    tcpClient.rep('trigger ack', function() {})
  })

  test('gateway: pub/sub', function(t) {
    t.plan(1)

    var gwPubMsg = 'gateway pub sub in /chat/my room'

    eioClient.sub('eio sub', function(arg1) {
      t.equal(arg1, gwPubMsg, 'eio get pub from tcp')
    })
    eioClient.sub('eio sub 2', function() {
      t.ok(false, 'should not get not allowed sub message')
    })

    tcpClient.pubChn('my room', 'eio sub', gwPubMsg)
    tcpClient.pubChn('my room', 'eio sub 2', gwPubMsg)
  })

  test('gateway: req/rep', function(t) {
    t.plan(15)

    var eioReqMsg = 'eio req msg'
    var tcpRepMsg = 'tcp rep msg'

    eioClient.rep('eio rep', function() {
      t.ok(false, 'should never get request or ACK rep')
    })
    tcpClient.reqChn('my room', 'eio rep', 'eio rep msg')

    tcpClient.rep('chat message', function(chn, msg, reply) {
      t.equal(chn, 'my room', 'tcp channel')
      t.equal(msg, eioReqMsg, 'eio req msg')
      t.ok(smqGateway.hasTag('SID::' + eioStream.id, eioStream), 'has SID tag')
      t.ok(smqGateway.hasTag('/chat::my room::REQ::chat message', eioStream), 'has REQ tag')
      t.ok(smqGateway.hasTag('/chat::my room::SUB::eio sub', eioStream), 'has SUB tag')
      reply(tcpRepMsg)
    })

    tcpClient.rep('chat message 2', function(chn, msg, reply) {
      t.ok(false, 'should never get request')
      reply(tcpRepMsg)
    })

    var nocb1 = 'nocb1'
    var nocb2 = 'nocb2'
    tcpClient.rep('without callback', function(chn, arg1, reply) {
      t.equal(chn, 'my room', 'without callback chn match')
      t.equal(arg1, nocb1, 'without callback arg1 match')
      t.equal(reply, undefined, 'without callback no reply')
    })
    tcpClient.rep('without callback multiple args', function(chn, arg1, arg2, reply) {
      t.equal(chn, 'my room', 'without callback multiple args chn match')
      t.equal(arg1, nocb1, 'without callback multiple args arg1 match')
      t.equal(arg2, nocb2, 'without callback multiple args arg2 match')
      t.equal(reply, undefined, 'without callback multiple args no reply')
    })

    setTimeout(function() {
      eioClient.req('chat message', eioReqMsg, function(msg) {
        t.equal(msg, tcpRepMsg, 'tcp rep msg')
        t.ok(smqGateway.hasTag('/chat::REP::chat message', tcpStream), 'has REP tag')
        t.ok(smqGateway.hasTag('/chat::ACK', tcpStream), 'has ACK tag')
      })
      eioClient.req('chat message 2', eioReqMsg, function() {
        t.ok(false, 'should never get reply')
      })

      eioClient.req('without callback', nocb1)
      eioClient.req('without callback multiple args', nocb1, nocb2)
    }, 100)
  })
}
