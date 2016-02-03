// pub/sub benchmark script credit: https://github.com/tj/axon/tree/master/benchmark
var fs = require('fs');
var socketmq = require('../')
humanize = require('humanize-number');

var child_process = require('child_process')
var childOpts = {
  stdio: ['inherit', 'inherit', 'inherit', 'pipe', 'pipe']
}
var child = child_process.spawn('node', [__dirname + '/fd-pub.js'], childOpts)
var stdio = child.stdio[3]
//
var smq = new socketmq.Socket()

smq.on('connect', function() {
  console.log('stream connected')

  var n = 0;
  var ops = 10000;
  var total = 200000;
  var bytes = 1024;
  var prev = start = Date.now();
  var results = [];

  smq.sub('pub.test stdio', function(msg) {
    if (n++ % ops == 0) {
      var ms = Date.now() - prev;
      var sec = ms / 1000;
      var persec = ops / sec | 0;
      results.push(persec);
      process.stdout.write('\r  [' + persec + ' ops/s] [' + n + ']');
      prev = Date.now();
    }

    if (n >= total) {
      done()
    }
  });

  function sum(arr) {
    return arr.reduce(function(sum, n) {
      return sum + n;
    });
  }

  function min(arr) {
    return arr.reduce(function(min, n) {
      return n < min
        ? n
        : min;
    });
  }

  function median(arr) {
    arr = arr.sort();
    return arr[arr.length / 2 | 0];
  }

  function done() {
    var ms = Date.now() - start;
    var avg = n / (ms / 1000);
    console.log('\n');
    console.log('      min: %s ops/s', humanize(min(results)));
    console.log('     mean: %s ops/s', humanize(avg | 0));
    console.log('   median: %s ops/s', humanize(median(results)));
    console.log('    total: %s ops in %ds', humanize(n), ms / 1000);
    console.log('  through: %d mb/s', ((avg * bytes) / 1024 / 1024).toFixed(2));
    console.log();
    child.kill();
    process.exit()
  }

  process.on('SIGINT', done);
})

stdio.on('error', function(err) {
  console.log('fd-sub error')
})

smq.addStream(stdio)
