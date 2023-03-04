const { InventoryInfoModel } = require("../models/MarketModel");

const getInventory = async () => {
    const inventory = (await InventoryInfoModel.find())[0].toObject();
    delete inventory._id;
    return inventory;
};

module.exports = {
    getInventory: getInventory,
};
