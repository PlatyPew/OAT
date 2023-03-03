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

const _splitToken = (token) => {
    const [keyB64, data] = token.split("-");
    const [fieldsB64, hmacB64] = data.split("|");

    return [keyB64, [fieldsB64, hmacB64]];
};

const _insertKeyID = (keyId, fields) => {
    if (x.hasOwnProperty("pubkeyid")) throw new Error('Cannot Use "pubkeyid" As Key');

    fields.pubkeyid = keyId;
    return fields;
};

const _stripKeyID = (fields) => {
    if (!x.hasOwnProperty("pubkeyid")) throw new Error("Public Key ID Not Found");

    delete fields.pubkeyid;
    return fields;
};

/**
 * Returns the data fields as JSON
 *
 * @param {string} metadataSig - Metadata Signature
 * @returns {json} JSON data
 */
const extractSessionData = (token) => {
    const [fieldsB64, hmacB64] = _splitToken(token)[1];

    if (!_verifySessionData(fieldsB64, hmacB64)) throw new Error("Data Has Been Tampered");

    return _stripKeyID(fieldsB64);
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

/**
 * [TODO:description]
 *
 * @param {[TODO:type]} metadataSig - [TODO:description]
 * @returns {[TODO:type]} [TODO:description]
 */
const _verifySessionData = (fieldsB64, hmacB64) => {
    const fieldsBytes = Buffer.from(fieldsB64, "base64");

    return (
        crypto.createHmac("sha3-512", _oakPass()).update(fieldsBytes).digest("base64") === hmacB64
    );
};

/**
 * Initialise the OAK process
 *
 * @param {string} pubKey - Public Key Of Client In Base64
 * @returns {string, string, string, object} Key ID, base64 encoded and encrypted RNG, next token, metadata
 */
const initToken = (pubKey) => {
    const pubKeyBytes = Buffer.from(pubKey, "base64");

    const rng = _genRNG();
    const nextToken = crypto.createHash("sha3-512").update(rng).digest("base64");

    const keyId = gpg.importKey(pubKeyBytes);
    const encryptedRNG = gpg.encrypt(keyId, rng).toString("base64");

    // TODO: Generate secret
    const metadata = undefined;

    return { gpgUid: keyId, encryptedRNG, nextToken, metadata };
};

/**
 * Roll the next key
 *
 * @param {string} keyId - Key To Encrypt With
 * @param {string} currToken - Current Token Used
 * @param {string} signature - Client Signature of token
 * @returns {string, string, boolean, object} Encrypted RNG value, next token, metadata
 */
const rollToken = (keyId, currToken, signature) => {
    const currTokenBytes = Buffer.from(currToken, "base64");

    // -WIP- modify verify() function to check signature against public key and data
    //const signatureValid = verify(keyId,)

    const rng = _genRNG();

    const nextToken = crypto
        .createHash("sha3-512")
        .update(Buffer.concat([currTokenBytes, rng]))
        .digest("base64");

    const encryptedRNG = gpg.encrypt(keyId, rng).toString("base64");

    // TODO: Generate secret
    const metadata = undefined;

    return { encryptedRNG, nextToken, signatureValid, metadata };
};

module.exports = {
    initToken: initToken,
    rollToken: rollToken,
    extractSessionData: extractSessionData,
};
