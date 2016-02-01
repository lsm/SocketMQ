// pub/sub benchmark script credit: https://github.com/tj/axon/tree/master/benchmark
var fs = require('fs')
var socketmq = require('../')

var smq = socketmq.bind('tls://localhost:6363', {
  key: fs.readFileSync('./certs/server-key.pem'),
  cert: fs.readFileSync('./certs/server-cert.pem'),
  ca: [fs.readFileSync('./certs/client-cert.pem')]
})
smq.on('bind', function() {
  console.log('pub bound');
})
smq.on('disconnect', process.exit);

var perTick = 1000;
var str = Array(1024).join('a');
console.log('sending %d per tick', perTick);
console.log('sending %d byte messages', Buffer.byteLength(str));

function more() {
  for (var i = 0; i < perTick; ++i) smq.pub('pub.test', str);
  setImmediate(more);
}

more();
