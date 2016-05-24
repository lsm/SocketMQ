var Queue = require('../queue/index')
var inherits = require('inherits')
var EventEmitter = require('events').EventEmitter


/**
 * Abstract socket class provides the user facing API.
 */
var Socket = module.exports = function(QueueClass) {
  QueueClass = QueueClass || Queue
  var queue
  if ('function' === typeof QueueClass)
    queue = new QueueClass(this)
  else
    queue = QueueClass
  this.queue = queue
  this.streams = []
}

inherits(Socket, EventEmitter)

Socket.ERR_TIMEOUT = Socket.prototype.ERR_TIMEOUT = 'timeout'
Socket.ERR_UNWRITABLE = Socket.prototype.ERR_UNWRITABLE = 'unwritable'
Socket.ERR_NO_TAGGED_STREAM = Socket.prototype.ERR_NO_TAGGED_STREAM = 'no stream for tag'

/**
 * Queue operations
 */
var que = require('./que')
Socket.prototype.pub = que.pub
Socket.prototype.pubTag = que.pubTag
Socket.prototype.sub = que.sub
Socket.prototype.req = que.req
Socket.prototype.reqTag = que.reqTag
Socket.prototype.rep = que.rep

/**
 * Tagging support
 */
var tag = require('./tag')
Socket.prototype.tag = tag.tag
Socket.prototype.hasTag = tag.hasTag
Socket.prototype.prefixTags = tag.prefixTags
Socket.prototype.getAckNSList = tag.getAckNSList
Socket.prototype.hasConnection = tag.hasConnection
Socket.prototype.getJoinedNSList = tag.getJoinedNSList
Socket.prototype.getStreamsByTag = tag.getStreamsByTag
Socket.prototype.getJoinedStreamsByNS = tag.getJoinedStreamsByNS
Socket.prototype.getStreamsByEndpoint = tag.getStreamsByEndpoint
Socket.prototype.removeTagsWithPrefix = tag.removeTagsWithPrefix

/**
 * Transport & stream operations
 */
var conn = require('./conn')
Socket.prototype.bind = conn.bind
Socket.prototype.send = conn.send
Socket.prototype.close = conn.close
Socket.prototype.connect = conn.connect
Socket.prototype.addStream = conn.addStream
Socket.prototype.removeStream = conn.removeStream
Socket.prototype.parseConnectionUri = conn.parseConnectionUri

/**
 * Message operations
 */
var msg = require('./msg')
Socket.prototype.setMsgEncoder = msg.setMsgEncoder

/**
 * Channel sub socket
 */
var SocketChannel = require('./channel')
Socket.prototype.channel = function(ns, name) {
  return new SocketChannel(this, ns, name)
}
