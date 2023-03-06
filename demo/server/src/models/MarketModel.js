const mongoose = require("mongoose");

/**
 * MongoDB Schema for inventory structure for API server
 */
const InvetoryInfoModel = new mongoose.Schema(
    {
        banana: { type: "Number" },
        grape: { type: "Number" },
        apple: { type: "Number" },
        watermelon: { type: "Number" },
        orange: { type: "Number" },
        lemon: { type: "Number" },
    },
    { collection: "inventory", versionKey: false }
);

module.exports = {
    InventoryInfoModel: mongoose.model("InventoryInfoModel", InvetoryInfoModel),
};
