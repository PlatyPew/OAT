const { AccountInfoModel } = require("../models/AccountModel");

const signup = async (email, password) => {
    const acc = await AccountInfoModel.findOne({ email: email });
    if (acc) return false;

    return await AccountInfoModel.insertMany([
        {
            email: email,
            password: password,
        },
    ]);
};

const signin = async (email, password) => {
    const acc = await AccountInfoModel.findOne({ email: email });

    if (!acc) return false;

    if (acc.password !== password) return false;

    return true;
};

module.exports = {
    signup: signup,
    signin: signin,
};