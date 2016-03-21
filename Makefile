

unit:
	node test/*.test.js

istanbul:
	./node_modules/.bin/istanbul cover test/*.test.js

coveralls: istanbul
	cat coverage/lcov.info | ./node_modules/.bin/coveralls
