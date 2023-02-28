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

    try {
        const gpgUid = gpg.import_key(publickey);
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

const getGpgUid = async (email) => {
    const acc = await AccountInfoModel.findOne({ email: email });

    if (!acc) return false;

    return acc.gpgUid;
};

module.exports = {
    updateByAccount: updateByAccount,
    getGpgUid: getGpgUid
};