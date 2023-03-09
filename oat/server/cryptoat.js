const sodium = require("libsodium-wrappers");
const crypto = require("crypto");
const fs = require("fs");

const KEY_STORE = `${process.env.HOME || "HI"}/.oatkeys`;
const SHARED_KEY_DIR = `${KEY_STORE}/share`;
const SIGNED_KEY_DIR = `${KEY_STORE}/sign`;
const TOKEN_KEY_DIR = `${KEY_STORE}/token`;

const OAK_PASS = process.env.OAK_PASS;

/**
 * creates necessary directories for key storage
 */
(() => {
    if (!fs.existsSync(KEY_STORE)) fs.mkdirSync(KEY_STORE);
    if (!fs.existsSync(SHARED_KEY_DIR)) fs.mkdirSync(SHARED_KEY_DIR);
    if (!fs.existsSync(SIGNED_KEY_DIR)) fs.mkdirSync(SIGNED_KEY_DIR);
    if (!fs.existsSync(TOKEN_KEY_DIR)) fs.mkdirSync(TOKEN_KEY_DIR);
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

const _getSharedKey = (keyId) => {
    // TODO: decrypt shared key using OAK_PASS
    const sharedKey = fs.readFileSync(`${SHARED_KEY_DIR}/${keyId}`);
    return new Uint8Array(sharedKey);
};

const _setSharedKey = (keyId, sharedKey) => {
    // TODO: encrypt shared key using OAK_PASS
    fs.writeFileSync(`${SHARED_KEY_DIR}/${keyId}`, Buffer.from(sharedKey));
};

/**
 * generate shared key using elliptic curve diffie hellman
 *
 * @param {Uint8Array} theirPubKey - exchanger public key
 * @param {Uint8Array} outPrivKey - own private key
 * @returns {Object} key id and shared key
 *     @param {string} keyId - key id of shared key
 *     @param {Uint8Array} sharedKey - the shared key
 */
const genSharedKey = (theirPubKey) => {
    const serverKeyPair = sodium.crypto_box_keypair();
    const ourPubKey = serverKeyPair.publicKey;
    const ourPrivKey = serverKeyPair.privateKey;

    const sharedKey = sodium.crypto_scalarmult(ourPrivKey, theirPubKey);
    const keyId = crypto.createHash("sha1").update(sharedKey).digest("hex").toUpperCase();

    _setSharedKey(keyId, sharedKey);

    return { keyId, sharedKey, serverPubKey: ourPubKey };
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
