if ('undefined' === typeof Buffer) {
  Buffer = require('buffer').Buffer
}

exports.Buffer = Buffer

exports.PUB = 'PUB'
exports.SUB = 'SUB'
exports.REQ = 'REQ'
exports.REP = 'REP'
exports.INF = 'INF'
exports.MID = 'MID'
exports.MNS = 'MNS'
exports.MCH = 'MCH'
exports.ACK = 'ACK'

var TYPES = exports.TYPES = {}
TYPES[exports.PUB] = Buffer(exports.PUB)
TYPES[exports.SUB] = Buffer(exports.SUB)
TYPES[exports.REQ] = Buffer(exports.REQ)
TYPES[exports.REP] = Buffer(exports.REP)
TYPES[exports.INF] = Buffer(exports.INF)


exports.F_BUFFER = 'b'
exports.F_STRING = 's'

exports.BUFFER = Buffer(exports.F_BUFFER)
exports.STRING = Buffer(exports.F_STRING)
