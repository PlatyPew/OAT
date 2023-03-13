const oat = require("@platypew/oatoken").client;
const axios = require("axios");
const fs = require("fs");

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
        const response = await axios.post(`${API_URL}/api/auth/login`, {
            email: "daryl@oat.com",
            password:
                "3274f8455be84b8c7d79f9bd93e6c8520d13f6bd2855f3bb9c006ca9f3cce25d4b924d0370f8af4e27a350fd2baeef58bc37e0f4e4a403fe64c98017fa012757",
        });
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

const getRequest = async (apiPath) => {
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

const postRequest = async (apiPath, fields) => {
    const domain = new URL(API_URL).hostname;
    try {
        let data;
        await oat.rollToken(domain, async (requestToken) => {
            console.log(requestToken);
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
    const data = await getRequest("/api/market/store/get");
    return data.response;
};

const getCartInventory = async () => {
    const data = await getRequest("/api/market/cart/get");
    return data.response;
};

const setCartInventory = async (fields) => {
    const data = await postRequest("/api/market/cart/set", fields);
    return data.response;
};

(async () => {
    await require("libsodium-wrappers").ready;
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

    await keyExchange();
    /* console.log(await getStoreInventory()); */
    /* console.log(await getCartInventory()); */
    /* console.log(await setCartInventory({})); */
    /* await postRequest(); */
})();
