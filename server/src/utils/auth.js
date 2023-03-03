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

    if (!acc) return false;

    if (acc.password !== password) return false;

    return true;
};

// const getGpgUid = async (search, type) => {
//     let acc, gpgUid = false;
//     switch(type) {
//         case "email":
//             // Query MongoDB for Document with email
//             acc = await AccountInfoModel.findOne({ email: search });

//             if (!acc) return gpgUid;

//             // Store GPG uid
//             gpgUid = acc.gpgUid;

//             break;
//         case "token":
//             // Query MongoDB for Document with token
//             acc = await AccountInfoModel.findOne({ $or: [
//                 { prevToken: search },
//                 { nextToken: search }
//             ]});

//             if (!acc) return gpgUid;

//             // Store GPG uid
//             gpgUid = acc.gpgUid;

//             break;
//         default:
//             break;
//     }
//     return gpgUid;
// };

// const setGpgUid = async (email, gpgUid) => {
//     const acc = await AccountInfoModel.findOne({ email: email });

//     if (!acc) return false;

//     acc.gpgUid = gpgUid;
//     acc.save();

//     return true;
// };

module.exports = {
    verifyCredentials: verifyCredentials
};