const crypto = require("crypto");
const gpg = require("./gpg");

/**
 * gets oak password from environment variable
 *
 * @returns {string} oak password to use
 */
const _oakPass = () => {
    const oakPass = process.env.OAK_PASS;

    if (oakPass === undefined) throw new Error("Environment variable OAK_PASS is not set");
    if (oakPass.length !== 32) throw new Error("Password shoud be at 32 bytes long");

    return oakPass;
};

/**
 * generates random 512-bits
 *
 * @returns {bytes} 64 random bytes
 */
const _genRNG = () => {
    return crypto.randomBytes(64);
};

/**
 * splits token into relevant fields
 *
 * @param {string} token - token that client sends
 * @returns {json} object of signedKey, fields and hmac
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
 * adds key id to data section
 *
 * @param {string} keyId - public key id
 * @param {json} fields - session data fields
 * @returns {json} session data fields with appended public key ID
 */
const _insertKeyID = (keyId, fields) => {
    if (fields.hasOwnProperty("pubkeyid")) throw new Error('Cannot Use "pubkeyid" As Key');

    fields.pubkeyid = keyId;
    return fields;
};

/**
 * removes key ID from data section
 *
 * @param {json} fields - session data fields
 * @returns {json} session data fields with removed public key ID
 */
const _stripKeyID = (fields) => {
    if (!fields.hasOwnProperty("pubkeyid")) throw new Error("Public Key ID Not Found");

    delete fields.pubkeyid;
    return fields;
};

/**
 * get session data from token (does not check for integrity)
 *
 * @param {string} token - token that is sent from the client
 * @returns {json} session data extracted from the token
 */
const getSessionData = (token) => {
    const { fields } = _splitToken(token);
    return _stripKeyID(fields);
};

/**
 * performs hmac on session data fields to prevent tampering
 *
 * @param {bytes} key - key of current token
 * @param {json} fields - session data to perform hmac
 * @returns {string} concatenated json data and hmac in base64
 */
const _signSessionData = (key, fields) => {
    const fieldBytes = Buffer.from(JSON.stringify(fields));

    const hmacB64 = crypto
        .createHmac("sha3-512", _oakPass())
        .update(fieldBytes)
        .update(key)
        .digest("base64");

    const fieldB64 = fieldBytes.toString("base64");

    return `${fieldB64}|${hmacB64}`;
};

/**
 * ensures session data fields have not been tampered
 *
 * @param {bytes} key - key of current token
 * @param {json} fields - session data fields
 * @param {bytes} hmac - hmac on session data
 * @returns {boolean} check if session data fields has been tampered
 */
const _verifySessionData = (key, fields, hmac) => {
    const fieldBytes = Buffer.from(JSON.stringify(fields));

    const calculatedHmac = crypto
        .createHmac("sha3-512", _oakPass())
        .update(fieldBytes)
        .update(key)
        .digest();

    return Buffer.compare(calculatedHmac, hmac) === 0;
};

/**
 * initialise the initial oak key
 *
 * @param {string} pubKeyB64 - public key in base64
 * @param {json} newfields - new session data fields to update
 * @param {function} cb - callback that returns key id and the next key
 * @returns {string} token to send back to client
 */
const initToken = (pubKeyB64, newFields, cb) => {
    const pubKeyBytes = Buffer.from(pubKeyB64, "base64");
    const keyId = gpg.importKey(pubKeyBytes);

    const rng = _genRNG();
    const nextApiKey = crypto.createHmac("sha3-512", _oakPass()).update(rng).digest();
    cb(keyId, nextApiKey);

    const encNextApiKeyB64 = gpg.encrypt(keyId, nextApiKey).toString("base64");

    const fields = _insertKeyID(keyId, newFields);
    const data = _signSessionData(nextApiKey, fields);

    return `${encNextApiKeyB64}-${data}`;
};

/**
 * authenticate the token
 *
 * @async
 * @param {function} getKeyFunc - function to fetch the key from the server
 * @param {string} token - token sent from the client
 * @returns {promise} key id and current key
 */
const authToken = async (getKeyFunc, token) => {
    const { signedKey, fields, hmac } = _splitToken(token);

    const keyId = fields.pubkeyid;

    const clientApiKey = gpg.verify(keyId, signedKey);
    const serverApiKey = await getKeyFunc(keyId);

    if (!_verifySessionData(clientApiKey, fields, hmac)) throw new Error("Data Has Been Tampered");
    if (Buffer.compare(clientApiKey, serverApiKey) !== 0) return false;

    return { keyId, serverKey: serverApiKey };
};

/**
 * roll the next key
 *
 * @async
 * @param {function} getKeyFunc - function to fetch the key from the server
 * @param {string} token - tokent sent from the client
 * @param {json} newfields - new session data fields to update
 * @param {function} cb - returns the new key
 * @returns {promise} next encrypted token
 */
const rollToken = async (getKeyFunc, token, newfields, cb) => {
    const auth = await authToken(getKeyFunc, token);
    if (!auth) return false;

    const { keyId, serverKey } = auth;
    const rng = _genRNG();
    const nextApiKey = crypto.createHmac("sha3-512", serverKey).update(rng).digest();

    cb(keyId, nextApiKey);

    const encNextKeyB64 = gpg.encrypt(keyId, nextApiKey).toString("base64");

    const fields = _insertKeyID(keyId, newfields);
    const data = _signSessionData(nextApiKey, fields);

    return `${encNextKeyB64}-${data}`;
};

module.exports = {
    initToken: initToken,
    authToken: authToken,
    rollToken: rollToken,
    getSessionData: getSessionData,
};
