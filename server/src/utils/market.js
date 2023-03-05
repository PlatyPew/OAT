const { InventoryInfoModel } = require("../models/MarketModel");

const oak = require("./oak");

const getInventory = async () => {
    const inventory = (await InventoryInfoModel.find())[0].toObject();
    delete inventory._id;
    return inventory;
};

const getCart = (token) => {
    return oak.getSessionData(token).cart;
};

module.exports = {
    getCart: getCart,
    getInventory: getInventory,
};
