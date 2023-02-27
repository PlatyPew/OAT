// Import dependencies
const express = require("express");
const gpg = require('gpg');

// Signin Module
const auth = require("../utils/auth");

// OAK Module
const oak = require('../.././index');

// Setup the express server router
const router = express.Router();

// On post
router.post("/", async(req, res) => {
    
    // Get user from the database
    const email = req.body.email;
    const password = req.body.password;
    const publickey = req.body.publickey;

    // **Need to store public key in server's keystore**

    res.setHeader("Content-Type", "application/json");

    try {
        const out = await auth.signin(email, password);

        if (out) {
            let iv = oak.generateIV();
            //let encryptedIV = gpg.encrypt(iv, "--recipient") // **Need to encrypt iv with public key**
        }

        res.json({ response: out });
    } catch (err) {
        res.status(500).json({ response: err.toString() });
    }

    res.send({
        ok: true,
        token: token
    });
});

// Export the router
module.exports = router;