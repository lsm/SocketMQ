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
    return stream.__smq_tags__.indexOf(tag) > -1
  }
  if (stream)
    return check(stream)
  else
    return this.streams.some(check)
}

exports.getStreamsByTag = function(tag, streams) {
  return (streams || this.streams).filter(function(stream) {
    var tags = stream.__smq_tags__
    return Array.isArray(tags)
      && tags.indexOf(tag) > -1
  })
}

exports.getStreamsByEndpoint = function(endpoint) {
  return this.streams.filter(function(stream) {
    return endpoint === stream.__smq_endpoint__
  })
}

exports.hasConnection = function(endpoint) {
  return this.getStreamsByEndpoint(endpoint).length > 0
}

// Tagging private functions

function addTag(tag, stream) {
  var added = 0
  var _tags = stream.__smq_tags__ || []
  if (-1 === _tags.indexOf(tag)) {
    _tags.push(tag)
    added = 1
  }
  stream.__smq_tags__ = _tags
  return added
}
