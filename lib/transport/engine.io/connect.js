var eio = require('engine.io-client')
var url = require('url')
var common = require('./common')
var setupStream = require('../common').setupStream
var createStream = common.createStream
var getDefaultOptions = common.getDefaultOptions

module.exports = function connect(target, smq, options, callback) {
  options = getDefaultOptions(options)
  var uri = getConnectionUri(target, options.https)

  var socket = eio(uri, options)
  var stream = createStream(socket)
  setupStream(smq, stream, callback)

  return stream
}

function getConnectionUri(target, https) {
  var protocol = 'ws:'
  if ((!target.hostname || !target.port) && 'undefined' !== typeof window) {
    var browserTarget = url.parse(window.location.href)
    if (browserTarget.protocol) {
      protocol = 'https:' === browserTarget.protocol ? 'wss:' : 'ws:'
      target.hostname = target.hostname || browserTarget.hostname
      target.port = target.port || browserTarget.port
    }
  }

  if (true === https) {
    protocol = 'wss:'
  }

  var uri = protocol + '//' + target.hostname
  if (target.port) {
    uri = uri + ':' + target.port
  }

  return uri
}
