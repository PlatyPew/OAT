const sodium = require("libsodium-wrappers");
const crypto = require("crypto");
const fs = require("fs");

require("dotenv").config();

const KEY_STORE = `${process.env.HOME || "."}/.oatkeys`;

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
 * @async
 * @param {Promise<string>} domain - domain
 */
const makeKeyStore = async (domain) => {
    try {
        await fs.promises.access(`${KEY_STORE}/${domain}`, fs.constants.F_OK);
    } catch {
        await fs.promises.mkdir(`${KEY_STORE}/${domain}`);
    }
};

/**
 * checks if directory exists
 *
 * @async
 * @param {Promise<string>} domain - domain
 */
const checkKeyStore = async (domain) => {
    try {
        await fs.promises.access(`${KEY_STORE}/${domain}`, fs.constants.F_OK);
    } catch {
        throw new Error("Key directory not found");
    }
};

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
 * verify api key with client private key
 *
 * @async
 * @param {string} clientId - client id of shared key
 * @param {Uint8Array} signedData - signature and data
 * @returns {Object} api key and domain
 *     @param {Buffer} apiKey - unsigned api key
 *     @param {Promise<string>} domain - unsigned domain
 */
const verify = async (clientId, signedData) => {
    const pubKey = await _getVerifyingKey(clientId);

    const unsignedData = sodium.crypto_sign_open(signedData, pubKey);
    const apiKey = Buffer.from(unsignedData.slice(0, 32));
    const domain = Buffer.from(unsignedData.slice(32)).toString();

    return { apiKey, domain };
};

/**
 * read and decrypt signing key
 *
 * @async
 * @param {string} domain - domain
 * @returns {Promise<Uint8Array>} signing key
 */
const _getSigningKey = async (domain) => {
    await checkKeyStore(domain);

    const signingKey = await fs.promises.readFile(`${KEY_STORE}/${domain}/signing.key`);
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
    await makeKeyStore(domain);

    await fs.promises.writeFile(
        `${KEY_STORE}/${domain}/signing.key`,
        _encryptKey(Buffer.from(signingKey))
    );
};

/**
 * reads verification key
 *
 * @async
 * @param {string} clientId - client id
 * @returns {Promise<Uint8Array>} verification key
 */
const _getVerifyingKey = async (clientId) => {
    await checkKeyStore(clientId);

    const verifyingKey = await fs.promises.readFile(`${KEY_STORE}/${clientId}/verifying.key`);
    return new Uint8Array(_decryptKey(verifyingKey));
};

/**
 * saves verification key
 *
 * @async
 * @param {string} clientId - client id
 * @param {Uint8Array} verifyingKey - verification key
 */
const _setVerifyingKey = async (clientId, verifyingKey) => {
    await makeKeyStore(clientId);

    await fs.promises.writeFile(
        `${KEY_STORE}/${clientId}/verifying.key`,
        _encryptKey(Buffer.from(verifyingKey))
    );
};

/**
 * encrypt api key using shared key
 *
 * @async
 * @param {string} clientId - client id
 * @param {Buffer} apiKey - api key
 * @returns {Promise<Buffer>} encrypted api key
 */
const encrypt = async (clientId, apiKey) => {
    const sharedKey = await _getSharedKeyServer(clientId);

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", sharedKey, iv);
    let enc = cipher.update(apiKey);
    cipher.final();

    return Buffer.concat([iv, enc]);
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
 * gets and decrypts shared key server
 *
 * @async
 * @param {string} domain - domain
 * @returns {Promise<Uint8Array>} shared key
 */
const _getSharedKeyClient = async (domain) => {
    await checkKeyStore(domain);

    const sharedEncKey = await fs.promises.readFile(`${KEY_STORE}/${domain}/shared.key`);
    return _decryptKey(sharedEncKey);
};

/**
 * gets and decrypts shared key server
 *
 * @async
 * @param {string} clientId - client id
 * @returns {Promise<Uint8Array>} shared key
 */
const _getSharedKeyServer = async (clientId) => {
    await checkKeyStore(clientId);

    const sharedEncKey = await fs.promises.readFile(`${KEY_STORE}/${clientId}/shared.key`);
    return new Uint8Array(_decryptKey(sharedEncKey));
};

/**
 * encrypts and saves shared key client
 *
 * @async
 * @param {string} domain - domain
 * @param {Uint8Array} sharedKey - shared key
 */
const _setSharedKeyClient = async (domain, sharedKey) => {
    await makeKeyStore(domain);

    await fs.promises.writeFile(`${KEY_STORE}/${domain}/shared.key`, _encryptKey(sharedKey));
};

/**
 * encrypts and saves shared key server
 *
 * @async
 * @param {string} clientId - client id
 * @param {Uint8Array} sharedKey - shared key
 */
const _setSharedKeyServer = async (clientId, sharedKey) => {
    await makeKeyStore(clientId);

    await fs.promises.writeFile(`${KEY_STORE}/${clientId}/shared.key`, _encryptKey(sharedKey));
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

    return { clientId, sharedKey };
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

/**
 * initiate the server key exchange by sending box public key
 *
 * @param {Buffer} theirBoxPubKey - client's box public key
 * @param {Buffer} theirSignPubKey - client's sign public key
 * @returns {Object} server's public box key
 *     @param {string} clientId - client id
 *     @param {Promise<Uint8Array>} outBoxPubKey - box public key
 */
const initServerKeys = async (theirBoxPubKey, theirSignPubKey) => {
    theirBoxPubKey = new Uint8Array(theirBoxPubKey);
    theirSignPubKey = new Uint8Array(theirSignPubKey);

    const myBoxKeyPair = sodium.crypto_box_keypair();
    const { clientId, sharedKey } = await _genSharedKey(theirBoxPubKey, myBoxKeyPair);

    await _setSharedKeyServer(clientId, sharedKey);
    await _setVerifyingKey(clientId, theirSignPubKey);

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
    _getSharedKeyClient: _getSharedKeyClient,
    _setSharedKeyClient: _setSharedKeyClient,
    _getSharedKeyServer: _getSharedKeyServer,
    _setSharedKeyServer: _setSharedKeyServer,
    _encryptKey: _encryptKey,
    _decryptKey: _decryptKey,
};
