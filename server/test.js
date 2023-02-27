const oak = require('./index');

// let token = oak.generateRandom256Bytes(cred);
//let token = oak.generateIV();

token = oak.generateNewToken();

token.then((value) => {
    console.log(value) // "Some User token"
 })