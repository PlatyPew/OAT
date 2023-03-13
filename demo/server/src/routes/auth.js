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
            return res.status(403).json({ response: "Wrong Password" });

        next();
    },
    oat.initpath,
    (_, res) => {
        return res.json({ response: true });
    }
);

// Export the router
module.exports = router;
