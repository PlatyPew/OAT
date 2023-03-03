const { AccountInfoModel } = require("../models/AccountModel");

// OAK Module
const oak = require('./oak');

// GPG Module
const gpg = require('./gpg');

/**
 * Insert values into client's account token and public key UID
 * 
 * @param {string} email - Account email 
 * @param {string} publickey - Client Public Key 
 * @returns {string, object} Base64 encoded and encrypted RNG, metadata
 */
const updateByAccount = async (email, publicKey) => {
    const acc = await AccountInfoModel.findOne({ email: email });

    if (!acc) return false;

    if (!publicKey) return false;
    // OAK init function
    const { gpgUid, encryptedRNG, nextToken, metadata } = oak.initToken(publicKey);
    // Store token in both prevtoken and nextToken
    acc.prevToken = nextToken;
    acc.nextToken = nextToken;
    acc.gpgUid = gpgUid;
    acc.save();

    console.log(nextToken.toString('hex'));

    return { encryptedRNG, metadata };
};

/**
 * Verify token via client GPG signature
 * Generate new token for client to use 
 * Update nextToken in MongoDB database 
 * Replace prevToken if token supplied by client is valid; Validity is based on if the token supplied is the next token or 
 * 
 * @param {string} token - Token supplied by client
 * @param {string} signature - GPG Signature supplied by client to be verified (Base64 encoded)
 * @returns {string, object, boolean} Base64 encoded and encrypted RNG, metadata, boolean value for token
 */
const updateByToken = async (token, signature) => {
    const acc = await AccountInfoModel.findOne({ $or: [
        { prevToken: token },
        { nextToken: token }
    ]});

    if (acc.nextToken === token) { // Documents with token as nextToken exist.
        const { encryptedRNG, nextToken, metadata } = oak.rollToken(acc.gpgUid, token, signature);
        const newTokenBoolean = true;

        acc.prevToken = token;
        acc.nextToken = nextToken;
        acc.save();

        console.log(nextToken.toString('hex'));

        return { encryptedRNG, metadata, bool: newTokenBoolean };
    } 
    else if (acc.prevToken === token) { // Documents with token only as prevToken exist.
        const { encryptedRNG, nextToken, metadata } = oak.rollToken(acc.gpgUid, token, signature);
        const newTokenBoolean = false;

        acc.nextToken = nextToken;
        acc.save();

        console.log(nextToken.toString('hex'));

        return { encryptedRNG, metadata, newTokenBoolean };
    } 
    else { // No documents with token as prevToken/nextToken exist.
        const encryptedRNG = undefined, metadata = undefined;
        const newTokenBoolean = false;
        return { encryptedRNG, metadata, newTokenBoolean };
    }
};

module.exports = {
    updateByAccount: updateByAccount,
    updateByToken: updateByToken
};
