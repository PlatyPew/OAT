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
    } catch (err) {
        return null;
    }
};

const buyItems = async (cart) => {
    const inventory = (await InventoryInfoModel.find())[0];

    Object.keys(cart).forEach((item) => {
        inventory[item] -= cart[item];
    });
    inventory.save();
};

const setInventory = async (newInventory) => {
    const inventory = (await InventoryInfoModel.find())[0];

    try {
        Object.keys(inventory.toObject())
            .slice(1)
            .forEach((item) => {
                if (!newInventory.hasOwnProperty(item)) throw "Item not there";
                inventory[item] = newInventory[item];
            });
        inventory.save();
        return true;
    } catch {
        return false;
    }
};

module.exports = {
    getCart: getCart,
    setCart: setCart,
    getInventory: getInventory,
    buyItems: buyItems,
    setInventory: setInventory,
};
