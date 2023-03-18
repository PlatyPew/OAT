const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const oat = require("@platypew/oatoken").server;

const DOMAIN = process.env.DOMAIN;
if (!DOMAIN) throw new Error("DOMAIN variable not set");

const TMP_DIR = "./tmp";
const INIT_DIR = `${TMP_DIR}/init`;
const DEINIT_DIR = `${TMP_DIR}/deinit`;

if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR);
if (!fs.existsSync(INIT_DIR)) fs.mkdirSync(INIT_DIR);
if (!fs.existsSync(DEINIT_DIR)) fs.mkdirSync(DEINIT_DIR);

/**
 * dynamically create a path to init keys exchange
 */
const initpath = (_, res, next) => {
    // Create a file on the system which begins the init process
    const rng = crypto.randomBytes(8).toString("hex");
    const pathToOat = `${INIT_DIR}/${rng}`;

    fs.writeFile(pathToOat, "", () => {
        setTimeout(() => {
            fs.unlink(pathToOat, (_) => {});
        }, 15000);
    });

    res.setHeader("OATINIT", `/oat/${rng}`);
    next();
};

const deinitpath = async (req, res, next) => {
    // Roll
    const requestToken = req.get("OAT");
    if (!requestToken) return res.status(400).json({ response: "OAT Token Not Found" });

    try {
        if (!(await oat.authToken(DOMAIN, requestToken)))
            return res.status(403).json({ response: false });

        const responseToken = await oat.rollToken(requestToken, oat.getSessionData(requestToken));
        res.setHeader("OAT", responseToken);
    } catch {
        return res.status(400).json({ response: "Invalid Token" });
    }

    // Create a file on the system which begins the init process
    const rng = crypto.randomBytes(8).toString("hex");
    const pathToOat = `${DEINIT_DIR}/${rng}`;

    fs.writeFile(pathToOat, "", () => {
        setTimeout(() => {
            fs.unlink(pathToOat, (_) => {});
        }, 15000);
    });

    res.setHeader("OATDEINIT", `/oat/${rng}`);

    next();
};

/**
 * initialise the key exchange
 *
 * @async
 */
const init = (initFields) => async (req, res, next) => {
    if (req.protocol !== "https") return res.status(301).send("Please Use HTTPS");

    const dirname = path.dirname(req.path);
    const basename = path.basename(req.path);

    // Do nothing if does not begin with /oat
    if (dirname !== "/oat") return next();

    // Check if file exists in tmp directory
    try {
        await fs.promises.access(`${INIT_DIR}/${basename}`);
    } catch {
        return next();
    }

    // Initialise key exchange process
    const requestToken = req.get("OAT");
    if (!requestToken) return res.status(400).json({ response: "OAT Token Not Found" });

    try {
        await fs.promises.unlink(`${INIT_DIR}/${basename}`);

        const responseToken = await oat.initToken(requestToken, initFields);
        res.setHeader("OAT", responseToken);
        return res.json({ response: true });
    } catch {
        return res.status(400).json({ response: "Invalid Token" });
    }
};

const deinit = () => async (req, res, next) => {
    if (req.protocol !== "https") return res.status(301).send("Please Use HTTPS");

    const dirname = path.dirname(req.path);
    const basename = path.basename(req.path);

    // Do nothing if does not begin with /oat
    if (dirname !== "/oat") return next();

    // Check if file exists in tmp directory
    try {
        await fs.promises.access(`${DEINIT_DIR}/${basename}`);
    } catch {
        return next();
    }

    const challenge = req.get("OATDEINIT");
    if (!challenge) return next();

    try {
        await fs.promises.unlink(`${DEINIT_DIR}/${basename}`);

        if (!(await oat.authToken(DOMAIN, requestToken))) return next();

        const challengeResponse = await oat.deinitToken(requestToken, challenge);

        res.setHeader("OATDEINIT", challengeResponse);
    } catch {
        return res.status(400).json({ response: "Invalid Token" });
    }

    next();
};

/**
 * roll to the next token
 *
 * @async
 */
const roll = async (req, res, next) => {
    const requestToken = req.get("OAT");
    if (!requestToken) return res.status(400).json({ response: "OAT Token Not Found" });

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
    init: init,
    deinit: deinit,
    initpath: initpath,
    deinitpath: deinitpath,
    roll: roll,
    getsession: getsession,
    setsession: setsession,
};
