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

const _genRNG = () => {
    return crypto.randomBytes(64);
};

/**
 * Returns the data fields as JSON
 *
 * @param {string} metadataSig - Metadata Signature
 * @returns {json} JSON data
 */
const getDataFields = (metadataSig) => {
    const [metadataB64, _] = metadataSig.split("|");
    const metadataBytes = Buffer.from(metadataB64, "base64");
    return JSON.parse(metadataBytes);
};

/**
 * Generates hash based on metadata
 *
 * @param {json} metadata - JSON data
 * @returns {string} signed metadata
 */
const signMetadata = (metadata) => {
    const metadataBytes = Buffer.from(JSON.stringify(metadata));

    const metadataHmac = crypto
        .createHmac("sha3-512", _oakPass())
        .update(metadataBytes)
        .digest("base64");

    const metadataB64 = metadataBytes.toString("base64");

    return `${metadataB64}|${metadataHmac}`;
};

const verifyMetadata = (metadataSig) => {
    const [metadataB64, metadataHmac] = metadataSig.split("|");

    const metadataBytes = Buffer.from(metadataB64, "base64");

    const hmac = crypto.createHmac("sha3-512", _oakPass()).update(metadataBytes).digest("base64");

    return metadataHmac === hmac;
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
    getDataFields: getDataFields,
    signMetadata: signMetadata,
    verifyMetadata: verifyMetadata,
};
