const sodium = require("libsodium-wrappers");
const browserCrypto = require("browser-crypto");
const randomBytes = require('randombytes');
const {sha3_256} = require('js-sha3');

/**
 * creates necessary directories for key storage and initialise OAT_PASS
 */
const OAT_PASS = sha3_256.update('123').hex();

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

const _bufferToHex =  (buffer) => { // buffer is an ArrayBuffer
    return [...new Uint8Array(buffer)]
        .map(x => x.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * signs api key with client private key
 *
 * @async
 * @param {string} domain - domain
 * @param {Object} data - api key and domain to sign
 *     @param {Buffer} data.apiKey - the api key to sign
 *     @param {string} data.apiKey - the api key to sign
 * @returns {Promise<Buffer>} signature and data
 */
const sign = async (domainName, { apiKey, domain }) => {
    const privKey = await _getSigningKey(domainName);

    const unsignedData = Buffer.concat([apiKey, Buffer.from(domain)]);
    const signature = sodium.crypto_sign(unsignedData, privKey);

    return Buffer.from(signature);
};

/**
 * read and decrypt signing key
 *
 * @async
 * @param {string} domain - domain
 * @returns {Promise<Uint8Array>} signing key
 */
const _getSigningKey = async (domain) => {
    const signingKey = getLocalStorage(clientId,"sharedKey");

    return new Uint8Array(_decryptKey(signingKey));
};

/**
 * encrypts and saves signing key
 *
 * @async
 * @param {string} domain - domain
 * @param {Uint8Array} signingKey - signing key
 */
const _setSigningKey = async (domain, signingKey) => {
    setLocalStorage(clientId, "signingKey", signingKey);
};

/**
 * decrypt api key using shared key
 *
 * @async
 * @param {string} domain - domain name
 * @param {Buffer} encApiKey - encrypted api key
 * @returns {Promise<Buffer>} decrypted api key
 */
const decrypt = async (domain, encApiKey) => {
    const sharedKey = await _getSharedKeyClient(domain);

    const iv = encApiKey.slice(0, 12);
    const enc = encApiKey.slice(12);
    const decipher = browserCrypto.createDecipheriv("aes-256-gcm", sharedKey, iv);
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
    const iv = randomBytes(12);
    const cipher = browserCrypto.createCipheriv("aes-256-gcm", Buffer.from(OAT_PASS), iv);
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
    const decipher = browserCrypto.createDecipheriv("aes-256-gcm", Buffer.from(OAT_PASS), iv);
    let dec = decipher.update(enc);

    return new Uint8Array(dec);
};

/**
 * gets and decrypts shared key server
 *
 * @async
 * @param {string} domain - domain
 * @returns {Promise<Uint8Array>} shared key
 */
const _getSharedKeyClient = async (domain) => {
    const sharedEncKey = getLocalStorage(domain,"sharedKey");

    return _decryptKey(sharedEncKey);
};

/**
 * encrypts and saves shared key client
 *
 * @async
 * @param {string} domain - domain
 * @param {Uint8Array} sharedKey - shared key
 */
const _setSharedKeyClient = async (domain, sharedKey) => {
    setLocalStorage(domain,"sharedKey", sharedKey);
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

    return { sharedKey };
};

/**
 * initiate the client key exchange process by sending box and sign public key
 *
 * @param {function} getTheirBoxPubKeyFunc - anon function to get server box public key
 */
const initClientKeys = async (domain, getTheirBoxPubKeyFunc) => {
    const myBoxKeyPair = sodium.crypto_box_keypair();
    const mySignKeyPair = sodium.crypto_sign_keypair();

    const theirBoxPubKey = new Uint8Array(
        await getTheirBoxPubKeyFunc(
            Buffer.from(myBoxKeyPair.publicKey),
            Buffer.from(mySignKeyPair.publicKey)
        )
    );

    const { sharedKey } = await _genSharedKey(theirBoxPubKey, myBoxKeyPair);

    await _setSharedKeyClient(domain, sharedKey);
    await _setSigningKey(domain, mySignKeyPair.privateKey);
};

module.exports = {
    OAT_PASS: OAT_PASS,

    sign: sign,
    decrypt: decrypt,
    initClientKeys: initClientKeys,
    setLocalStorage: setLocalStorage,
    getLocalStorage: getLocalStorage,

    _getSigningKey: _getSigningKey,
    _setSigningKey: _setSigningKey,
    _getSharedKeyClient: _getSharedKeyClient,
    _setSharedKeyClient: _setSharedKeyClient,
    _encryptKey: _encryptKey,
    _decryptKey: _decryptKey,
};
