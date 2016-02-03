// pub/sub benchmark script credit: https://github.com/tj/axon/tree/master/benchmark

var socketmq = require('../')

var smq = socketmq.bind('tcp://0.0.0.0:6363')

// var msgpack = require('msgpack')
// smq.setMsgEncoder(msgpack)

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
