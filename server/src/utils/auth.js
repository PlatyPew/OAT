const { AccountInfoModel } = require("../models/AccountModel");

/**
 * Verify and authenticate account on MongoDB
 * 
 * @param {string} email - Account email 
 * @param {string} password - Account password 
 * @returns {boolean} True: Account authenticated, False: Account not found / Password incorrect
 */
const verifyCredentials = async (email, password) => {
    const acc = await AccountInfoModel.findOne({ email: email });

    if (!acc) return false;

    if (acc.password !== password) return false;

    return true;
};

module.exports = {
    verifyCredentials: verifyCredentials
};
