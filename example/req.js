var assert = require('assert')
var socketmq = require('../')


var smq = socketmq.connect('tcp://127.0.0.1:6363')

smq.req('first message', 'message before connect', 'hello world', function(err, answer) {
  console.log('obj', arguments);
  assert(err === null)
  assert(answer === 'got first message')
})

smq.on('connect', function(stream) {
  console.log('req connected to server')
})

setInterval(function() {
  smq.req('hello', 'socketmq.req', function(msg) {
    console.log('replied msg:' + msg)
  })
}, 1000)

smq.rep('request from server', function(msg, reply) {
  console.log('request from server', msg)
  reply('response from client')
})
