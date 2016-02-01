// pub/sub benchmark script credit: https://github.com/tj/axon/tree/master/benchmark
var fs = require('fs');
var duplexify = require('duplexify')
var socketmq = require('../')

var smq = new socketmq.Socket()

/**
 * RPC
 */
var streamOpts = {
  fd: 3
}
var readable = fs.createReadStream(null, streamOpts);
var writable = fs.createWriteStream(null, streamOpts);
var stream = duplexify(writable, readable)

smq.on('connect', function() {
  var perTick = 1;
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
