const mongoose = require("mongoose");

const KeyInfoSchema = new mongoose.Schema(
    {
        clientId: { type: "String" },
        sharedKey: { type: "Buffer" },
        verifyingKey: { type: "Buffer" },
        currApiKey: { type: "Buffer" },
    },
    { collection: "oat_keys", versionKey: false, _id: false }
);

module.exports = {
    KeyInfoModel: mongoose.model("KeyInfoModel", KeyInfoSchema),
};
