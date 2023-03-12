const oatcrypto = require("./oatcrypto");

/**
 * get api token
 *
 * @async
 * @param {string} clientId - client id
 * @returns {Promise<string>} api token
 */
const _getToken = async (clientId) => {
    return oatcrypto.getLocalStorage(clientId, "token");
};

/**
 * saves api token
 *
 * @async
 * @param {string} clientId - client id
 * @param {string} token - api token
 */
const setToken = async (clientId, token) => {
    oatcrypto.setLocalStorage(clientId, "token", token);
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
 * generates new token
 *
 * @async
 * @param {string} domain - server domain
 * @param {function} initConn - initiate connection with server
 *     @param {string} request token
 */
// const rollTokenClient = async (domain, initConn) => {
//     const token = await _getToken(domain);
//     const { key } = _parseResponseToken(token);

//     const apiKey = await oatcrypto.decrypt(domain, key.encApiKey);
//     const sigApiKey = await oatcrypto.sign(domain, { apiKey, domain });

//     const newToken = await initConn(`${sigApiKey.toString("base64")}|${token.split("|")[1]}`);

//     await setToken(domain, newToken);
// };

/**
 * decrypt next token
 *
 * @async
 * @param {string} domain - server domain
 */
const decryptNextTokenClient = async (domain) => {
    const token = await _getToken(domain);
    const { key } = _parseResponseToken(token);

    const apiKey = await oatcrypto.decrypt(domain, key.encApiKey);
    const sigApiKey = await oatcrypto.sign(domain, { apiKey, domain });

    return `${sigApiKey.toString("base64")}|${token.split("|")[1]}`;
};

/**
 * send public keys and store response token
 *
 * @param {function} initConn - function that returns response token from server
 *     @param {Promise<string>} initial request token
 */
const initTokenClient = async (domain, initConn) => {
    await oatcrypto.initClientKeys(domain, async (ourBoxPubKey, ourSignPubKey) => {
        const token = (await initConn(
            Buffer.concat([ourBoxPubKey, ourSignPubKey]).toString("base64")
        ));
        console.log(token);
        const { key } = _parseResponseToken(token);
        
        console.log(domain);
        await setToken(domain, token);

        return key.serverBoxPubKey;
    });
};

module.exports = {
    client: {
        initToken: initTokenClient,
        // rollToken: rollTokenClient,
        decryptNextToken: decryptNextTokenClient,
        getSessionData: getSessionData,
        setToken: setToken
    }
};
