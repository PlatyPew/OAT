import {nacl_factory} from './nacl_factory.js';

nacl_factory.instantiate(function (nacl) {
    let clientEphemeralKeyPair = {
        publicKey: new Uint8Array([
            199, 114, 109, 252, 80, 64, 83, 173, 49, 167, 31, 111, 23, 251, 85, 126, 174, 199, 119, 
            216, 234, 179, 152, 201, 93, 21, 221, 195, 201, 142, 244, 66,
        ]),
        privateKey: new Uint8Array([
            147, 71, 187, 166, 201, 181, 152, 59, 215, 203, 168, 167, 30, 138, 131, 162, 11, 90, 247, 
            182, 12, 208, 86, 98, 153, 247, 158, 115, 137, 67, 128, 170,
        ]),
    };

    // const clientEphemeralKeyPair = nacl.crypto_box_keypair();
    // console.log(clientEphemeralKeyPair);

    let serverEphemeralKeyPair = {
        publicKey: new Uint8Array([
            214, 203, 159, 206, 82, 63, 128, 130, 115, 121, 101, 92, 37, 237, 69, 37, 26, 185, 117,213, 
            48, 35, 25, 107, 115, 186, 172, 225, 41, 176, 149, 20,
        ])
    };

    // Perform the ECDH key exchange using the public keys of each party
    const clientSharedKey = nacl.crypto_scalarmult(
        clientEphemeralKeyPair.privateKey,
        serverEphemeralKeyPair.publicKey
    );
    // const serverSharedKey = nacl.crypto_scalarmult(
    //     serverEphemeralKeyPair.privateKey,
    //     clientEphemeralKeyPair.publicKey
    // );

    console.log(clientSharedKey);
    // console.log(serverSharedKey);


});

// import './sodium.js';

// chrome.webRequest.onBeforeSendHeaders.addListener(
//     function(details) {
//         for (var i = 0; i < details.requestHeaders.length; ++i) {
//             if (details.requestHeaders[i].name === 'Authorization') {
//                 details.requestHeaders[i].value = 'Bearer my_token';
//                 break;
//             }
//         }
//         return {requestHeaders: details.requestHeaders};
//     },
//     {urls: ["<all_urls>"]},
//     ["blocking", "requestHeaders"]
// );

// Generate two key pairs for the two parties involved in the key exchange
// const clientBoxKeyPair = nacl.box.keyPair();
// const serverBoxKeyPair = nacl.box.keyPair();

// // Perform the ECDH key exchange using the public keys of each party
// const serverSymKey = nacl.box.before(clientBoxKeyPair.publicKey, serverBoxKeyPair.secretKey);
// const clientSymKey = nacl.box.before(serverBoxKeyPair.publicKey, clientBoxKeyPair.secretKey);

// console.log(serverSymKey);
// console.log(clientSymKey);

// console.log("Hello");

