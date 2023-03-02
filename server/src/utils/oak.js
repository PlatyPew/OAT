const crypto = require("crypto");
const gpg = require("./gpg");

const _genRNG = () => {
    return crypto.randomBytes(64);
};

/**
 * Initialise the OAK process
 *
 * @param {string} pubKey - Public Key Of Client In Base64
 * @returns {string, string, string, object} Key ID, base64 encoded and encrypted RNG, next token, metadata
 */
const init = (pubKey) => {
    const pubKeyBytes = Buffer.from(pubKey, "base64");

    const rng = _genRNG();
    const nextToken = crypto
        .createHash("sha512")
        .update(rng)
        .digest("base64");

    const keyId = gpg.importKey(pubKeyBytes);
    const encryptedRNG = gpg.encrypt(keyId, rng).toString("base64");

    // TODO: Generate secret
    const metadata = undefined;

    return { gpgUid:keyId, encryptedRNG, nextToken, metadata };
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
        .createHash("sha512")
        .update(Buffer.concat([currTokenBytes, rng]))
        .digest("base64");
    
    const encryptedRNG = gpg.encrypt(keyId, rng).toString("base64");

    // TODO: Generate secret
    const metadata = undefined;

    return { encryptedRNG, nextToken, signatureValid, metadata };
};

module.exports = {
    init: init,
    rollToken: rollToken,
};
