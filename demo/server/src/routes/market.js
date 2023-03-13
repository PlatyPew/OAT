// Import dependencies
const express = require("express");

// Setup the express server router
const router = express.Router();

const oat = require("@platypew/oatoken-express");

const market = require("../utils/market.js");

/**
 * <url>/src/routes/market/store/get
 * List all items in the store
 *
 * update.updateByToken():
 * Roll API Token
 * 
 * market.getInventory():
 * Return inventory associated to account
 *
 * @req.header {string} OAT - Current Base64 encoded API token
 * @res.header {string} OAT - Next Base64 encoded API token
 * @res.json {object|string} - Return inventory items as JSON object or response message
 */
router.get("/store/get", oat.roll, async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    try {
        const inventory = await market.getInventory();
        return res.json({ response: inventory });
    } catch (err) {
        console.error(err);
        return res.status(500).send();
    }
});

/**
 * <url>/src/routes/market/cart/get
 * List all items in the shopping cart stored in session data 
 *
 * update.updateByToken():
 * Roll API Token
 * 
 * market.getCart():
 * Return shopping cart stored in session data in API token
 *
 * @req.header {string} OAT - Current Base64 encoded API token
 * @res.header {string} OAT - Next Base64 encoded API token
 * @res.json {object|string} - Return shopping cart items as JSON object or response message
 */
router.get("/cart/get", oat.roll, async (_, res) => {
    res.setHeader("Content-Type", "application/json");
    try {
        const cart = (await oat.getsession(res)).cart;
        return res.json({ response: cart });
    } catch (err) {
        console.error(err);
        return res.status(500).send();
    }
});

/**
 * <url>/src/routes/market/cart/set
 * List all items in the shopping cart stored in session data 
 *
 * update.updateByToken():
 * Roll API Token
 * 
 * market.setCart():
 * Add items in inventory into shopping cart
 *
 * @req.header {string} OAT - Current Base64 encoded API token
 * @req.body {json} - JSON object containing inventory items with quantity
 * @res.header {string} OAT - Next Base64 encoded API token
 * @res.json {string} - Return response message
 */
router.post("/cart/set", oat.roll, async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    if (!req.accepts("json")) return res.status(400).json();

    let cart = req.body;

    try {
        cart = await market.setCart(cart);
        const newFields = await oat.getsession(res);
        newFields.cart = cart;

        if (newFields.cart === null) return res.status(400).json({ response: "Cart Not Valid" });
        await oat.setsession(res, newFields);

        return res.json({ response: cart });
    } catch (err) {
        console.error(err.toString());
        return res.status(500).send();
    }
});

/**
 * <url>/src/routes/market/store/buy
 * Checkout and deduct items from inventory according to quantity in shopping cart
 *
 * update.updateByToken():
 * Roll API Token
 * 
 * market.buyItems():
 * Deduct quantity of items in shopping cart from inventory
 *
 * @req.header {string} OAT - Current Base64 encoded API token
 * @res.header {string} OAT - Next Base64 encoded API token
 * @res.json {object|string} - Return empty shopping cart as JSON object or response message
 */
router.post("/store/buy", oat.roll, async (_, res) => {
    res.setHeader("Content-Type", "application/json");
    try {
        let newFields = await oat.getsession(res);
        const cart = newFields.cart;

        await market.buyItems(newFields.cart);
        newFields.cart = {};

        await oat.setsession(res, newFields);

        return res.json({ response: cart });
    } catch (err) {
        console.error(err);
        return res.status(500).send();
    }
});

// Export the router
module.exports = router;
