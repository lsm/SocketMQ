var type = require('../message/type')

var ACK = type.ACK
var JOINED = type.JOINED

/**
 * Tagging support
 */

exports.tag = function(stream, tags) {
  var streams

  if ('string' === typeof stream) {
    streams = this.getStreamsByEndpoint(stream)
    if (0 === streams.length)
      return false
  } else {
    streams = [stream]
  }

  if ('string' === typeof tags)
    tags = [tags]

  if (!Array.isArray(tags))
    return false

  var result = 0
  streams.forEach(function(stream) {
    tags.forEach(function(tag) {
      result += addTag(tag, stream)
    })
  })

  return result
}

exports.removeTagsWithPrefix = function(prefix, stream) {
  var tags = stream.__smq__.tags
  var rePrefix = new RegExp('^' + prefix)
  tags = tags.filter(function(tag) {
    return false === rePrefix.test(tag)
  })
  stream.__smq__.tags = tags
}

exports.prefixTags = function(prefix, tags) {
  function addPrefix(tag) {
    return prefix + '::' + tag
  }
  if ('string' === typeof tags) {
    return addPrefix(tags)
  } else if (Array.isArray(tags)) {
    return tags.map(addPrefix)
  }
}

exports.hasTag = function(tag, stream) {
  function check(stream) {
    return stream.__smq__.tags.indexOf(tag) > -1
  }
  if (stream)
    return check(stream)
  else
    return this.streams.some(check)
}

exports.getAckNSList = function(stream) {
  var tags = stream.__smq__.tags
  var list = []
  tags.forEach(function(tag) {
    var t = tag.split('::')
    // `[ns]::ACK`
    if (2 === t.length && ACK === t[1])
      list.push({
        ns: t[0],
        tag: tag
      })
  })
  return list
}

exports.getJoinedNSList = function(stream) {
  var tags = stream.__smq__.tags
  var list = []
  tags.forEach(function(tag) {
    var t = tag.split('::')
    // `[ns]::[channel]::JOINED`
    if (3 === t.length && JOINED === t[2]) {
      list.push({
        ns: t[0],
        chn: t[1]
      })
    }
  })
  return list
}

exports.getJoinedStreamsByNS = function(ns) {
  var reNS = new RegExp('^' + ns + '::[a-zA-Z0-9- \/]+::JOINED')
  return this.streams.filter(function(stream) {
    var tags = stream.__smq__.tags
    return Array.isArray(tags) && tags.some(reNS.test, reNS)
  })
}

exports.getStreamsByTag = function(tag, streams, excluding) {
  return (streams || this.streams).filter(function(stream) {
    var tags = stream.__smq__.tags
    return Array.isArray(tags)
      && tags.indexOf(tag) > -1
      && stream !== excluding
  })
}

exports.getStreamsByEndpoint = function(endpoint) {
  return this.streams.filter(function(stream) {
    return endpoint === stream.__smq__.endpoint
  })
}

exports.hasConnection = function(endpoint) {
  return this.getStreamsByEndpoint(endpoint).length > 0
}

// Tagging private functions

function addTag(tag, stream) {
  var added = 0
  var _tags = stream.__smq__.tags
  if (-1 === _tags.indexOf(tag)) {
    _tags.push(tag)
    added = 1
  }
  return added
}
