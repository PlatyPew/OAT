#!/usr/bin/env sh
openssl genrsa -out key.pem
openssl req -new -key key.pem -out csr.pem <<EOF
SG
Singapore
Singapore
OAK

localhost
oak@test.com

EOF
openssl x509 -req -days 9999 -in csr.pem -signkey key.pem -out cert.pem
rm csr.pem
