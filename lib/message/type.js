

exports.PUB = 'PUB'
exports.REQ = 'REQ'
exports.REP = 'REP'

var TYPES = exports.TYPES = {}
TYPES[exports.PUB] = Buffer(exports.PUB)
TYPES[exports.REQ] = Buffer(exports.REQ)
TYPES[exports.REP] = Buffer(exports.REP)


exports.F_BUFFER = 'b'
exports.F_STRING = 's'

exports.BUFFER = Buffer(exports.F_BUFFER)
exports.STRING = Buffer(exports.F_STRING)
