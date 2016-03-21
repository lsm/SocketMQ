

unit:
	node test/*.test.js

istanbul:
	./node_modules/.bin/istanbul cover test/*.test.js
watch:
	./node_modules/.bin/nodemon ./node_modules/.bin/istanbul cover test/index.js

coveralls: istanbul
	cat coverage/lcov.info | ./node_modules/.bin/coveralls
