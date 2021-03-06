// req/rep benchmark script credit: https://github.com/nats-io/node-nats/tree/master/benchmark

var socketmq = require('../')

var smq = socketmq.bind('tcp://127.0.0.1:6363')

smq.on('error', function(err) {
  console.log('socket error', err);
})

smq.on('bind', function() {
  console.log('tcp server bound')
})

smq.on('connect', function(stream) {
  console.log('new tcp connection')
})

smq.rep('request.test', function(msg, reply) {
  reply('ok')
})
