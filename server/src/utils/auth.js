const { AccountInfoModel } = require("../models/AccountModel");

// GPG Module
const gpg = require('./gpg');

/**
 * Verify and authenticate account on MongoDB
 * 
 * @param {string} email - Account email 
 * @param {string} password - Account password 
 * @returns {boolean} True: Account authenticated, False: Account not found / Password incorrect
 */
const verifyCredentials = async (email, password) => {
    const acc = await AccountInfoModel.findOne({ email: email });

    if (!acc) throw new Error("Email and password incorrect");

    if (acc.password !== password) throw new Error("Email and password incorrect");

    return true;
};

module.exports = {
    verifyCredentials: verifyCredentials
};