// Import dependencies
const express = require("express");

const path = require("path");

// Setup the express server router
const router = express.Router();

router.use("/img", express.static(path.join(__dirname, "../public/img")));

router.get("/", (_, res) => {
    res.sendFile(path.join(__dirname, "../public/index.html"));
});

router.get("/login", (_, res) => {
    res.sendFile(path.join(__dirname, "../public/login.html"));
});

router.get("*", (_, res) => {
    res.redirect("/");
});

// Export the router
module.exports = router;
