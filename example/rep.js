var socketmq = require('../')

var smq = socketmq.bind('tcp://127.0.0.1:6363')

smq.on('bind', function() {
  console.log('rep bound')
})

smq.on('connect', function(stream) {
  console.log('new connection')
  smq.req('request from server', 'hello', function(msg) {
    console.log(msg)
  })
})

smq.rep('hello', function(msg, reply) {
  console.log('requested msg:' + msg)
  reply('Hi ' + msg + ', world!')
})

smq.rep('first message', function(topic, msg, reply) {
  console.log('rep', topic, msg)
  reply(null, 'got first message')
})
