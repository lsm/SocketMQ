var fs = require('fs')
var path = require('path')
var test = require('tape')
var socketmq = require('../')
var testDefault = require('./default')

var certPath = path.join(__dirname, '../benchmark/certs')

module.exports = function() {
  test('tls: connect event', function(t) {

    var endpoint = 'tls://localhost:46363'
    var clientOptions = {
      key: fs.readFileSync(certPath + '/client-key.pem'),
      cert: fs.readFileSync(certPath + '/client-cert.pem'),
      ca: [fs.readFileSync(certPath + '/server-cert.pem')]
    }

    var smqServer = socketmq.bind(endpoint, {
      key: fs.readFileSync(certPath + '/server-key.pem'),
      cert: fs.readFileSync(certPath + '/server-cert.pem'),
      ca: [fs.readFileSync(certPath + '/client-cert.pem')]
    })

    var smqClient1 = socketmq.connect(endpoint, clientOptions, function() {
      t.notOk(smqClient1.hasTag(endpoint), 'default tag has not been added')
      t.ok(smqClient1.hasConnection(endpoint), 'endpoint connected')
    })

    var smqClient2 = socketmq.connect(endpoint, clientOptions)

    testDefault('tls', t, smqServer, smqClient1, smqClient2, endpoint, clientOptions)
  })
}
