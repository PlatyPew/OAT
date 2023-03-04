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
    res.setHeader("Content-Type", "application/json");

    const publicKeyB64 = req.get("OAK");

    const email = req.body.email;
    const password = req.body.password;

    // If public key is not provided
    if (!publicKeyB64) {
        res.status(400).json({ response: "No public key found" });
        return;
    }

    try {
        // Checks if credentals match
        if (!(await verifyCredentials(email, password))) {
            res.status(401).json({ response: "Wrong email or password" });
            return;
        }

        // Check if token has already been initialised
        if (await alreadyInit(email)) {
            res.status(403).json({ response: "API token already initialised" });
            return;
        }

        const { err, result } = await updateByAccount(email, publicKeyB64);

        if (err) {
            res.status(400).json({ response: err });
            return;
        }
        const token = result;

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
