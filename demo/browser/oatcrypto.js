const sodium = require("libsodium-wrappers");
const crypto = require("crypto");

const KEY_STORE = `${process.env.HOME || "HI"}/.oatkeys`;

/**
 * creates necessary directories for key storage and initialise OAT_PASS
 */
// if (!process.env.OAT_PASS || process.env.OAT_PASS.length < 16)
//     throw new Error("OAT_PASS should be at least 16 characters long");
const OAT_PASS = crypto.createHash("sha3-256").update("123").digest();

const setLocalStorage = (clientId, name, value) => {
    let clientObj = JSON.parse(localStorage.getItem(clientId));
    if (clientObj == null) {
        // Init
        window.localStorage.setItem(clientId,JSON.stringify({name:value}));
    }
    else {
        clientObj[name] = value;
        window.localStorage.setItem(clientId,JSON.stringify(clientObj));
    }
}

const getLocalStorage = (clientId, name) => {
    try {
        let clientObj = JSON.parse(localStorage.getItem(clientId));
        if (clientObj[name] != null) {
            return clientObj[name];
        }
    }
    catch {}
    finally {
        return null;
    }
}

/**
 * signs api key with client private key
 *
 * @async
 * @param {string} clientId - client id of shared key
 * @param {Object} data - api key and domain to sign
 *     @param {Buffer} data.apiKey - the api key to sign
 *     @param {string} data.apiKey - the api key to sign
 * @returns {Promise<Buffer>} signature and data
 */
const sign = async (clientId, { apiKey, domain }) => {
    const privKey = await _getSigningKey(clientId);

    const unsignedData = Buffer.concat([apiKey, Buffer.from(domain)]);
    const signature = sodium.crypto_sign(unsignedData, privKey);

    return Buffer.from(signature);
};

/**
 * read and decrypt signing key
 *
 * @async
 * @param {string} clientId - client id
 * @returns {Promise<Uint8Array>} signing key
 */
const _getSigningKey = async (clientId) => {
    const signingKey = getLocalStorage(clientId,"sharedKey");
    
    return new Uint8Array(_decryptKey(signingKey));
};

/**
 * encrypts and saves signing key
 *
 * @async
 * @param {string} clientId - client id
 * @param {Promise<Uint8Array>} signingKey - signing key
 */
const _setSigningKey = async (clientId, signingKey) => {
    setLocalStorage(clientId, "signingKey", signingKey);
};

/**
 * decrypt api key using shared key
 *
 * @async
 * @param {string} clientId - client id of shared key
 * @param {Buffer} encApiKey - encrypted api key
 * @returns {Promise<Buffer>} decrypted api key
 */
const decrypt = async (clientId, encApiKey) => {
    const sharedKey = await _getSharedKey(clientId);

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
 * @async
 * @param {string} clientId - client id
 * @returns {Promise<Uint8Array>} shared key
 */
const _getSharedKey = async (clientId) => {
    const sharedEncKey = getLocalStorage(clientId,"sharedKey");
    return _decryptKey(sharedEncKey);
};

/**
 * encrypts and saves shared key
 *
 * @async
 * @param {string} clientId - client id
 * @param {Promise<Uint8Array>} sharedKey - shared key
 */
const _setSharedKey = async (clientId, sharedKey) => {
    setLocalStorage(clientId,"sharedKey", sharedKey);
};

/**
 * generate shared key using elliptic curve diffie hellman
 *
 * @async
 * @param {Uint8Array} theirPubKey - exchanger public key
 * @param {Uint8Array} outPrivKey - own private key
 * @returns {Object} client id and shared key
 *     @param {string} clientId - client id of shared key
 *     @param {Promise<Uint8Array>} sharedKey - the shared key
 */
const _genSharedKey = async (theirPubKey, myKeyPair) => {
    const ourPrivKey = myKeyPair.privateKey;

    const sharedKey = sodium.crypto_scalarmult(ourPrivKey, theirPubKey);
    const clientId = crypto.createHash("sha1").update(sharedKey).digest("hex").toUpperCase();

    await _setSharedKey(clientId, sharedKey);

    return clientId;
};

/**
 * initiate the client key exchange process by sending box and sign public key
 *
 * @param {function} getTheirBoxPubKeyFunc - anon function to get server box public key
 */
const initClientKeys = async (getTheirBoxPubKeyFunc) => {
    const myBoxKeyPair = sodium.crypto_box_keypair();
    const mySignKeyPair = sodium.crypto_sign_keypair();

    const theirBoxPubKey = new Uint8Array(
        await getTheirBoxPubKeyFunc(
            Buffer.from(myBoxKeyPair.publicKey),
            Buffer.from(mySignKeyPair.publicKey)
        )
    );

    const clientId = await _genSharedKey(theirBoxPubKey, myBoxKeyPair);
    await _setSigningKey(clientId, mySignKeyPair.privateKey);
};

module.exports = {
    KEY_STORE: KEY_STORE,
    OAT_PASS: OAT_PASS,

    sign: sign,
    decrypt: decrypt,
    initClientKeys: initClientKeys,
    setLocalStorage: setLocalStorage,
    getLocalStorage: getLocalStorage,

    _getSigningKey: _getSigningKey,
    _setSigningKey: _setSigningKey,
    _getSharedKey: _getSharedKey,
    _setSharedKey: _setSharedKey,
    _encryptKey: _encryptKey,
    _decryptKey: _decryptKey,
};
