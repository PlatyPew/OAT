// Import dependencies
const express = require("express");
const mongoose = require("mongoose");

// GPG + MongoDB Update Module
// const gpg = require('../utils/gpg');
const { updateByToken } = require("../utils/update");

// Setup the express server router
const router = express.Router();

/**
 * <url>/api/request
 * Authenticate email:password
 * 
 * update.updateByToken():
 * Generate and send Base64 encoded and encrypted RNG to client
 * Store next token in database
 * 
 * @req.header {string} "OAK" - One-time API key/token
 * @req.header {string} "OAK Signature" - Digital Signature of OAK
 * @res.send {bool, string, object} - Boolean value to indicate result, Base64 encoded and encrypted RNG, metadata
 */
router.get("/", async(req, res) => {
    res.setHeader("Content-Type", "application/json");
    // const token = req.body.token;
    const token = req.get("OAK");
    const signature = req.get("OAK Signature");

    const { rng, metadata, bool } = updateByToken(token, signature);
    res.status(200).json({
        ok: bool,
        rng: rng,
        metadata: metadata
    });

});

// Export the router
module.exports = router;