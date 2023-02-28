const mongoose = require("mongoose");

const AccountInfoSchema = new mongoose.Schema(
    {
        email: { type: "String" },
        password: { type: "String" },
        gpgUid: { type: "String" },
        prevToken: { type: "String" },
        newToken: { type: "String" }
    },
    { collection: "accounts", versionKey: false }
);

module.exports = {
    AccountInfoModel: mongoose.model("AccountInfoModel", AccountInfoSchema),
};