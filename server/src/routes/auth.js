// Import dependencies
const express = require("express");
const mongoose = require("mongoose");

// GPG + MongoDB Update Module
const gpg = require('../utils/gpg');
const update = require("../utils/update");

// OAK Module
const oak = require('../../index');

const fs = require('fs'); // To be removed and uninstalled

// Setup the express server router
const router = express.Router();

// On post
router.post("/", async(req, res) => {
    res.setHeader("Content-Type", "application/json");

    // Get user from the database
    const email = req.body.email;
    const password = req.body.password;
    //const publickey = req.body.publickey;
    
    const publickey = fs.readFileSync('./src/routes/key.asc'); // Temp solution

    try {
        const iv = await update.updateByAccount(email, password, publickey);

        if (iv) {
            console.log("success");
            // Encrypt IV with public key and send to client
            const gpgUid = await update.getGpgUid(email);
            console.log(gpgUid);
            const encryptedIV = await gpg.encrypt(gpgUid, iv); // There is no assurance this key belongs to the named user
            console.log(encryptedIV);
            res.status(200).send({
                ok: true,
                token: encryptedIV
            });
        }
        else {
            throw new Error("Authentication failed.");
        }
    } catch (err) {
        res.status(503).json({
            ok: false,
            response: err.toString()
        });
    }
});

// Export the router
module.exports = router;