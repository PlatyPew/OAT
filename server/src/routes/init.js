// Import dependencies
const express = require("express");

// GPG + MongoDB Update Module
const { verifyCredentials, alreadyInit } = require("../utils/auth");
const { updateByAccount } = require("../utils/update");

// Setup the express server router
const router = express.Router();

/**
 * <url>/api/init
 * Authenticate email:password
 *
 * update.updateByAccount():
 * Verify account
 * Call oak.js initToken()
 *
 * @req.body {string} email - Account email
 * @req.body {string} password - Account password
 * @req.body {string} publickey - Client GPG public key
 * @res.header {string} OAK - Base64 encoded API token
 * @res.send {boolean, <string>} - Boolean value to indicate result, error message if error occurred
 */
router.post("/", async (req, res) => {
    const publicKeyB64 = req.get("OAK");

    const email = req.body.email;
    const password = req.body.password;

    res.setHeader("Content-Type", "application/json");
    try {
        if (!await verifyCredentials(email, password)) {
            res.status(401).json({ response: "Wrong email or password" });
            return;
        }

        if (await alreadyInit(email)) {
            res.status(403).json({ response: "API token already initialised" });
            return;
        }

        const token = await updateByAccount(email, publicKeyB64);
        res.setHeader("OAK", token);
        res.status(200).json({ response: "API token successfully initialised" });
    } catch (err) {
        res.status(500).json({
            response: err.toString(),
        });
    }
});

// Export the router
module.exports = router;
