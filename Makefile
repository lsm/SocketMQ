

unit:
	node test/*.test.js

istanbul:
	./node_modules/.bin/istanbul cover test/*.test.js
