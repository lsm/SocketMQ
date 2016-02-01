// pub/sub benchmark script credit: https://github.com/tj/axon/tree/master/benchmark
var net = require('net')
var socketmq = require('../')

var smq = new socketmq.Socket()
var stream = net.Socket({
  fd: 3,
  readable: true,
  writable: true
})

smq.on('connect', function() {
  var perTick = 5;
  var str = Array(1024).join('a');
  console.log('sending %d per tick', perTick);
  console.log('sending %d byte messages', Buffer.byteLength(str));

  function more() {
    for (var i = 0; i < perTick; ++i) smq.pub('pub.test stdio', str);
    setImmediate(more);
  }

  more();
})

stream.on('error', function(err) {
  console.log('fd-pub error')
})

smq.addStream(stream)
