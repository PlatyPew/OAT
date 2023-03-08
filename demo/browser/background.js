import './nacl.js';
// import './sodium.js';

chrome.webRequest.onBeforeSendHeaders.addListener(
    function(details) {
        for (var i = 0; i < details.requestHeaders.length; ++i) {
            if (details.requestHeaders[i].name === 'Authorization') {
                details.requestHeaders[i].value = 'Bearer my_token';
                break;
            }
        }
        return {requestHeaders: details.requestHeaders};
    },
    {urls: ["<all_urls>"]},
    ["blocking", "requestHeaders"]
);

// Generate two key pairs for the two parties involved in the key exchange
const clientBoxKeyPair = nacl.box.keyPair();
const serverBoxKeyPair = nacl.box.keyPair();

// Perform the ECDH key exchange using the public keys of each party
const serverSymKey = nacl.box.before(clientBoxKeyPair.publicKey, serverBoxKeyPair.secretKey);
const clientSymKey = nacl.box.before(serverBoxKeyPair.publicKey, clientBoxKeyPair.secretKey);

console.log(serverSymKey);
console.log(clientSymKey);

console.log("Hello");

// let clientEphemeralKeyPair = {
//     publicKey: new Uint8Array([
//         158, 254, 42, 7, 42, 237, 138, 160, 140, 109, 133, 236, 55, 165, 22, 177, 213, 135, 111,
//         220, 50, 49, 153, 103, 235, 242, 38, 190, 11, 126, 171, 72,
//     ]),
//     privateKey: new Uint8Array([
//         169, 68, 220, 102, 96, 228, 224, 67, 40, 168, 88, 49, 198, 193, 233, 130, 127, 3, 254,
//         18, 221, 77, 13, 10, 54, 246, 1, 133, 230, 101, 137, 9,
//     ]),
// };

// let serverEphemeralKeyPair = {
//     publicKey: new Uint8Array([
//         214, 203, 159, 206, 82, 63, 128, 130, 115, 121, 101, 92, 37, 237, 69, 37, 26, 185, 117,
//         213, 48, 35, 25, 107, 115, 186, 172, 225, 41, 176, 149, 20,
//     ]),
//     privateKey: new Uint8Array([
//         227, 84, 205, 252, 184, 209, 209, 96, 134, 197, 66, 70, 211, 246, 182, 162, 144, 49, 62,
//         245, 230, 73, 133, 232, 110, 192, 222, 156, 61, 92, 233, 91,
//     ]),
// };

// // Perform the ECDH key exchange using the public keys of each party
// const clientSharedKey = sodium.crypto_scalarmult(
//     clientEphemeralKeyPair.privateKey,
//     serverEphemeralKeyPair.publicKey
// );
// const serverSharedKey = sodium.crypto_scalarmult(
//     serverEphemeralKeyPair.privateKey,
//     clientEphemeralKeyPair.publicKey
// );

// console.log(clientSharedKey);
// console.log(serverSharedKey);