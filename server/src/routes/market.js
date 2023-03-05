// Import dependencies
const express = require("express");

// Setup the express server router
const router = express.Router();

// GPG + MongoDB Update Module
const { updateByToken } = require("../utils/update");

const oak = require("../utils/oak.js");

const market = require("../utils/market.js");

router.get("/store/get", async (req, res) => {
    res.setHeader("Content-Type", "application/json");

    // Check if token exists
    const token = req.get("OAK");
    if (token === undefined) {
        res.status(401).json({ response: "OAK Token Missing" });
        return;
    }

    try {
        const { err, result, valid } = await updateByToken(token, {});
        if (err) {
            res.status(403).json({ response: err });
            return;
        }

        if (!valid) {
            res.status(204).json();
            return;
        }

        const inventory = await market.getInventory();

        const newToken = result;
        res.setHeader("OAK", newToken);
        res.status(200).json({ response: inventory });
    } catch (err) {
        console.error(err.toString());
        res.status(500).json({ response: "Invalid token" });
    }
});

router.get("/cart/get", async (req, res) => {
    res.setHeader("Content-Type", "application/json");

    // Check if token exists
    const token = req.get("OAK");
    if (token === undefined) {
        res.status(401).json({ response: "OAK Token Missing" });
        return;
    }

    try {
        const { err, result, valid } = await updateByToken(token, oak.getSessionData(token));
        if (err) {
            res.status(403).json({ response: err });
            return;
        }

        if (!valid) {
            res.status(204).json();
            return;
        }

        const cart = market.getCart(token);

        const newToken = result;
        res.setHeader("OAK", newToken);
        res.status(200).json({ response: cart });
    } catch (err) {
        console.error(err.toString());
        res.status(500).json({ response: "Invalid token" });
    }
});

router.post("/cart/set", async (req, res) => {
    if (!req.accepts("json")) {
        res.status(400).json();
        return;
    }

    let cart = req.body;

    try {
        const token = req.get("OAK");
        if (token === undefined) {
            res.status(401).json({ response: "OAK Token Missing" });
            return;
        }

        cart = await market.setCart(cart);
        const newFields = oak.getSessionData(token);
        newFields.cart = cart;

        if (newFields.cart === null) {
            res.status(400).json({ response: "Cart Not Valid" });
            return;
        }

        const { err, result, valid } = await updateByToken(token, newFields);
        if (err) {
            res.status(403).json({ response: err });
            return;
        }

        if (!valid) {
            res.status(204).json();
            return;
        }

        const newToken = result;
        res.setHeader("OAK", newToken);
        res.status(200).json({ response: cart });
    } catch (err) {
        console.error(err.toString());
        res.status(500).json({ response: "Invalid token" });
    }
});

router.post("/store/buy", async (req, res) => {

})

// Export the router
module.exports = router;
