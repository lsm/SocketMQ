if ('undefined' === typeof Buffer)
  Buffer = require('buffer').Buffer


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
exports.SID = 'SID'
exports.JON = 'JON'
exports.LVE = 'LVE'
exports.SSN = 'SSN'
exports.CKE = 'CKE'

// Join/leave reasons
exports.JOINED = 'JOINED'
exports.EXITED = 'EXITED'
exports.UNSUBS = 'UNSUBS'
exports.SRVERR = 'SRVERR'
exports.KICKED = 'KICKED'
exports.DISCON = 'DISCON'

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
