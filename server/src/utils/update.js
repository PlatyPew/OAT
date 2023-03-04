const { AccountInfoModel } = require("../models/AccountModel");

// OAK Module
const oak = require("./oak");

/**
 * Insert values into client's account token and public key UID
 *
 * @param {string} email - Account email
 * @param {string} publickey - Client Public Key
 * @returns {promise} Base64 encoded API token
 */
const updateByAccount = async (email, publicKeyB64) => {
    const acc = await AccountInfoModel.findOne({ email: email });

    if (!acc) return { err: "Account not found", result: undefined };

    // OAK init function
    try {
        const token = oak.initToken(publicKeyB64, {}, async (keyId, nextKey) => {
            // Store token in both prevApiKey and nextApiKey
            acc.prevApiKey = nextKey;
            acc.nextApiKey = nextKey;
            acc.gpgKeyId = keyId;
            acc.save();
        });

        return { err: undefined, result: token };
    } catch {
        return { err: "Invalid public key", result: undefined };
    }
};

/**
 * Perform OAK rollToken matching MongoDB Document's nextApiKey
 * @param {function} - Function to fetch the nextApiKey from MongoDB using GPG Public Key ID
 * @param {string} token - Token supplied by client in HTTP Request Header
 * @param {object} - Metadata new fields
 * @param {function} - Function to replace prevApiKey with current API Key and nextApiKey with new API Key
 *
 * If rollToken-nextApiKey fails,
 * Perform OAK rollToken matching MongoDB Document's prevApiKey
 * @param {function} - Function to fetch the prevApiKey from MongoDB using GPG Public Key ID
 * @param {string} token - Token supplied by client in HTTP Request Header
 * @param {object} - Metadata new fields
 * @param {function} - Function to replace nextApiKey with new API Key
 *
 * If rollToken-prevApiKey fails, throw Error with message.
 *
 * @param {string} token - Token supplied by client in HTTP Request Header
 * @param {json} newfields - new session data fields to update
 * @returns {promise} Base64 encoded API token, boolean value for token validity
 */
const updateByToken = async (token, newfields) => {
    const tokenFromNextApiKey = await oak.rollToken(
        async (keyId) => {
            // Find next token value in database
            const acc = await AccountInfoModel.findOne({ gpgKeyId: keyId });
            return Buffer.from(acc.nextApiKey);
        },
        token,
        newfields,
        async (keyId, nextKey) => {
            const acc = await AccountInfoModel.findOne({ gpgKeyId: keyId });
            // Store current token in both prevApiKey and nextApiKey
            acc.prevApiKey = acc.nextApiKey;
            acc.nextApiKey = nextKey;
            acc.save();
        }
    );

    if (tokenFromNextApiKey) return { newToken: tokenFromNextApiKey, valid: true };

    // If current token != nextApiKey in database, check if current token == prevApiKey
    const tokenFromPrevApiKey = await oak.rollToken(
        async (keyId) => {
            // Find next token value in database
            const acc = await AccountInfoModel.findOne({ gpgKeyId: keyId });
            return Buffer.from(acc.prevApiKey);
        },
        token,
        newfields,
        async (keyId, nextApiKey) => {
            const acc = await AccountInfoModel.findOne({ gpgKeyId: keyId });
            // Store next token in nextApiKey
            acc.nextApiKey = nextApiKey;
            acc.save();
        }
    );

    // If current token != prevApiKey in database, return error message
    if (!tokenFromPrevApiKey) throw new Error("Token Mismatch");

    return { newToken: tokenFromPrevApiKey, valid: false };
};

module.exports = {
    updateByAccount: updateByAccount,
    updateByToken: updateByToken,
};
