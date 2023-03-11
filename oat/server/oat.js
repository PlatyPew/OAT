const crypto = require("crypto");
const fs = require("fs");

const oatcrypto = require("./oatcrypto");

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
 * @param {string} clientId - client id
 * @returns {Buffer} api key
 */
const _getApiKey = (clientId) => {
    oatcrypto.checkKeyStore(clientId);

    return fs.readFileSync(`${oatcrypto.KEY_STORE}/${clientId}/api.key`);
};

/**
 * saves the api key
 *
 * @param {string} clientId - client id
 * @param {Buffer} apiKey - api key
 */
const _setApiKey = (clientId, apiKey) => {
    oatcrypto.makeKeyStore(clientId);

    fs.writeFileSync(`${oatcrypto.KEY_STORE}/${clientId}/api.key`, apiKey);
};

/**
 * get api token
 *
 * @param {string} clientId - client id
 * @returns {string} api token
 */
const _getToken = (clientId) => {
    oatcrypto.checkKeyStore(clientId);

    return fs.readFileSync(`${oatcrypto.KEY_STORE}/${clientId}/token`).toString();
};

/**
 * saves api token
 *
 * @param {string} clientId - client id
 * @param {string} token - api token
 */
const _setToken = (clientId, token) => {
    oatcrypto.makeKeyStore(clientId);

    fs.writeFileSync(`${oatcrypto.KEY_STORE}/${clientId}/token`, token);
};

/**
 * get client id by domain
 *
 * @param {string} domain - domain of server
 * @returns {string} client id
 */
const _getDomainDB = (domain) => {
    if (!fs.existsSync(`${oatcrypto.KEY_STORE}/domain.json`)) return {};
    return JSON.parse(fs.readFileSync(`${oatcrypto.KEY_STORE}/domain.json`))[domain];
};

/**
 * saves client id by domain
 *
 * @param {string} domain - domain of server
 * @param {string} clientId - client id
 */
const _setDomainDB = (domain, clientId) => {
    let keyValue = { [domain]: clientId };

    if (fs.existsSync(`${oatcrypto.KEY_STORE}/domain.json`)) {
        keyValue = JSON.parse(fs.readFileSync(`${oatcrypto.KEY_STORE}/domain.json`));
        keyValue[domain] = clientId;
    }

    fs.writeFileSync(`${oatcrypto.KEY_STORE}/domain.json`, JSON.stringify(keyValue));
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
 * check if token is authenticated
 *
 * @param {string} serverDomain - server domain
 * @param {string} token - request token
 * @returns {boolean} if authenticated
 */
const authToken = (serverDomain, token) => {
    const { key, data } = _parseRequestToken(token);
    const { hmac, clientId, fields } = data;
    let header;

    try {
        header = oatcrypto.verify(data.clientId, key);
    } catch {
        return false;
    }

    const apiKey = header.apiKey;
    const domain = header.domain;

    if (domain !== serverDomain) return false;
    if (Buffer.compare(hmac, _hmacSessionData(clientId, apiKey, fields))) return false;
    if (Buffer.compare(apiKey, _getApiKey(clientId))) return false;

    return true;
};

/**
 * generates new token
 *
 * @param {string} domain - server domain
 * @returns {string} new request token
 */
const rollTokenClient = (domain) => {
    const clientId = _getDomainDB(domain);
    const token = _getToken(clientId);
    const { key } = _parseResponseToken(token);

    const apiKey = oatcrypto.decrypt(clientId, key.encApiKey);
    const sigApiKey = oatcrypto.sign(clientId, { apiKey, domain });

    const data = token.split("|")[1];

    return `${sigApiKey.toString("base64")}|${data}`;
};

const rollTokenServer = (token, newFields) => {
    const { data } = _parseRequestToken(token);
    const { clientId } = data;

    const rng = _genRNG();
    const currApiKey = _getApiKey(clientId);
    const nextApiKey = crypto.createHmac("sha3-256", currApiKey).update(rng).digest();
    _setApiKey(nextApiKey);

    const tokenHeader = oatcrypto.encrypt(clientId, nextApiKey).toString("base64");

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
 */
const initTokenClient = (domain, initConn) => {
    oatcrypto.initClientKeys((ourBoxPubKey, ourSignPubKey) => {
        const token = initConn(Buffer.concat([ourBoxPubKey, ourSignPubKey]).toString("base64"));
        const { key, data } = _parseResponseToken(token);
        const { clientId } = data;

        _setToken(clientId, token);
        _setDomainDB(domain, clientId);

        return key.serverBoxPubKey;
    });
};

/**
 * initialise token for client and exchange keys
 *
 * @param {string} initialisationToken - initial request token from client
 * @param {Object} newFields - json data to put in
 * @returns {string} response token
 */
const initTokenServer = (initialisationToken, newFields) => {
    // Passing initialisation token
    initialisationToken = Buffer.from(initialisationToken, "base64");
    const clientBoxPubKey = initialisationToken.slice(0, 32);
    const clientSignPubKey = initialisationToken.slice(32);

    // Generate shared key
    const { clientId, ourBoxPubKey } = oatcrypto.initServerKeys(clientBoxPubKey, clientSignPubKey);

    // Generate api key
    const rng = _genRNG();
    const nextApiKey = crypto.createHmac("sha3-256", oatcrypto.OAT_PASS).update(rng).digest();
    _setApiKey(clientId, nextApiKey);

    // Generate token
    const encNextApiKey = oatcrypto.encrypt(clientId, nextApiKey);
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
    },
    server: {
        initToken: initTokenServer,
        authToken: authToken,
        rollToken: rollTokenServer,
    },
};
