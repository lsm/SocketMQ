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

var loop = 30000
var hash = 200
var received = 0

console.log('Request/Response Performance Test')

smq.on('connect', function() {
  console.log('Connected to server')

  var start = new Date()

  var perTick = 1000
  var str = Array(1024).join('a')
  console.log('sending %d per tick', perTick)
  console.log('sending %d byte messages', Buffer.byteLength(str))

  function more() {
    for (var i = 0; i < perTick; ++i) {
      smq.req('request.test', str, function() {
        if (received === 0) {
          process.stdout.write('1')
        }
        received += 1
        if (received === loop) {
          var stop = new Date()
          var rps = parseInt(loop / ((stop - start) / 1000))
          console.log('\n' + rps + ' request-responses/sec')
          var lat = parseInt(((stop - start) * 1000) / (loop * 2)) // Request=2, Reponse=2 RTs
          console.log('Avg roundtrip latency: ' + lat + ' microseconds')
          process.exit()
        } else if (received % hash === 0) {
          process.stdout.write('+')
        }
      })
    }
    setImmediate(more)
  }

  more()
})
