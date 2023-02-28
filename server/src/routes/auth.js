// Import dependencies
const express = require("express");
const gpg = require('gpg');

// Signin Route
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
    //const publickey = req.body.publickey;

    // **Need to store public key in server's keystore**

    //res.setHeader("Content-Type", "application/json");

    try {
        const out = await auth.signin(email, password);

        if (out) {
            let iv = oak.generateIV();
            console.log("success");
            console.log(iv);
            
            // Store token in both prevtoken and newtoken in mongodb
            

            // Encrypt IV with public key and send to client

            //let encryptedIV = gpg.encrypt(iv, "--recipient") // **Need to encrypt iv with public key**
        }
        console.log(out);

        //res.json({ response: out });
    } catch (err) {
        res.status(500).json({ response: err.toString() });
    }

    res.send({
        ok: true,
        //token: token
    });
});

// Export the router
module.exports = router;