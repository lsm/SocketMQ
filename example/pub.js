var socketmq = require('../')

var smq = socketmq.connect('tcp://0.0.0.0:6363')

smq.on('connect', function() {
  console.log('pub connected');
  setInterval(function() {
    smq.pub('pub.test', 'hello')
  }, 1000)
})
