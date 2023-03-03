// Import dependencies
const express = require("express");
const mongoose = require("mongoose");

// GPG + MongoDB Update Module
// const gpg = require('../utils/gpg');
const { verifyCredentials } = require("../utils/auth");
const { updateByAccount } = require("../utils/update");

// OAK Module
const oak = require('../utils/oak');

const fs = require('fs'); // To be removed and uninstalled

// Setup the express server router
const router = express.Router();

/**
 * <url>/api/init
 * Authenticate email:password
 * 
 * update.updateByAccount():
 * Generate and send Base64 encoded and encrypted RNG to client
 * Store next token in database
 * 
 * @req.body {string} email - Account email 
 * @req.body {string} password - Account password 
 * @req.body {string} publickey - Client GPG public key
 * @res.send {bool, string, object} - Boolean value to indicate result, Base64 encoded and encrypted RNG, metadata
 */
router.post("/", async(req, res) => {
    res.setHeader("Content-Type", "application/json");

    // Get user from the database
    const email = req.body.email;
    const password = req.body.password;
    //const publickey = req.body.publickey;
    
    const publickey = fs.readFileSync('./src/routes/key.asc'); // Temp solution

    const valid = verifyCredentials(email, password);
    if (valid) {
        try {

            const {encryptedRNG, metadata} = updateByAccount(email, publickey);
            
            res.status(200).json({
                ok: true,
                rng: encryptedRNG,
                metadata: metadata
            });
        } catch (err) {
            res.status(503).json({
                ok: false,
                response: err.toString()
            });
        }
    }
    else {
        res.status(503).json({
            ok: false,
            response: "Not authorized."
        });
    }
    
});

// Export the router
module.exports = router;