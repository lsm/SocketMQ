# SocketMQ

[![Build Status](https://travis-ci.org/lsm/SocketMQ.svg?branch=master)](https://travis-ci.org/lsm/SocketMQ)
[![Coverage Status](https://coveralls.io/repos/github/lsm/SocketMQ/badge.svg?branch=master)](https://coveralls.io/github/lsm/SocketMQ?branch=master)

Lightweight stream oriented full-stack messaging library.

## Messaging Types
SocketMQ supports `req/rep` and `pub/sub` messaging patterns. Messaging pattern is high level concept of how messages should be handled on sending and receiving. It's `client/server & transport agnostic` which means you can use all 4 types of messaging pattern no matter you are connected to a server or being connected from a client with any of the transports supported.

### Request/Response
Each `request` will be sent to `one` connected client/server and wait for `response` (round-robin scheduler).

```javascript
// example/rep.js
var socketmq = require('../')

var smq = socketmq.bind('tcp://127.0.0.1:6363')

smq.on('bind', function() {
  console.log('rep bound')
})

var event = 'hello' // or you can call it topic or channel.

smq.on('connect', function(stream) {
  console.log('new connection')
  smq.req(event, 'request from server', function (msg) {
    console.log(msg)
  })
})

smq.rep(event, function(msg, reply) {
  console.log('requested msg:' + msg)
  reply('Hi ' + msg + ', world!')
})
```

```javascript
// example/req.js
var socketmq = require('socketmq')

var smq = socketmq.connect('tcp://127.0.0.1:6363')

smq.on('connect', function(stream) {
  console.log('req connected to server')
})

setInterval(function() {
  smq.req('hello', 'socketmq.req', function(msg) {
    console.log('replied msg:' + msg)
  })
}, 1000)

smq.rep('hello', function (msg, reply) {
  console.log('request from server', msg)
  reply('response from client')
})
```

### Publish/Subscribe
A `pub` message will be distributed to all client/server connected and no response will be sent back. It's a fire and forget messaging pattern. Pub messages could be received by subscribing to the publishing topic.

```javascript
// example/pub.js
var socketmq = require('socketmq')

var smq = socketmq.connect('tcp://0.0.0.0:6363')

smq.on('connect', function() {
  console.log('pub connected');
  setInterval(function() {
    smq.pub('pub.test', 'hello')
  }, 1000)
})
```

```javascript
// example/sub.js
var socketmq = require('socketmq')

var smq = socketmq.bind('tcp://127.0.0.1:6363')

smq.on('bind', function() {
  console.log('sub bound')
})

smq.sub('pub.test', function(data) {
  console.log('got pub message: ' + data)
})
```

### Using tags

SocketMQ can tag the streams and send messages to streams with specific tags.


```javascript

var socketmq = require('socketmq')

var tcpUri = 'tcp://127.0.0.1:6363'
var smq = socketmq.connect(tcpUri, function(stream) {
  // Tag the stream.
  smq.tag(stream, 'tcp')
})

var tlsUri = 'tls://127.0.0.1:46363'
smq.connect(tlsUri, function(stream) {
  smq.tag(stream, 'tls')
})

// Then send messages using `reqTag` of `pubTag`

// `req` message only to server with `tcp` tag
smq.reqTag('tcp', 'hello', 'message', function(){
  // ...
})

// `pub` message only to server with `tls` tag
smq.pubTag('tls', 'hello', 'message')

```
