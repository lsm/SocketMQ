var socketmq = require('../')

var smq = socketmq.bind('tcp://127.0.0.1:6363')

smq.on('bind', function() {
  console.log('sub bound')
})

smq.sub('pub.test', function(data) {
  console.log('got pub message: ' + data)
})
