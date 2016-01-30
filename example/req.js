var socketmq = require('../')

var smq = socketmq.connect('tcp://127.0.0.1:5000')

smq.on('connect', function(stream) {
  console.log('stream established with server')
})

setInterval(function() {
  smq.req('hello', 'socketmq.req', function(msg) {
    console.log('replied msg:' + msg)
  })
}, 1000)
