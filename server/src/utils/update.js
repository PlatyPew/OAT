const { AccountInfoModel } = require("../models/AccountModel");

// GPG + MongoDB Update Module
const gpg = require('./gpg');

// OAK Module
const oak = require('../../index');

const updateByAccount = async (email, password, publickey) => {
    const acc = await AccountInfoModel.findOne({ email: email });

    if (!acc) return false;

    if (acc.password !== password) return false;

    if (!publickey) return false;

    // Insert part where either we replace or reject public key if already exist in db
    try {
        const gpgUid = gpg.importKey(publickey);
        acc.gpgUid = gpgUid;
    } catch {

    }

    let iv = oak.generateIV();

    // Store token in both prevtoken and newtoken
    acc.prevToken = iv;
    acc.newToken = iv;
    acc.save();

    return iv;
};

const updateByToken = async (token) => {
    const valid = await AccountInfoModel.findOne({ $or: [
        { prevToken: token },
        { newToken: token }
    ]})
    
    if (valid.newToken === token) { // Documents with token as newToken exist.
        const { rng, newToken } = oak.generateNewToken(token);
        const bool = true;

        valid.prevToken = token;
        valid.newToken = newToken;
        valid.save();

        return { rng, bool };
    } 
    else if (valid.prevToken === token) { // Documents with token as prevToken exist.
        const { rng, newToken } = oak.generateNewToken(token);
        const bool = false;

        valid.newToken = newToken;
        valid.save();

        return { rng, bool };
    } 
    else { // No documents with token as prevToken/newToken exist.
        const rng = "";
        const bool = false;
        return { rng, bool };
    }

    // If newToken == token, accept and generate new iv
    // send new iv
    // prevToken = token, newToken = gen()

    // If prevToken == token, reject and generate new iv 
    // send new iv
    // newToken = gen()
};

const getGpgUid = async (email) => {
    const acc = await AccountInfoModel.findOne({ email: email });

    if (!acc) return false;

    return acc.gpgUid;
};

module.exports = {
    updateByAccount: updateByAccount,
    getGpgUid: getGpgUid,
    updateByToken: updateByToken
};