const sodium = require("libsodium-wrappers");
const crypto = require("crypto");
const fs = require("fs");

const KEY_STORE = `${process.env.HOME || "HI"}/.oatkeys`;

const OAK_PASS = process.env.OAK_PASS;

/**
 * creates necessary directories for key storage
 */
(() => {
    if (!fs.existsSync(KEY_STORE)) fs.mkdirSync(KEY_STORE);
})();

/**
 * signs api key with client private key
 *
 * @param {Uint8Array} privKey - private key
 * @param {Object} data - api key and domain to sign
 *     @param {Buffer} data.apiKey - the api key to sign
 *     @param {string} data.apiKey - the api key to sign
 * @returns {Buffer} signature and data
 */
const sign = (privKey, { apiKey, domain }) => {
    const unsignedData = Buffer.concat([apiKey, Buffer.from(domain)]);
    const signature = sodium.crypto_sign(unsignedData, privKey);

    return Buffer.from(signature);
};

/**
 * verify api key with client private key
 *
 * @param {Uint8Array} pubKey - public key
 * @param {Uint8Array} signedData - signature and data
 * @returns {Object} api key and domain
 *     @param {Buffer} apiKey - unsigned api key
 *     @param {string} domain - unsigned domain
 */
const verify = (pubKey, signedData) => {
    const unsignedData = sodium.crypto_sign_open(signedData, pubKey);
    const apiKey = Buffer.from(unsignedData.slice(0, 64));
    const domain = Buffer.from(unsignedData.slice(64)).toString();

    return { apiKey, domain };
};

/**
 * encrypt api key using shared key
 *
 * @param {string} clientId - client id of shared key
 * @param {Buffer} apiKey - api key
 * @returns {Buffer} encrypted api key
 */
const encrypt = (clientId, apiKey) => {
    const sharedKey = _getSharedKey(clientId);

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", sharedKey, iv);
    let enc = cipher.update(apiKey);
    cipher.final();

    return Buffer.concat([iv, enc]);
};

/**
 * decrypt api key using shared key
 *
 * @param {string} clientId - client id of shared key
 * @param {Buffer} encApiKey - encrypted api key
 * @returns {Buffer} decrypted api key
 */
const decrypt = (clientId, encApiKey) => {
    const sharedKey = _getSharedKey(clientId);

    const iv = encApiKey.slice(0, 12);
    const enc = encApiKey.slice(12);
    const decipher = crypto.createDecipheriv("aes-256-gcm", sharedKey, iv);
    let dec = decipher.update(enc);

    return dec;
};

const _getSharedKey = (clientId) => {
    if (!fs.existsSync(`${KEY_STORE}/${clientId}`)) {
        throw new Error("Key directory not found");
    }

    // TODO: decrypt shared key using OAK_PASS
    const sharedKey = fs.readFileSync(`${KEY_STORE}/${clientId}`);
    return new Uint8Array(sharedKey);
};

const _setSharedKey = (clientId, sharedKey) => {
    if (!fs.existsSync(`${KEY_STORE}/${clientId}`)) {
        fs.mkdirSync(`${KEY_STORE}/${clientId}`);
    }

    // TODO: encrypt shared key using OAK_PASS
    fs.writeFileSync(`${KEY_STORE}/${clientId}/shared`, Buffer.from(sharedKey));
};

/**
 * generate shared key using elliptic curve diffie hellman
 *
 * @param {Uint8Array} theirPubKey - exchanger public key
 * @param {Uint8Array} outPrivKey - own private key
 * @returns {Object} client id and shared key
 *     @param {string} clientId - client id of shared key
 *     @param {Uint8Array} sharedKey - the shared key
 */
const genSharedKey = (theirPubKey) => {
    const serverKeyPair = sodium.crypto_box_keypair();
    const ourPubKey = serverKeyPair.publicKey;
    const ourPrivKey = serverKeyPair.privateKey;

    const sharedKey = sodium.crypto_scalarmult(ourPrivKey, theirPubKey);
    const clientId = crypto.createHash("sha1").update(sharedKey).digest("hex").toUpperCase();

    _setSharedKey(clientId, sharedKey);

    return { clientId, sharedKey, serverPubKey: ourPubKey };
};

(async () => {
    await sodium.ready;

    /* const keypair = sodium.crypto_sign_keypair(); */
    /* const apiKey = sodium.randombytes_buf(64); */
    /* const domain = "www.charming-brahmagupta.cloud"; */
    /**/
    /* const sig = sign(keypair.privateKey, { apiKey, domain }); */
    /* console.log(verify(keypair.publicKey, sig)); */

    const clientKeyPair = sodium.crypto_box_keypair();
    const serverKeyPair = sodium.crypto_box_keypair();

    genSharedKey(clientKeyPair.publicKey, serverKeyPair.privateKey);
})();

module.exports = {
    sign: sign,
    verify: verify,
};
