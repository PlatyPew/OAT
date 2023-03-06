// Import dependencies
const express = require("express");

// Setup the express server router
const router = express.Router();

// GPG + MongoDB Update Module
const { updateByToken, validCurrentToken } = require("../utils/update");

const oat = require("../utils/oat.js");

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
router.get("/store/get", async (req, res) => {
    res.setHeader("Content-Type", "application/json");

    // Check if token exists
    const token = req.get("OAT");
    if (token === undefined) {
        res.status(401).json({ response: "OAT Token Missing" });
        return;
    }

    try {
        const { err, newToken, valid } = await updateByToken(token, oat.getSessionData(token));
        if (err) {
            res.status(403).json({ response: err });
            return;
        }

        res.setHeader("OAT", newToken);
        if (!valid) {
            res.status(204).json();
            return;
        }

        const inventory = await market.getInventory();
        res.status(200).json({ response: inventory });
    } catch (err) {
        console.error(err.toString());
        res.status(500).json({ response: "Invalid token" });
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
router.get("/cart/get", async (req, res) => {
    res.setHeader("Content-Type", "application/json");

    // Check if token exists
    const token = req.get("OAT");
    if (token === undefined) {
        res.status(401).json({ response: "OAT Token Missing" });
        return;
    }

    try {
        const { err, newToken, valid } = await updateByToken(token, oat.getSessionData(token));
        if (err) {
            res.status(403).json({ response: err });
            return;
        }

        res.setHeader("OAT", newToken);
        if (!valid) {
            res.status(204).json();
            return;
        }

        const cart = market.getCart(token);

        res.status(200).json({ response: cart });
    } catch (err) {
        console.error(err.toString());
        res.status(500).json({ response: "Invalid token" });
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
router.post("/cart/set", async (req, res) => {
    if (!req.accepts("json")) {
        res.status(400).json();
        return;
    }

    let cart = req.body;

    const token = req.get("OAT");
    if (token === undefined) {
        res.status(401).json({ response: "OAT Token Missing" });
        return;
    }

    try {
        cart = await market.setCart(cart);
        const newFields = oat.getSessionData(token);
        newFields.cart = cart;

        if (newFields.cart === null) {
            res.status(400).json({ response: "Cart Not Valid" });
            return;
        }

        const { err, newToken, valid } = await updateByToken(token, newFields);
        if (err) {
            res.status(403).json({ response: err });
            return;
        }

        res.setHeader("OAT", newToken);
        if (!valid) {
            res.status(204).json();
            return;
        }

        res.status(200).json({ response: cart });
    } catch (err) {
        console.error(err.toString());
        res.status(500).json({ response: "Invalid token" });
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
router.post("/store/buy", async (req, res) => {
    const token = req.get("OAT");
    if (token === undefined) {
        res.status(401).json({ response: "OAT Token Missing" });
        return;
    }

    try {
        let newFields = oat.getSessionData(token);
        const cart = newFields.cart;
        if (await validCurrentToken(token)) {
            await market.buyItems(newFields.cart);
            newFields.cart = {};
        }

        const { err, newToken, valid } = await updateByToken(token, newFields);
        if (err) {
            res.status(403).json({ response: err });
            return;
        }

        res.setHeader("OAT", newToken);
        if (!valid) {
            res.status(204).json();
            return;
        }

        res.status(200).json({ response: cart });
    } catch (err) {
        console.error(err);
        res.status(500).json({ response: "Invalid token" });
    }
});

/**
 * <url>/src/routes/market/store/restock
 * Set new quantities for inventory 
 * Roles allowed: admin
 *
 * update.updateByToken():
 * Roll API Token
 * 
 * market.setInventory():
 * Set new quantities for inventory 
 *
 * @req.header {string} OAT - Current Base64 encoded API token
 * @req.body {json} - JSON object containing inventory items with new quantities
 * @res.header {string} OAT - Next Base64 encoded API token
 * @res.json {object|string} - Return new inventory as JSON object or response message
 */
router.post("/store/restock", async (req, res) => {
    if (!req.accepts("json")) {
        res.status(400).json();
        return;
    }

    let newInventory = req.body;
    Object.keys(newInventory).forEach((item) => {
        newInventory[item] = parseInt(newInventory[item]);
    });

    const token = req.get("OAT");
    if (token === undefined) {
        res.status(401).json({ response: "OAT Token Missing" });
        return;
    }

    try {
        const newFields = oat.getSessionData(token);

        const { err, newToken, valid } = await updateByToken(token, newFields);
        if (err) {
            res.status(403).json({ response: err });
            return;
        }

        res.setHeader("OAT", newToken);
        if (!newFields.admin) {
            res.status(403).json();
            return;
        }

        if (!valid) {
            res.status(204).json();
            return;
        }

        if (!(await market.setInventory(newInventory))) {
            res.status(400).json({ response: "Incorrect Format" });
            return;
        }

        res.status(200).json({ response: newInventory });
    } catch (err) {
        console.error(err);
        res.status(500).json({ response: "Invalid token" });
    }
});

// Export the router
module.exports = router;
