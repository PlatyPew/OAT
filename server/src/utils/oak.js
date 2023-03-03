const crypto = require("crypto");
const gpg = require("./gpg");

/**
 * Gets oak password from environment variable
 *
 * @returns {string} Oak password to use
 */
const _oakPass = () => {
    const oakPass = process.env.OAK_PASS;

    if (oakPass === undefined) throw new Error("Environment variable OAK_PASS is not set");
    if (oakPass.length !== 32) throw new Error("Password shoud be at 32 bytes long");

    return oakPass;
};

/**
 * Generates random 64-bits
 *
 * @returns {bytes} random bytes
 */
const _genRNG = () => {
    return crypto.randomBytes(64);
};

/**
 * Splits token into relevant fields
 *
 * @param {string} token - Token that client sends
 * @returns {array} Array of base64 values
 */
const _splitToken = (token) => {
    const [signedKeyB64, data] = token.split("-");
    const [fieldsB64, hmacB64] = data.split("|");

    const signedKey = Buffer.from(signedKeyB64, "base64");
    const fields = JSON.parse(Buffer.from(fieldsB64, "base64"));
    const hmac = Buffer.from(hmacB64, "base64");

    return { signedKey, fields, hmac };
};

/**
 * Adds key ID to data section
 *
 * @param {string} keyId - Key ID
 * @param {json} fields - Session Data
 * @returns {json} Session data with appended public key ID
 */
const _insertKeyID = (keyId, fields) => {
    if (fields.hasOwnProperty("pubkeyid")) throw new Error('Cannot Use "pubkeyid" As Key');

    fields.pubkeyid = keyId;
    return fields;
};

/**
 * Removes key ID from data section
 *
 * @param {json} fields - Session Data
 * @returns {json} Session data with removed public key ID
 */
const _stripKeyID = (fields) => {
    if (!fields.hasOwnProperty("pubkeyid")) throw new Error("Public Key ID Not Found");

    delete fields.pubkeyid;
    return fields;
};

/**
 * Returns the data fields as JSON
 *
 * @param {string} metadataSig - Metadata Signature
 * @returns {json} JSON data
 */
const getSessionData = (token) => {
    const { fields, hmac } = _splitToken(token);

    if (!_verifySessionData(fields, hmac)) throw new Error("Data Has Been Tampered");

    return _stripKeyID(fields);
};

/**
 * Generates hash based on metadata
 *
 * @param {json} metadata - JSON data
 * @returns {string} signed metadata
 */
const _signSessionData = (fields) => {
    const fieldBytes = Buffer.from(JSON.stringify(fields));

    const hmacB64 = crypto.createHmac("sha3-512", _oakPass()).update(fieldBytes).digest("base64");

    const fieldB64 = fieldBytes.toString("base64");

    return `${fieldB64}|${hmacB64}`;
};

const _verifySessionData = (fields, hmac) => {
    const fieldBytes = Buffer.from(JSON.stringify(fields));

    const calculatedHmac = crypto.createHmac("sha3-512", _oakPass()).update(fieldBytes).digest();

    return Buffer.compare(calculatedHmac, hmac) === 0;
};

/**
 * Initialise the OAK process
 *
 * @param {string} pubKey - Public Key Of Client In Base64
 * @returns {string, string, string, object} Key ID, base64 encoded and encrypted RNG, next token, metadata
 */
const initToken = (pubKeyB64, cb) => {
    const pubKeyBytes = Buffer.from(pubKeyB64, "base64");
    const keyId = gpg.importKey(pubKeyBytes);

    const rng = _genRNG();
    const nextKey = crypto.createHmac("sha3-512", _oakPass()).update(rng).digest();
    cb(keyId, nextKey);

    const encNextKeyB64 = gpg.encrypt(keyId, nextKey).toString("base64");

    const fields = _insertKeyID(keyId, {});
    const data = _signSessionData(fields);

    return `${encNextKeyB64}-${data}`;
};

const _authToken = (getKeyFunc, token) => {
    const { signedKey, fields, hmac } = _splitToken(token);

    if (!_verifySessionData(fields, hmac)) throw new Error("Data Has Been Tampered");

    const keyId = fields.pubkeyid;

    const clientKey = gpg.verify(keyId, signedKey);

    const serverKey = getKeyFunc(keyId);

    if (Buffer.compare(clientKey, serverKey) !== 0) return false;

    return { keyId, serverKey };
};

/**
 * Roll the next key
 *
 * @param {string} keyId - Key To Encrypt With
 * @param {string} currToken - Current Token Used
 * @param {string} signature - Client Signature of token
 * @returns {string, string, boolean, object} Encrypted RNG value, next token, metadata
 */
const rollToken = (getKeyFunc, token, newfields, cb) => {
    const auth = _authToken(getKeyFunc, token);
    if (!auth) return false;

    const { keyId, serverKey } = auth;
    const rng = _genRNG();
    const nextKey = crypto.createHmac("sha3-512", serverKey).update(rng).digest();

    cb(keyId, nextKey);

    const encNextKeyB64 = gpg.encrypt(keyId, nextKey).toString("base64");

    const fields = _insertKeyID(keyId, newfields);
    const data = _signSessionData(fields);

    return `${encNextKeyB64}-${data}`;
};

module.exports = {
    initToken: initToken,
    rollToken: rollToken,
    getSessionData: getSessionData,
};
