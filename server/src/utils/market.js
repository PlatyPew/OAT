const { InventoryInfoModel } = require("../models/MarketModel");

const oak = require("./oak");

/**
 * Return inventory quantities from MongoDB 
 * 
 * @returns {object} - Inventory quantities
 */
const getInventory = async () => {
    const inventory = (await InventoryInfoModel.find())[0].toObject();
    delete inventory._id;
    return inventory;
};

/**
 * Return shopping cart quantities from Token session data
 * 
 * @param {string} token - Base64 encoded API token
 * @returns {object} - Shopping cart data
 */
const getCart = (token) => {
    return oak.getSessionData(token).cart;
};

/**
 * Set quantities of items in shopping cart session data
 * 
 * @param {object} cart - Object containing quantities of items
 * @returns {object|null} - cart object containing new quantities of items or null
 */
const setCart = async (cart) => {
    const inventory = (await InventoryInfoModel.find())[0];

    try {
        Object.keys(cart).forEach((item) => {
            cart[item] = parseInt(cart[item]);
            if (cart[item] <= 0) throw "Not more than 0";
            if (inventory[item] < cart[item]) throw "Something";
        });

        return cart;
    } catch (err) {
        return null;
    }
};

/**
 * Deduct quantities of items in shopping cart session data from inventory
 * 
 * @param {object} cart - Object containing quantities of items
 */
const buyItems = async (cart) => {
    const inventory = (await InventoryInfoModel.find())[0];

    Object.keys(cart).forEach((item) => {
        inventory[item] -= cart[item];
    });
    inventory.save();
};

/**
 * Set quantities of items in newInventory for MongoDB inventory data
 * 
 * @param {object} newInventory - Object containing new quantities of items
 * @returns {boolean} - True: Quantities updated successfully, False: Error occurred when updating
 */
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
