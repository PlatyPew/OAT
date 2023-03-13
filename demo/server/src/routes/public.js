// Import dependencies
const express = require("express");

const path = require("path");

// Setup the express server router
const router = express.Router();

router.get("*", (_, res) => {
    res.redirect("/");
});

// Export the router
module.exports = router;
