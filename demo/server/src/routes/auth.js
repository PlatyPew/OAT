// Import dependencies
const express = require("express");
const oat = require("@platypew/oatoken-express");

const auth = require("../utils/auth");

// Setup the express server router
const router = express.Router();

router.post(
    "/login",
    async (req, res, next) => {
        const email = req.body.email;
        const password = req.body.password;

        if (!(await auth.verifyCredentials(email, password)))
            return res.status(403).json({ response: "Wrong Username Or Password" });

        next();
    },
    oat.initpath,
    (_, res) => {
        return res.redirect("/");
    }
);

router.post("/logout", oat.deinitpath, async (_, res) => {
    return res.redirect("/");
});

// Export the router
module.exports = router;
