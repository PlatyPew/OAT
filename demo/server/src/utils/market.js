const { InventoryInfoModel } = require("../models/MarketModel");

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
    await inventory.save();
};

const restockInventory = async () => {
    const inventory = (await InventoryInfoModel.find())[0];

    let items = Object.keys(inventory.toObject()).slice(1);

    items.forEach((item) => {
        inventory[item] = 100;
    });
    await inventory.save();
};

module.exports = {
    setCart: setCart,
    getInventory: getInventory,
    buyItems: buyItems,
    restockInventory: restockInventory,
};
