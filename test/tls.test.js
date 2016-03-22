var fs = require('fs')
var path = require('path')
var test = require('tape')
var socketmq = require('../')
var testDefault = require('./default')

var certPath = path.join(__dirname, '../benchmark/certs')

module.exports = function() {
  test('tls: connect event', function(t) {

    var smqServer = socketmq.bind('tls://localhost:46363', {
      key: fs.readFileSync(certPath + '/server-key.pem'),
      cert: fs.readFileSync(certPath + '/server-cert.pem'),
      ca: [fs.readFileSync(certPath + '/client-cert.pem')]
    })

    var smqClient1 = socketmq.connect('tls://localhost:46363', {
      key: fs.readFileSync(certPath + '/client-key.pem'),
      cert: fs.readFileSync(certPath + '/client-cert.pem'),
      ca: [fs.readFileSync(certPath + '/server-cert.pem')]
    }, function() {
      t.notOk(smqClient1.hasTag('tls://localhost:46363'), 'default tag has not been added')
    })

    var smqClient2 = socketmq.connect('tls://localhost:46363', {
      key: fs.readFileSync(certPath + '/client-key.pem'),
      cert: fs.readFileSync(certPath + '/client-cert.pem'),
      ca: [fs.readFileSync(certPath + '/server-cert.pem')]
    })

    testDefault('tls', t, smqServer, smqClient1, smqClient2)
  })
}
