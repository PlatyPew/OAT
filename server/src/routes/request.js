// Import dependencies
const express = require("express");
const mongoose = require("mongoose");

// GPG + MongoDB Update Module
const gpg = require('../utils/gpg');
const { updateByToken } = require("../utils/update");

// Setup the express server router
const router = express.Router();

router.get("/", async(req, res) => {
    res.setHeader("Content-Type", "application/json");
    // const token = req.body.token;
    const token = req.get("OAK");
    const signature = req.get("OAK Signature");

    const { rng, bool } = await updateByToken(token);
    res.status(200).json({
        ok: true,
        rng: rng
    });

});

// Export the router
module.exports = router;