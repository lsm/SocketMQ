var fs = require('fs')
var path = require('path')
var test = require('tape')
var socketmq = require('../')
var type = socketmq.type

var certPath = path.join(__dirname, '../benchmark/certs')

module.exports = function() {
  var smqGateway = socketmq.gateway()

  smqGateway.isUntrusted = function(stream) {
    return 'eio' === stream.__smq__.protocol
  }

  var eioClient
  var tcpClient
  var tlsClient
  var eioStream
  var tcpStream

  // Endpoints
  var eioEndpoint = 'eio://127.0.0.1:7072'
  var tcpEndpoint = 'tcp://127.0.0.1:6365'
  var tlsEndpoint = 'tls://localhost:46365'

  test('gateway: eio + tcp + tls', function(t) {
    t.plan(3)

    // Servers
    smqGateway.bind(eioEndpoint, function(stream) {
      eioStream = stream
      t.ok(stream, 'eio stream')
    })
    smqGateway.bind(tcpEndpoint, function(stream) {
      if (!tcpStream) t.ok(stream, 'tcp stream')
      tcpStream = stream
    })
    smqGateway.bind(
      tlsEndpoint,
      {
        key: fs.readFileSync(certPath + '/server-key.pem'),
        cert: fs.readFileSync(certPath + '/server-cert.pem'),
        ca: [fs.readFileSync(certPath + '/client-cert.pem')]
      },
      function(stream) {
        t.ok(stream, 'tls stream')
      }
    )

    // Clients
    var tlsClientOptions = {
      key: fs.readFileSync(certPath + '/client-key.pem'),
      cert: fs.readFileSync(certPath + '/client-cert.pem'),
      ca: [fs.readFileSync(certPath + '/server-cert.pem')]
    }

    var bindCount = 0
    smqGateway.on('bind', function() {
      bindCount += 1
      if (3 === bindCount) {
        eioClient = socketmq.channel('/chat', 'my room')
        eioClient.connect(eioEndpoint)
        eioClient.sub('eio sub', function() {})

        tcpClient = socketmq.channel('/chat')
        tcpClient.connect(tcpEndpoint)

        tlsClient = socketmq.channel('/talk')
        tlsClient.connect(tlsEndpoint, tlsClientOptions)
      }
    })
  })

  test('gateway: allow/join', function(t) {
    t.plan(7)

    var tested = false
    tcpClient.allow(function(pack, stream, dispatch) {
      if (type.INF === pack.type && type.ACK === pack.event) {
        var meta = pack.meta
        if (false === tested) {
          tested = true
          // INF ACK from eio
          t.equal(pack.msg.SUB[0], 'eio sub', 'INF ACK SUB')
          t.equal(meta.MNS, '/chat', 'INF ACK MNS')
          t.equal(meta.MCH, 'my room', 'INF ACK MCH')
          t.equal(meta.SID, eioStream.id, 'INF ACK SID')
        }
        // Tell gateway what message we allow
        var msg = {
          SUB: ['eio sub'],
          REP: [
            'chat message',
            'without callback',
            'without callback multiple args'
          ]
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

    eioClient.once('join', function onjoin(reason, ns, chn) {
      t.equal(reason, type.JOINED, 'join reason match')
      t.equal(ns, '/chat', 'join ns match')
      t.equal(chn, 'my room', 'join chn match')
    })

    tcpClient.rep('trigger ack', function() {})
    tcpClient.queue.ack()
    eioClient.queue.ack()
    tlsClient.queue.ack()
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
      t.ok(
        smqGateway.hasTag('/chat::my room::REQ::chat message', eioStream),
        'has REQ tag'
      )
      t.ok(
        smqGateway.hasTag('/chat::my room::SUB::eio sub', eioStream),
        'has SUB tag'
      )
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
    tcpClient.rep('without callback multiple args', function(
      chn,
      arg1,
      arg2,
      reply
    ) {
      t.equal(chn, 'my room', 'without callback multiple args chn match')
      t.equal(arg1, nocb1, 'without callback multiple args arg1 match')
      t.equal(arg2, nocb2, 'without callback multiple args arg2 match')
      t.equal(reply, undefined, 'without callback multiple args no reply')
    })

    tcpClient.queue.ack()

    eioClient.req('chat message', eioReqMsg, function(msg) {
      t.equal(msg, tcpRepMsg, 'tcp rep msg')
      t.ok(
        smqGateway.hasTag('/chat::REP::chat message', tcpStream),
        'has REP tag'
      )
      t.ok(smqGateway.hasTag('/chat::ACK', tcpStream), 'has ACK tag')
    })
    eioClient.req('chat message 2', eioReqMsg, function() {
      t.ok(false, 'should never get reply')
    })
    eioClient.req('without callback', nocb1)
    eioClient.req('without callback multiple args', nocb1, nocb2)
  })

  test('gateway: leave', function(t) {
    t.plan(7)

    eioClient.once('leave', function(reason, ns, chn) {
      t.equal(ns, '/chat', 'leave namepace')
      t.equal(chn, 'my room', 'leave channel')
      t.equal(reason, type.EXITED, 'leave reason')
    })

    t.throws(
      function() {
        eioClient.join()
      },
      /`join` requires channel name/,
      'exception: channel name is required'
    )
    t.throws(
      function() {
        eioClient.join('new room')
      },
      /Already in channel "my room", leave it first/,
      'exception: already joined'
    )

    tcpClient.left(function(pack, stream) {
      t.equal(stream, tcpClient.streams[0], 'left stream')
      t.equal(pack.msg[0], type.EXITED, 'left reason')
      tcpClient.left(null) // Reset left handler
    })

    eioClient.leave()

    tcpClient.pubChn('my room', 'eio sub', 'message should not be delivered')
  })

  test('gateway: re-join, disconnect & reconnect', function(t) {
    t.plan(14)

    eioClient.once('join', function(reason, ns, chn) {
      t.equal(reason, type.JOINED, 're-join reason')
      t.equal(ns, '/chat', 're-join ns')
      t.equal(chn, 'my room', 're-join chn')
      tcpClient.close(tcpStream)
    })

    eioClient.once('leave', function(reason, ns, chn) {
      t.equal(ns, '/chat', 'SRVERR leave namepace')
      t.equal(chn, 'my room', 'SRVERR leave channel')
      t.equal(reason, type.SRVERR, 'SRVERR leave reason')

      eioClient.on('join', function(reason, ns, chn) {
        t.equal(reason, type.JOINED, 'reconnect join reason')
        t.equal(ns, '/chat', 'reconnect join ns')
        t.equal(chn, 'my room', 'reconnect join chn')
        eioClient.close(eioClient.streams[0])
      })

      eioClient.once('leave', function(reason, ns, chn) {
        t.equal(ns, '/chat', 'DISCON leave namepace')
        t.equal(chn, 'my room', 'DISCON leave channel')
        t.equal(reason, type.DISCON, 'DISCON leave reason')
      })

      tcpClient.left(function(pack, stream) {
        t.equal(stream, tcpClient.streams[0], 'DISCON left stream')
        t.equal(pack.msg[0], type.DISCON, 'DISCON left reason')
      })

      // Connect again and test disconnect from unstrusted streams
      tcpClient.connect(tcpEndpoint, function() {
        // Re-join after tcpClient is connected
        setTimeout(function() {
          eioClient.join('my room')
        }, 300)
      })
    })

    eioClient.join('my room')
  })
}
