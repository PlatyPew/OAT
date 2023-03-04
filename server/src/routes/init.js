// Import dependencies
const express = require("express");

// GPG + MongoDB Update Module
const { verifyCredentials } = require("../utils/auth");
const { updateByAccount } = require("../utils/update");

// OAK Module
const oak = require("../utils/oak");

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

    // Get user from the database
    const email = req.body.email;
    const password = req.body.password;
    const publicKeyB64 = req.body.publickey;

    try {
        if (!verifyCredentials(email, password)) {
            res.status(401).json({ response: "Wrong email or password" });
        }

        const token = await updateByAccount(email, publicKeyB64);

        res.setHeader("OAK", token);
        res.status(200).json({ response: {} });
    } catch (err) {
        res.status(500).json({
            response: err.toString(),
        });
    }
});

// Export the router
module.exports = router;
