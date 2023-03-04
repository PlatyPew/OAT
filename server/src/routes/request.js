// Import dependencies
const express = require("express");

// GPG + MongoDB Update Module
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
 * @req.header {string} OAK - One-time API key/token
 * @res.send {boolean, boolean|string} - Boolean value to indicate result, Base64 encoded and encrypted RNG, metadata
 */
router.get("/", async (req, res) => {
    res.setHeader("Content-Type", "application/json");

    const token = req.get("OAK");
    if (token === undefined) {
        res.status(401).json({ response: "OAK Token Missing" });
        return;
    }

    try {
        const { err, result } = await updateByToken(token, {});

        if (err) {
            res.status(403).json({ response: err });
            return;
        }

        const newToken = result;
        res.setHeader("OAK", newToken);
        res.status(200).json({ response: "Good Request" });
    } catch (err) {
        console.error(err.toString());
        res.status(500).json({ response: "Invalid token" });
    }
});

// Export the router
module.exports = router;
