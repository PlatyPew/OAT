const oak = require('./index');

// let token = oak.generateRandom256Bytes(cred);
//let token = oak.generateIV();

token = oak.generateNewToken("3615f80c9d293ed7402687f94b22d58e529b8cc7916f8fac7fddf7fbd5af4cf777d3d795a7a00a16bf7e7f3fb9561ee9baae480da9fe7a18769e71886b03f315");

console.log(token) // "Some User token"