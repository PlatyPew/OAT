const path = require("path");
const fs = require("fs");

const oat = require("./oat").server;

const TMP_DIR = "./tmp";

if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR);

const init = async (req, res, next) => {
    const dirname = path.dirname(req.path);
    const basename = path.basename(req.path);

    // Do nothing if does not begin with /oat
    if (dirname !== "/oat") return next();

    // Check if file exists in tmp directory
    try {
        await fs.promises.access(`${TMP_DIR}/${basename}`);
    } catch {
        return next();
    }

    // Initialise key exchange process
    const requestToken = req.get("OAT");
    try {
        await fs.promises.unlink(`${TMP_DIR}/${basename}`);

        const responseToken = await oat.initToken(requestToken, {});
        res.setHeader("OAT", responseToken);
    } catch {
        res.status(400).json({ response: "Invalid Token" });
    }

    return next();
};

const authenticate = (req, res, next) => {
    // Create a file on the system which begins the init process
    /* console.log(req.get("OAT")); */
    next();
};

module.exports = {
    init: init,
    authenticate: authenticate,
};
