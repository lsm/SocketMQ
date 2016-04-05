

unit:
	node test/index.js

istanbul:
	./node_modules/.bin/istanbul cover test/index.js

watch-istanbul:
	./node_modules/.bin/nodemon ./node_modules/.bin/istanbul cover test/index.js

watch:
	./node_modules/.bin/nodemon test/index.js

coveralls: istanbul
	cat coverage/lcov.info | ./node_modules/.bin/coveralls
