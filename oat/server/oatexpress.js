const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const oat = require("./oat").server;

const DOMAIN = process.env.DOMAIN;
if (!DOMAIN) throw new Error("DOMAIN variable not set");

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
        res.json({ response: true });
    } catch {
        res.status(400).json({ response: "Invalid Token" });
    }

    return next();
};

const roll = async (req, res, next) => {
    const requestToken = req.get("OAT");

    try {
        if (!(await oat.authToken(DOMAIN, requestToken)))
            return res.status(403).json({ response: false });

        const responseToken = await oat.rollToken(requestToken, oat.getSessionData(requestToken));
        res.setHeader("OAT", responseToken);
    } catch {
        return res.status(400).json({ response: "Invalid Token" });
    }

    next();
};

const oatPath = (_, res, next) => {
    // Create a file on the system which begins the init process
    const rng = crypto.randomBytes(8).toString("hex");
    const pathToOat = `${TMP_DIR}/${rng}`;

    fs.writeFile(pathToOat, "", () => {
        setTimeout(() => {
            fs.unlink(pathToOat, (_) => {});
        }, 15000);
    });

    res.setHeader("OATINIT", `/oat/${rng}`);
    next();
};

module.exports = {
    init: init,
    roll: roll,
    oatPath: oatPath,
};
