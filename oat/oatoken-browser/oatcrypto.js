const sodium = require("libsodium-wrappers");
const browserCrypto = require("browserify-aes");
const randomBytes = require("randombytes");
const pbkdf2 = require('pbkdf2');
let OAT_PASS = "";

/**
 * creates necessary directories for key storage and initialise OAT_PASS
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "sendPassword") {
        OAT_PASS = pbkdf2.pbkdf2Sync(message.password, 'ilovecryptoveryverymuchgivemeaplswingkeongspirosweihan', 133198, 32, 'sha256');
    }
});

/**
 * store key-value pair into window.localStorage
 *
 * @param {string} domain - domain name for stored values
 * @param {string} name - key
 * @param {string} value - value
 */
const setLocalStorage = (domain, name, value) => {
    let clientObj = JSON.parse(window.localStorage.getItem(domain));
    if (clientObj === null) {
        // Initialise key-pair
        let clientObj = {};
        clientObj[name] = value;
        window.localStorage.setItem(domain, JSON.stringify(clientObj));
        return;
    }
    // Store new value
    clientObj[name] = value;
    window.localStorage.setItem(domain, JSON.stringify(clientObj));
};

/**
 * retrieve value from key name in object with domain name in window.localStorage
 *
 * @param {string} domain - domain name for stored values window.localStorage
 * @param {string} name - key
 * @returns {string} value from key
 */
const getLocalStorage = (domain, name) => {
    let value = null;
    try {
        let domainObj = JSON.parse(window.localStorage.getItem(domain));
        if (domainObj[name] != null) {
            value = domainObj[name];
        }
        return value;
    } catch {
    } finally {
        return value;
    }
};

/**
 * signs api key with client private key
 *
 * @param {string} domain - domain
 * @param {Object} data - api key and domain to sign
 *     @param {Buffer} data.apiKey - the api key to sign
 *     @param {string} data.apiKey - the api key to sign
 * @returns {Buffer} signature and data
 */
const sign = (domainName, { apiKey, domain }) => {
    const privKey = _getSigningKey(domainName);

    const unsignedData = Buffer.concat([apiKey, Buffer.from(domain)]);
    const signature = sodium.crypto_sign(unsignedData, privKey);

    return Buffer.from(signature);
};

/**
 * read and decrypt signing key
 *
 * @param {string} domain - domain
 * @returns {Uint8Array} signing key
 */
const _getSigningKey = (domain) => {
    const signingKey = getLocalStorage(domain, "signingKey");

    if (signingKey === null) return null;

    let signingKeyArr = JSON.parse(signingKey);
    signingKeyArr = new Uint8Array(signingKeyArr);

    return new Uint8Array(_decryptKey(signingKeyArr));
};

/**
 * encrypts and saves signing key
 *
 * @async
 * @param {string} domain - domain
 * @param {Promise<Uint8Array>} signingKey - signing key
 */
const _setSigningKey = async (domain, signingKey) => {
    let encSigningKey = _encryptKey(signingKey);

    let signingKeyArr = Array.from // if available
        ? Array.from(encSigningKey) // use Array#from
        : [].map.call(encSigningKey, (v) => v); // otherwise map()

    signingKeyArr = JSON.stringify(signingKeyArr);

    setLocalStorage(domain, "signingKey", signingKeyArr);
};

/**
 * decrypt api key using shared key
 *
 * @param {string} domain - domain name
 * @param {Buffer} encApiKey - encrypted api key
 * @returns {Buffer} decrypted api key
 */
const decrypt = (domain, encApiKey) => {
    const sharedKey = _getSharedKeyClient(domain);

    if (sharedKey !== null) {
        const iv = encApiKey.slice(0, 12);
        const enc = encApiKey.slice(12);

        const decipher = browserCrypto.createDecipheriv("aes-256-gcm", sharedKey, iv);
        let dec = decipher.update(enc);

        return dec;
    } else {
        return null;
    }
};

/**
 * encrypts key using OAT_PASS
 *
 * @param {Uint8Array} decKey - unencrypted key
 * @returns {Buffer} encrypted key
 */
const _encryptKey = (decKey) => {
    const iv = new Uint8Array(randomBytes(12));
    const cipher = browserCrypto.createCipheriv("aes-256-gcm", OAT_PASS, iv);
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
    const decipher = browserCrypto.createDecipheriv("aes-256-gcm", OAT_PASS, iv);
    let dec = decipher.update(enc);

    return new Uint8Array(dec);
};

/**
 * gets and decrypts shared key server
 *
 * @param {string} domain - domain
 * @returns {Uint8Array} shared key
 */
const _getSharedKeyClient = (domain) => {
    const encSharedKey = getLocalStorage(domain, "sharedKey");

    if (encSharedKey === null) return null;

    let encSharedKeyArr = JSON.parse(encSharedKey);
    encSharedKeyArr = new Uint8Array(encSharedKeyArr);

    return _decryptKey(encSharedKeyArr);
};

/**
 * encrypts and saves shared key client
 *
 * @async
 * @param {string} domain - domain
 * @param {Promise<Uint8Array>} sharedKey - shared key
 */
const _setSharedKeyClient = async (domain, sharedKey) => {
    let encSharedKey = _encryptKey(sharedKey);

    let sharedKeyArr = Array.from // if available
        ? Array.from(encSharedKey) // use Array#from
        : [].map.call(encSharedKey, (v) => v); // otherwise map()

    sharedKeyArr = JSON.stringify(sharedKeyArr);

    setLocalStorage(domain, "sharedKey", sharedKeyArr);
};

/**
 * generate shared key using elliptic curve diffie hellman
 *
 * @async
 * @param {Uint8Array} theirPubKey - exchanger public key
 * @param {Uint8Array} outPrivKey - own private key
 * @returns {Object} client id and shared key
 *     @param {string} domain - client id of shared key
 *     @param {Promise<Uint8Array>} sharedKey - the shared key
 */
const _genSharedKey = async (theirPubKey, myKeyPair) => {
    const ourPrivKey = myKeyPair.privateKey;

    const sharedKey = sodium.crypto_scalarmult(ourPrivKey, theirPubKey);

    const digest = await crypto.subtle.digest("SHA-1", sharedKey);
    const clientId = Array.from(new Uint8Array(digest))
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('').toUpperCase()

    return { clientId, sharedKey };
};

/**
 * initiate the client key exchange process by sending box and sign public key
 *
 * @param {function} getTheirBoxPubKeyFunc - anon function to get server box public key
 */
const initClientKeys = async (domain, getTheirBoxPubKeyFunc) => {
    if (OAT_PASS !== "") {
        const myBoxKeyPair = sodium.crypto_box_keypair();
        const mySignKeyPair = sodium.crypto_sign_keypair();

        const theirBoxContents = await getTheirBoxPubKeyFunc(
            Buffer.from(myBoxKeyPair.publicKey),
            Buffer.from(mySignKeyPair.publicKey)
        );

        const theirBoxPubKey = new Uint8Array(theirBoxContents.theirBoxPubKey);

        const { clientId, sharedKey } = await _genSharedKey(theirBoxPubKey, myBoxKeyPair);

        if (clientId !== theirBoxContents.clientId) throw new Error("Shared keys do not match!");


        await _setSharedKeyClient(domain, sharedKey);
        await _setSigningKey(domain, mySignKeyPair.privateKey);
    }
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
