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

  test('hub: eio + tcp + tls', function(t) {
    t.plan(1)

    // Endpoints
    var eioEndpoint = 'eio://127.0.0.1:8081'
    var tcpEndpoint = 'tcp://127.0.0.1:6364'
    var tlsEndpoint = 'tls://localhost:46364'

    // Servers
    smqHub.bind(eioEndpoint)
    smqHub.bind(tcpEndpoint, function(stream) {
      t.ok(stream)
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
  })

  test('hub: pub/sub', function(t) {
    t.plan(2)
    var msg = 'hub pub sub'

    eioClient.sub('pub sub', function(arg1) {
      t.equal(arg1, msg)
    })
    tcpClient.sub('pub sub', function(arg1) {
      t.equal(arg1, msg)
    })
    tlsClient.sub('pub sub', function() {
      t.notOk(true)
    })

    tlsClient.pub('pub sub', msg)
  })
}
