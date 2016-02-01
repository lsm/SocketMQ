
certs:
	openssl genrsa -out $(name)-key.pem 2048
	openssl req -new -sha256 -key $(name)-key.pem -out $(name)-csr.pem
	openssl x509 -req -in $(name)-csr.pem -signkey $(name)-key.pem -out $(name)-cert.pem
