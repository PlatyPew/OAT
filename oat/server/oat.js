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

const _getApiKey = (clientId) => {
    oatcrypto.checkKeyStore(clientId);

    return fs.readFileSync(`${oatcrypto.KEY_STORE}/${clientId}/api.key`);
};

const _setApiKey = (clientId, apiKey) => {
    oatcrypto.makeKeyStore(clientId);

    fs.writeFileSync(`${oatcrypto.KEY_STORE}/${clientId}/api.key`, apiKey);
};

const _getToken = (clientId) => {
    oatcrypto.checkKeyStore();

    return fs.readFileSync(`${oatcrypto.KEY_STORE}/${clientId}/token`);
};

const _setToken = (clientId, token) => {
    oatcrypto.makeKeyStore();

    fs.writeFileSync(`${oatcrypto.KEY_STORE}/${clientId}/token`, token);
};

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

const _parseRequestToken = (token) => {};

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
    const clientId = session.slice(32, 64).toString("hex");
    const fields = JSON.parse(session.slice(64));

    return {
        key: { serverBoxPubKey, encApiKey },
        data: { hmac, clientId, fields },
    };
};

/**
 * send public keys and store response token
 *
 * @param {function} initConn - function that returns response token from server
 */
const initTokenClient = (initConn) => {
    oatcrypto.initClientKeys((ourBoxPubKey, ourSignPubKey) => {
        const token = initConn(Buffer.concat([ourBoxPubKey, ourSignPubKey]).toString("base64"));
        const { key, data } = _parseResponseToken(token);
        _setToken(data.clientId, token);

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
    const responseToken0 = Buffer.concat([
        ourBoxPubKey, // 32 bytes
        encNextApiKey, // 32 bytes
        Buffer.from("|"),
        sessionHmac, // 32 bytes
        Buffer.from(clientId, "hex"), // 20 bytes
        Buffer.from(JSON.stringify(newFields)),
    ]);

    return responseToken0;
};

module.exports = {
    client: {
        initToken: initTokenClient,
    },
    server: {
        initToken: initTokenServer,
    },
};
