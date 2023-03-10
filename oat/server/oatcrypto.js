const sodium = require("libsodium-wrappers");
const crypto = require("crypto");
const fs = require("fs");

const KEY_STORE = `${process.env.HOME || "HI"}/.oatkeys`;

/**
 * creates necessary directories for key storage and initialise OAT_PASS
 */
if (!process.env.OAT_PASS || process.env.OAT_PASS.length < 16)
    throw new Error("OAT_PASS should be at least 16 characters long");
const OAT_PASS = crypto.createHash("sha3-256").update(process.env.OAT_PASS).digest();

if (!fs.existsSync(KEY_STORE)) fs.mkdirSync(KEY_STORE);

/**
 * makes directory if it does not exist
 *
 * @param {string} clientId - client id
 */
const makeKeyStore = (clientId) => {
    if (!fs.existsSync(`${KEY_STORE}/${clientId}`)) fs.mkdirSync(`${KEY_STORE}/${clientId}`);
};

/**
 * checks if directory exists
 *
 * @param {string} clientId - client id
 */
const checkKeyStore = (clientId) => {
    if (!fs.existsSync(`${KEY_STORE}/${clientId}`)) throw new Error("Key directory not found");
};

/**
 * signs api key with client private key
 *
 * @param {string} clientId - client id of shared key
 * @param {Object} data - api key and domain to sign
 *     @param {Buffer} data.apiKey - the api key to sign
 *     @param {string} data.apiKey - the api key to sign
 * @returns {Buffer} signature and data
 */
const sign = (clientId, { apiKey, domain }) => {
    const privKey = _getSigningKey(clientId);

    const unsignedData = Buffer.concat([apiKey, Buffer.from(domain)]);
    const signature = sodium.crypto_sign(unsignedData, privKey);

    return Buffer.from(signature);
};

/**
 * verify api key with client private key
 *
 * @param {string} clientId - client id of shared key
 * @param {Uint8Array} signedData - signature and data
 * @returns {Object} api key and domain
 *     @param {Buffer} apiKey - unsigned api key
 *     @param {string} domain - unsigned domain
 */
const verify = (clientId, signedData) => {
    const pubKey = _getVerifyingKey(clientId);

    const unsignedData = sodium.crypto_sign_open(signedData, pubKey);
    const apiKey = Buffer.from(unsignedData.slice(0, 64));
    const domain = Buffer.from(unsignedData.slice(64)).toString();

    return { apiKey, domain };
};

/**
 * read and decrypt signing key
 *
 * @param {string} clientId - client id
 * @returns {Uint8Array} signing key
 */
const _getSigningKey = (clientId) => {
    checkKeyStore(clientId);

    const signingKey = fs.readFileSync(`${KEY_STORE}/${clientId}/signing.key`);
    return new Uint8Array(_decryptKey(signingKey));
};

/**
 * encrypts and saves signing key
 *
 * @param {string} clientId - client id
 * @param {Uint8Array} signingKey - signing key
 */
const _setSigningKey = (clientId, signingKey) => {
    makeKeyStore(clientId);

    fs.writeFileSync(`${KEY_STORE}/${clientId}/signing.key`, _encryptKey(Buffer.from(signingKey)));
};

/**
 * reads verification key
 *
 * @param {string} clientId - client id
 * @returns {Uint8Array} verification key
 */
const _getVerifyingKey = (clientId) => {
    checkKeyStore(clientId);

    const verifyingKey = fs.readFileSync(`${KEY_STORE}/${clientId}/verifying.key`);
    return new Uint8Array(verifyingKey);
};

/**
 * saves verification key
 *
 * @param {string} clientId - client id
 * @param {Uint8Array} verifyingKey - verification key
 */
const _setVerifyingKey = (clientId, verifyingKey) => {
    makeKeyStore(clientId);

    fs.writeFileSync(`${KEY_STORE}/${clientId}/verifying.key`, Buffer.from(verifyingKey));
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

/**
 * encrypts key using OAT_PASS
 *
 * @param {Uint8Array} decKey - unencrypted key
 * @returns {Buffer} encrypted key
 */
const _encryptKey = (decKey) => {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", Buffer.from(OAT_PASS), iv);
    let enc = cipher.update(decKey);
    cipher.final();

    return Buffer.concat([iv, enc]);
};

/**
 * decrypts key using OAT_PASS
 *
 * @param {Buffer} encKey - encrypted key
 * @returns {Uint8Array} decrypted key
 */
const _decryptKey = (encKey) => {
    const iv = encKey.slice(0, 12);
    const enc = encKey.slice(12);
    const decipher = crypto.createDecipheriv("aes-256-gcm", Buffer.from(OAT_PASS), iv);
    let dec = decipher.update(enc);

    return new Uint8Array(dec);
};

/**
 * gets and decrypts shared key
 *
 * @param {string} clientId - client id
 * @returns {Uint8Array} shared key
 */
const _getSharedKey = (clientId) => {
    checkKeyStore(clientId);

    const sharedEncKey = fs.readFileSync(`${KEY_STORE}/${clientId}/shared.key`);
    return _decryptKey(sharedEncKey);
};

/**
 * encrypts and saves shared key
 *
 * @param {string} clientId - client id
 * @param {Uint8Array} sharedKey - shared key
 */
const _setSharedKey = (clientId, sharedKey) => {
    makeKeyStore(clientId);

    fs.writeFileSync(`${KEY_STORE}/${clientId}/shared.key`, _encryptKey(sharedKey));
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
const _genSharedKey = (theirPubKey, myKeyPair) => {
    const ourPrivKey = myKeyPair.privateKey;

    const sharedKey = sodium.crypto_scalarmult(ourPrivKey, theirPubKey);
    const clientId = crypto.createHash("sha1").update(sharedKey).digest("hex").toUpperCase();

    _setSharedKey(clientId, sharedKey);

    return clientId;
};

/**
 * initiate the client key exchange process by sending box and sign public key
 *
 * @param {function} getTheirBoxPubKeyFunc - anon function to get server box public key
 */
const initClientKeys = (getTheirBoxPubKeyFunc) => {
    const myBoxKeyPair = sodium.crypto_box_keypair();
    const mySignKeyPair = sodium.crypto_sign_keypair();

    const theirBoxPubKey = new Uint8Array(
        getTheirBoxPubKeyFunc(
            Buffer.from(myBoxKeyPair.publicKey),
            Buffer.from(mySignKeyPair.publicKey)
        )
    );

    const clientId = _genSharedKey(theirBoxPubKey, myBoxKeyPair);
    _setSigningKey(clientId, mySignKeyPair.privateKey);
};

/**
 * initiate the server key exchange by sending box public key
 *
 * @param {Buffer} theirBoxPubKey - client's box public key
 * @param {Buffer} theirSignPubKey - client's sign public key
 * @returns {Object} server's public box key
 *     @param {string} clientId - client id
 *     @param {Uint8Array} outBoxPubKey - box public key
 */
const initServerKeys = (theirBoxPubKey, theirSignPubKey) => {
    theirBoxPubKey = new Uint8Array(theirBoxPubKey);
    theirSignPubKey = new Uint8Array(theirSignPubKey);

    const myBoxKeyPair = sodium.crypto_box_keypair();
    const clientId = _genSharedKey(theirBoxPubKey, myBoxKeyPair);
    _setVerifyingKey(clientId, theirSignPubKey);

    return { clientId, ourBoxPubKey: Buffer.from(myBoxKeyPair.publicKey) };
};

/**
 * list all client ids
 *
 */
const listIds = () => {
    const files = fs.readdirSync(KEY_STORE, { withFileTypes: true });
    files.forEach((file) => {
        if (file.isDirectory()) console.log(file.name);
    });
};

module.exports = {
    KEY_STORE: KEY_STORE,
    OAT_PASS: OAT_PASS,

    makeKeyStore: makeKeyStore,
    checkKeyStore: checkKeyStore,
    sign: sign,
    verify: verify,
    encrypt: encrypt,
    decrypt: decrypt,
    initClientKeys: initClientKeys,
    initServerKeys: initServerKeys,
    listIds: listIds,

    _getSigningKey: _getSigningKey,
    _setSigningKey: _setSigningKey,
    _getVerifyingKey: _getVerifyingKey,
    _setVerifyingKey: _setVerifyingKey,
    _getSharedKey: _getSharedKey,
    _setSharedKey: _setSharedKey,
    _encryptKey: _encryptKey,
    _decryptKey: _decryptKey,
};
