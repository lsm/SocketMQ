// pub/sub benchmark script credit: https://github.com/tj/axon/tree/master/benchmark
var net = require('net')
var socketmq = require('../')

var smq = new socketmq.Socket()
var stream = new net.Socket({
  fd: 3,
  readable: true,
  writable: true
})

smq.on('disconnect', function() {
  console.log('fd-pub: stream disconnected')
})

stream.on('error', function(err) {
  console.log('fd-pub error', err)
})

smq.on('connect', function() {
  var perTick = 5;
  var str = Buffer(Array(1024).join('a'));
  console.log('sending %d per tick', perTick);
  console.log('sending %d byte messages', Buffer.byteLength(str));

  function more() {
    for (var i = 0; i < perTick; ++i) smq.pub('pub.test stdio', str);
    setImmediate(more);
  }

  more();
})

smq.addStream(stream)
