const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const oat = require("@platypew/oatoken").server;

const DOMAIN = process.env.DOMAIN;
if (!DOMAIN) throw new Error("DOMAIN variable not set");

const TMP_DIR = "./tmp";
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR);

/**
 * dynamically create a path to init keys exchange
 */
const initpath = (_, res, next) => {
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

/**
 * initialise the key exchange
 *
 * @async
 */
const init = (initFields) => async (req, res, next) => {
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
    if (!requestToken) res.status(400).json({ response: "OAT Token Not Found" });

    try {
        await fs.promises.unlink(`${TMP_DIR}/${basename}`);

        const responseToken = await oat.initToken(requestToken, initFields);
        res.setHeader("OAT", responseToken);
        res.json({ response: true });
    } catch {
        res.status(400).json({ response: "Invalid Token" });
    }

    return next();
};

/**
 * roll to the next token
 *
 * @async
 */
const roll = async (req, res, next) => {
    const requestToken = req.get("OAT");
    if (!requestToken) res.status(400).json({ response: "OAT Token Not Found" });

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

/**
 * gets the session data of the response token
 *
 * @async
 * @param {Response} res - response from expressjs
 * @returns {Promise<Object>} returns json of session data
 */
const getsession = async (res) => {
    const responseToken = res.getHeader("OAT");
    return oat.getSessionData(responseToken);
};

/**
 * sets the session data of the response token
 *
 * @async
 * @param {Response} res - response from expressjs
 * @param {Object} newFields - json of session data to set
 */
const setsession = async (res, newFields) => {
    let responseToken = res.getHeader("OAT");
    responseToken = await oat.setSessionData(responseToken, newFields);
    res.setHeader("OAT", responseToken);
};

module.exports = {
    initpath: initpath,
    init: init,
    roll: roll,
    getsession: getsession,
    setsession: setsession,
};
