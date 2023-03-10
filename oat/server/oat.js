const crypto = require("crypto");
const fs = require("fs");

const oatcrypto = require("./oatcrypto");

/**
 * generates random 256-bits
 *
 * @returns {bytes} 32 random bytes
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

const initToken = (initialisationToken, newFields) => {
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
    server: {
        initToken: initToken,
    },
};
