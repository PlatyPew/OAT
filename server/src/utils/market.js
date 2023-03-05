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

const setCart = async (cart) => {
    const inventory = (await InventoryInfoModel.find())[0];

    try {
        Object.keys(cart).forEach((item) => {
            if (cart[item] <= 0) throw "Not more than 0";
            if (inventory[item] < cart[item]) throw "Something";
        });

        return cart;
    } catch(err) {
        return null;
    }
};

module.exports = {
    getCart: getCart,
    setCart: setCart,
    getInventory: getInventory,
};
