const crypto = require("crypto");
const fs = require("fs");

const oatcrypto = require("./oatcrypto");

const { KeyInfoModel } = require("./KeyModel");

/**
 * generates random 256-bits
 *
 * @returns {Buffer} 32 random bytes
 */
const _genRNG = () => {
    return crypto.randomBytes(32);
};

/**
 * get the api key by client id
 *
 * @async
 * @param {string} clientId - client id
 * @returns {Promise<Buffer>} api key
 */
const _getApiKey = async (clientId) => {
    const keystore = await KeyInfoModel.findOne({ clientId: clientId });
    if (keystore === null) return null;

    return Buffer.from(keystore.currApiKey);
};

/**
 * saves the api key
 *
 * @async
 * @param {string} clientId - client id
 * @param {Buffer} apiKey - api key
 */
const _setApiKey = async (clientId, apiKey) => {
    apiKey = Buffer.from(apiKey);
    await KeyInfoModel.updateOne({ clientId: clientId }, { currApiKey: apiKey }, { upsert: true });
};

/**
 * get api token
 *
 * @async
 * @param {string} clientId - client id
 * @returns {Promise<string>} api token
 */
const _getToken = async (clientId) => {
    await oatcrypto.checkKeyStore(clientId);

    return (await fs.promises.readFile(`${oatcrypto.KEY_STORE}/${clientId}/token`)).toString();
};

/**
 * saves api token
 *
 * @async
 * @param {string} clientId - client id
 * @param {string} token - api token
 */
const _setToken = async (clientId, token) => {
    await oatcrypto.makeKeyStore(clientId);

    fs.promises.writeFile(`${oatcrypto.KEY_STORE}/${clientId}/token`, token);
};

/**
 * get client id by domain
 *
 * @async
 * @param {string} domain - domain of server
 * @returns {Promise<string>} client id
 */
const _getDomainDB = async (domain) => {
    try {
        await fs.promises.access(`${oatcrypto.KEY_STORE}/domain.json`, fs.constants.F_OK);
        return JSON.parse(await fs.promises.readFile(`${oatcrypto.KEY_STORE}/domain.json`))[domain];
    } catch (err) {
        return "";
    }
};

/**
 * saves client id by domain
 *
 * @async
 * @param {string} domain - domain of server
 * @param {string} clientId - client id
 */
const _setDomainDB = async (domain, clientId) => {
    let keyValue = { [domain]: clientId };

    try {
        await fs.promises.access(`${oatcrypto.KEY_STORE}/domain.json`, fs.constants.F_OK);

        keyValue = JSON.parse(fs.promises.readFile(`${oatcrypto.KEY_STORE}/domain.json`));
        keyValue[domain] = clientId;
    } catch {}

    fs.promises.writeFile(`${oatcrypto.KEY_STORE}/domain.json`, JSON.stringify(keyValue));
};

/**
 * hmacs the session data
 *
 * @param {string} clientId - client id
 * @param {Buffer} apiKey - api key
 * @param {Object} fields - session data
 * @returns {Buffer} hmac
 */
const _hmacSessionData = (clientId, apiKey, fields) => {
    const clientIdBytes = Buffer.from(clientId, "hex");
    const fieldBytes = Buffer.from(JSON.stringify(fields));

    const hmac = crypto
        .createHmac("sha3-256", oatcrypto.OAT_PASS)
        .update(clientIdBytes)
        .update(fieldBytes)
        .update(apiKey)
        .digest();

    return hmac;
};

/**
 * parse request token into individual parts
 *
 * @param {string} token - response token
 * @returns {Object} json data of token
 *     @param {Object} key - signed api key
 *      @param {Object} data - footer of token
 *         @param {Buffer} data.hmac - calculated hmac
 *         @param {string} data.clientId - client id
 *         @param {Object} data.fields - session data of token
 */
const _parseRequestToken = (token) => {
    let [key, session] = token.split("|");
    key = Buffer.from(key, "base64");
    session = Buffer.from(session, "base64");

    const hmac = session.slice(0, 32);
    const clientId = session.slice(32, 52).toString("hex").toUpperCase();
    const fields = JSON.parse(session.slice(52));

    return {
        key,
        data: { hmac, clientId, fields },
    };
};

/**
 * parse response token into individual parts
 *
 * @param {string} token - response token
 * @returns {Object} json data of token
 *     @param {Object} key - header of token
 *         @param {Buffer} key.serverBoxPubKey - public key from server (null if not initial token)
 *         @param {Buffer} key.encApiKey - encrypted api key from server
 *      @param {Object} data - footer of token
 *         @param {Buffer} data.hmac - calculated hmac
 *         @param {string} data.clientId - client id
 *         @param {Object} data.fields - session data of token
 */
const _parseResponseToken = (token) => {
    let [key, session] = token.split("|");
    key = Buffer.from(key, "base64");
    session = Buffer.from(session, "base64");

    let serverBoxPubKey = null;
    let encApiKey = key;

    if (key.length === 76) {
        serverBoxPubKey = key.slice(0, 32);
        encApiKey = key.slice(32);
    }

    const hmac = session.slice(0, 32);
    const clientId = session.slice(32, 52).toString("hex").toUpperCase();
    const fields = JSON.parse(session.slice(52));

    return {
        key: { serverBoxPubKey, encApiKey },
        data: { hmac, clientId, fields },
    };
};

/**
 * returns session data as json
 *
 * @param {string} token - api token
 * @returns {Object} session data
 */
const getSessionData = (token) => {
    const footer = Buffer.from(token.split("|")[1], "base64");
    return JSON.parse(footer.slice(52));
};

/**
 * check if token is authenticated
 *
 * @async
 * @param {string} serverDomain - server domain
 * @param {string} token - request token
 * @returns {Promise<boolean>} if authenticated
 */
const authToken = async (serverDomain, token) => {
    const { key, data } = _parseRequestToken(token);
    const { hmac, clientId, fields } = data;
    let header;

    try {
        header = await oatcrypto.verify(data.clientId, key);
    } catch {
        return false;
    }

    const apiKey = header.apiKey;
    const domain = header.domain;

    if (domain !== serverDomain) return false;
    if (Buffer.compare(hmac, _hmacSessionData(clientId, apiKey, fields))) return false;
    if (Buffer.compare(apiKey, await _getApiKey(clientId))) return false;

    return true;
};

/**
 * generates new token
 *
 * @async
 * @param {string} domain - server domain
 * @param {function} initConn - initiate connection with server
 *     @param {string} request token
 */
const rollTokenClient = async (domain, initConn) => {
    const clientId = await _getDomainDB(domain);
    const token = await _getToken(clientId);
    const { key } = _parseResponseToken(token);

    const apiKey = await oatcrypto.decrypt(clientId, key.encApiKey);
    const sigApiKey = await oatcrypto.sign(clientId, { apiKey, domain });

    const newToken = await initConn(`${sigApiKey.toString("base64")}|${token.split("|")[1]}`);

    await _setToken(clientId, newToken);
};

/**
 * generates new token
 *
 * @param {string} token - request token
 * @param {Object} newFields - session data to set
 * @returns {Promise<string>} response token
 */
const rollTokenServer = async (token, newFields) => {
    const { data } = _parseRequestToken(token);
    const { clientId } = data;

    const rng = _genRNG();
    const currApiKey = await _getApiKey(clientId);
    const nextApiKey = crypto.createHmac("sha3-256", currApiKey).update(rng).digest();
    _setApiKey(clientId, nextApiKey);

    const tokenHeader = (await oatcrypto.encrypt(clientId, nextApiKey)).toString("base64");

    const sessionHmac = _hmacSessionData(clientId, nextApiKey, newFields);

    const tokenFooter = Buffer.concat([
        sessionHmac, // 32 bytes
        Buffer.from(clientId, "hex"), // 20 bytes
        Buffer.from(JSON.stringify(newFields)),
    ]).toString("base64");

    return `${tokenHeader}|${tokenFooter}`;
};

/**
 * send public keys and store response token
 *
 * @param {function} initConn - function that returns response token from server
 *     @param {Promise<string>} initial request token
 */
const initTokenClient = async (domain, initConn) => {
    await oatcrypto.initClientKeys(async (ourBoxPubKey, ourSignPubKey) => {
        const token = (await initConn(Buffer.concat([ourBoxPubKey, ourSignPubKey]))).toString(
            "base64"
        );

        const { key, data } = _parseResponseToken(token);
        const { clientId } = data;

        await _setToken(clientId, token);
        await _setDomainDB(domain, clientId);

        return key.serverBoxPubKey;
    });
};

/**
 * initialise token for client and exchange keys
 *
 * @param {string} initialisationToken - initial request token from client
 * @param {Object} newFields - json data to put in
 * @returns {Promise<string>} response token
 */
const initTokenServer = async (initialisationToken, newFields) => {
    // Passing initialisation token
    initialisationToken = Buffer.from(initialisationToken, "base64");
    const clientBoxPubKey = initialisationToken.slice(0, 32);
    const clientSignPubKey = initialisationToken.slice(32);

    // Generate shared key
    const { clientId, ourBoxPubKey } = await oatcrypto.initServerKeys(
        clientBoxPubKey,
        clientSignPubKey
    );

    // Generate api key
    const rng = _genRNG();
    const nextApiKey = crypto.createHmac("sha3-256", oatcrypto.OAT_PASS).update(rng).digest();
    _setApiKey(clientId, nextApiKey);

    // Generate token
    const encNextApiKey = await oatcrypto.encrypt(clientId, nextApiKey);
    const sessionHmac = _hmacSessionData(clientId, nextApiKey, newFields);

    const tokenHeader = Buffer.concat([
        ourBoxPubKey, // 32 bytes
        encNextApiKey, // 32 bytes
    ]).toString("base64");

    const tokenFooter = Buffer.concat([
        sessionHmac, // 32 bytes
        Buffer.from(clientId, "hex"), // 20 bytes
        Buffer.from(JSON.stringify(newFields)),
    ]).toString("base64");

    return `${tokenHeader}|${tokenFooter}`;
};

module.exports = {
    client: {
        initToken: initTokenClient,
        rollToken: rollTokenClient,
        getSessionData: getSessionData,
    },
    server: {
        initToken: initTokenServer,
        authToken: authToken,
        rollToken: rollTokenServer,
        getSessionData: getSessionData,
    },
};
