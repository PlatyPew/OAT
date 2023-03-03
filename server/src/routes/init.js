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
 * Verify account 
 * Call oak.js initToken()
 * 
 * @req.body {string} email - Account email 
 * @req.body {string} password - Account password 
 * @req.body {string} publickey - Client GPG public key
 * @res.header {string} OAK - Base64 encoded API token
 * @res.send {boolean, <string>} - Boolean value to indicate result, error message if error occurred
 */
router.post("/", async(req, res) => {
    res.setHeader("Content-Type", "application/json");

    // Get user from the database
    const email = req.body.email;
    const password = req.body.password;
    //const publickey = req.body.publickey;
    
    const publickey = fs.readFileSync('./src/routes/key.asc'); // Temp solution

    try {
        verifyCredentials(email, password);

        const token = await updateByAccount(email, publicKeyB64);
        
        res.setHeader("OAK", token);
        res.status(200).json({
            ok: true
        });
    }
    catch (err) {
        res.status(503).json({
            ok: false,
            response: err.toString()
        });
    }
    
});

// Export the router
module.exports = router;