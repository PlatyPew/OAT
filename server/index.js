// const gpg = require('gpg-with-err-handling');
// const bcrypt = require("bcrypt");

const generateRandom256Bytes = async function () {

    const { randomBytes } = await import('node:crypto');
    const buf = randomBytes(64);

    return buf;
};

const generateIV = function () {
    return generateRandom256Bytes();
}

const generateNewToken = async function (oldToken) {
    const { createHash } = await import('node:crypto');
    return new Promise((resolve, reject) => {
        let rng = generateRandom256Bytes();

    });

    let rng = generateRandom256Bytes();

    return new Promise((resolve, reject) => {
        rng.then((value) => {
            const hash = createHash('sha512').update(value).digest("hex");
            console.log(hash);
            resolve(hash);
        }).catch(reject);
    });
    
    // rng.then((value) => {
    //     hash1 = createHash('sha512').update(value).digest("hex");
    //     return hash1;
    // });
 };

module.exports = { generateIV, generateNewToken }