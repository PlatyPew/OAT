const mongoose = require("mongoose");

/**
 * MongoDB Schema for account structure for API server
 */
const AccountInfoSchema = new mongoose.Schema(
    {
        email: { type: "String" },
        password: { type: "String" },
    },
    { collection: "accounts", versionKey: false }
);

module.exports = {
    AccountInfoModel: mongoose.model("AccountInfoModel", AccountInfoSchema),
};
