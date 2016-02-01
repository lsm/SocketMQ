// req/rep benchmark script credit: https://github.com/nats-io/node-nats/tree/master/benchmark

var socketmq = require('../')

var smq = socketmq.bind('tcp://127.0.0.1:6363')

smq.on('bind', function() {
  console.log('server bound')
})

smq.on('connect', function(stream) {
  console.log('new connection')
})

smq.rep('request.test', function(msg, reply) {
  reply('ok')
})
