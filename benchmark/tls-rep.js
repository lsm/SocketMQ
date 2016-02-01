// req/rep benchmark script credit: https://github.com/nats-io/node-nats/tree/master/benchmark
var fs = require('fs')
var socketmq = require('../')

var smq = socketmq.bind('tls://localhost:6363', {
  key: fs.readFileSync('./certs/server-key.pem'),
  cert: fs.readFileSync('./certs/server-cert.pem'),
  ca: [fs.readFileSync('./certs/client-cert.pem')]
})

smq.on('bind', function() {
  console.log('tls server bound')
})

smq.on('connect', function(stream) {
  console.log('new tls connection')
})

smq.rep('request.test', function(msg, reply) {
  reply('ok')
})
