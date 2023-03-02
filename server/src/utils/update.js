const { AccountInfoModel } = require("../models/AccountModel");

// OAK Module
const oak = require('./oak');

const updateByAccount = async (email, publicKey) => {
    const acc = await AccountInfoModel.findOne({ email: email });

    if (!acc) return false;

    if (!publicKey) return false;
    // OAK init function
    const { gpgUid, encryptedRNG, nextToken, metadata } = oak.init(publicKey);
    // Store token in both prevtoken and newtoken
    acc.prevToken = nextToken;
    acc.newToken = nextToken;
    acc.gpgUid = gpgUid;
    acc.save();

    console.log(nextToken.toString('hex'));

    return { encryptedRNG, metadata };
};

const updateByToken = async (token) => {
    const acc = await AccountInfoModel.findOne({ $or: [
        { prevToken: token },
        { newToken: token }
    ]});
    
    console.log(acc.gpgUid);

    if (acc.newToken === token) { // Documents with token as newToken exist.
        const { encryptedRNG, nextToken, metadata } = oak.rollToken(acc.gpgUid,token);
        const newTokenBoolean = true;

        acc.prevToken = token;
        acc.newToken = nextToken;
        acc.save();

        console.log(nextToken.toString('hex'));

        return { encryptedRNG, metadata, bool: newTokenBoolean };
    } 
    else if (acc.prevToken === token) { // Documents with token only as prevToken exist.
        const { encryptedRNG, nextToken, metadata } = oak.rollToken(acc.gpgUid, token);
        const newTokenBoolean = false;

        acc.newToken = nextToken;
        acc.save();

        console.log(nextToken.toString('hex'));

        return { encryptedRNG, metadata, newTokenBoolean };
    } 
    else { // No documents with token as prevToken/newToken exist.
        const encryptedRNG = undefined, metadata = undefined;
        const newTokenBoolean = false;
        return { encryptedRNG, metadata, newTokenBoolean };
    }
};

module.exports = {
    updateByAccount: updateByAccount,
    updateByToken: updateByToken
};