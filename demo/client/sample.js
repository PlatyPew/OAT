const oat = require("@platypew/oatoken").client;
const fs = require("fs");
const readline = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout,
});

const axios = (() => {
    if (process.env.PROXY !== "1") return require("axios");

    const HttpsProxyAgent = require("https-proxy-agent");
    const httpsAgent = new HttpsProxyAgent({ host: "127.0.0.1", port: 8080 });
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

    return require("axios").create({ httpsAgent });
})();

/* const API_URL = "https://www.charming-brahmagupta.cloud"; */
const API_URL = "https://localhost:3000";

const keyExchange = async () => {
    const domain = new URL(API_URL).hostname;
    try {
        await fs.promises.access(
            `${process.env.HOME}/.oatkeys/${domain}`,
            fs.constants.F_OK | fs.constants.R_OK
        );
        return;
    } catch {}

    try {
        const response = await axios.post(
            `${API_URL}/api/auth/login`,
            {
                email: "daryl@oat.com",
                password: "abc123",
            },
            {
                maxRedirects: 0,
                validateStatus: (status) => {
                    return status >= 200 && status <= 302;
                },
            }
        );
        const oatPath = response.headers.oatinit;

        await oat.initToken(domain, async (requestToken) => {
            const response = await axios.get(`${API_URL}${oatPath}`, {
                headers: { OAT: requestToken },
            });

            return response.headers.oat;
        });
    } catch (err) {
        console.error(err);
    }
};

const killSession = async () => {
    const domain = new URL(API_URL).hostname;
    try {
        await fs.promises.access(
            `${process.env.HOME}/.oatkeys/${domain}`,
            fs.constants.F_OK | fs.constants.R_OK
        );
    } catch {
        return;
    }

    try {
        let deinitpath;
        await oat.rollToken(domain, async (requestToken) => {
            const response = await axios.post(`${API_URL}/api/auth/logout`, null, {
                headers: { OAT: requestToken },
                maxRedirects: 0,
                validateStatus: (status) => {
                    return status >= 200 && status <= 302;
                },
            });
            deinitpath = response.headers.oatdeinit;
            return response.headers.oat;
        });

        await oat.deinitToken(domain, async (challenge) => {
            await oat.rollToken(domain, async (requestToken) => {

            });
        });
    } catch (err) {
        console.error(err);
    }
};

const _getRequest = async (apiPath) => {
    const domain = new URL(API_URL).hostname;
    try {
        let data;
        await oat.rollToken(domain, async (requestToken) => {
            const response = await axios.get(`${API_URL}${apiPath}`, {
                headers: { OAT: requestToken },
            });

            data = response.data;
            return response.headers.oat;
        });
        return data;
    } catch (err) {
        console.error(err);
    }
};

const _postRequest = async (apiPath, fields) => {
    const domain = new URL(API_URL).hostname;
    try {
        let data;
        await oat.rollToken(domain, async (requestToken) => {
            const response = await axios.post(`${API_URL}${apiPath}`, fields, {
                headers: { OAT: requestToken },
            });

            data = response.data;
            return response.headers.oat;
        });
        return data;
    } catch (err) {
        console.error(err);
    }
};

const getStoreInventory = async () => {
    const data = await _getRequest("/api/market/store/get");
    return data.response;
};

const getCartInventory = async () => {
    const data = await _getRequest("/api/market/cart/get");
    return data.response;
};

const setCartInventory = async (fields) => {
    const data = await _postRequest("/api/market/cart/set", fields);
    return data.response;
};

const buyItems = async () => {
    const data = await _postRequest("/api/market/store/buy", null);
    return data.response;
};

const restockStoreInventory = async () => {
    const data = await _postRequest("/api/market/store/restock", null);
    return data.response;
};

const prompt = (question) => {
    return new Promise((resolve, reject) => {
        readline.question(question, (answer) => {
            resolve(answer);
        });
    });
};

(async () => {
    await require("libsodium-wrappers").ready;

    await keyExchange();

    await killSession();

    while (true) {
        let option = await prompt(
            `Welcome to the OAT store! What would you like to do?
1. List items in the store
2. List items in your cart
3. Add items to your cart
4. Buy items in your cart
5. Restock store items
0. Exit

> `
        );

        option = parseInt(option);
        if (isNaN(option) || option < 1 || option > 5) {
            readline.close();
            break;
        }

        const funcs = [
            getStoreInventory,
            getCartInventory,
            setCartInventory,
            buyItems,
            restockStoreInventory,
        ];

        let items = {};
        if (option === 3) items = JSON.parse(await prompt("Enter JSON string here:\n> "));

        console.log(await funcs[option - 1](items));
    }
})();
