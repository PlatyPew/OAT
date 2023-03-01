const crypto = require("crypto");
const gpg = require("./gpg");

const _genRNG = () => {
    return crypto.randomBytes(64);
};

/**
 * Initialise the OAK process
 *
 * @param {string} pubKey - Public Key Of Client In Base64
 * @returns {string, string, string} Key ID and base64 encoded and encrypted RNG
 */
const init = (pubKey) => {
    const pubKeyBytes = Buffer.from(pubKey, "base64");

    const keyId = gpg.importKey(pubKeyBytes);
    const encryptedRNG = gpg.encrypt(keyId, _genRNG()).toString("base64");

    // TODO: Generate secret
    const secret = undefined;

    return { keyId, encryptedRNG, secret };
};

/**
 * Roll the next key
 *
 * @param {string} keyId - Key To Encrypt With
 * @param {string} currToken - Current Token Used
 * @param {string} cb - Next Token
 * @returns {string, string} Encrypted RNG value
 */
const rollKey = (keyId, currToken, cb) => {
    const currTokenBytes = Buffer.from(currToken, "base64");

    const rng = _genRNG();

    const nextToken = crypto
        .createHash("sha512")
        .update(Buffer.concat([currTokenBytes, rng]))
        .digest("base64");
    cb(nextToken);

    const encryptedRNG = gpg.encrypt(keyId, rng).toString("base64");

    // TODO: Generate secret
    const secret = undefined;

    return { encryptedRNG, secret };
};

module.exports = {
    init: init,
    rollKey: rollKey,
};
