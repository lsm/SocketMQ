var socketmq = require('../')

var smq = socketmq.bind('tcp://127.0.0.1:5000')

smq.on('connect', function(stream) {
  console.log('new stream connected to server')
})

smq.rep('hello', function(msg, reply) {
  console.log('requested msg:' + msg)
  reply('Hi ' + msg + ', world!')
})
