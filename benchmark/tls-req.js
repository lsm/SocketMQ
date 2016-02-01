// req/rep benchmark script credit: https://github.com/nats-io/node-nats/tree/master/benchmark
var fs = require('fs')
var socketmq = require('../')
var smq = socketmq.connect('tls://localhost:6363', {
  key: fs.readFileSync('./certs/client-key.pem'),
  cert: fs.readFileSync('./certs/client-cert.pem'),
  ca: [fs.readFileSync('./certs/server-cert.pem')]
});

///////////////////////////////////////
// Request Performance
///////////////////////////////////////

var start;
var loop = 200000;
var hash = 2000;
var received = 0;

console.log('Request/Response Performance Test');

smq.on('connect', function() {
  console.log('Connected to server')

  var start = new Date();

  // Need to flush here since using separate connections.

  for (var i = 0; i < loop; i++) {
    smq.req('request.test', 'help', function() {
      if (received === 0) {
        process.stdout.write('1');
      }
      received += 1;
      if (received === loop) {
        var stop = new Date();
        var rps = parseInt(loop / ((stop - start) / 1000));
        console.log('\n' + rps + ' request-responses/sec');
        var lat = parseInt(((stop - start) * 1000) / (loop * 2)); // Request=2, Reponse=2 RTs
        console.log('Avg roundtrip latency: ' + lat + ' microseconds');
        process.exit();
      } else if (received % hash === 0) {
        process.stdout.write('+');
      }
    });
  }

});
