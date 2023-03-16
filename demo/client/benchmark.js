const oatclient = require("@platypew/oatoken").client;
const oatserver = require("@platypew/oatoken").server;

const readline = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout,
});

const genKeys = async (domain) => {
    await oatclient.initToken(`www.${domain}.com`, async (initialisationToken) => {
        return await oatserver.initToken(initialisationToken, {});
    });
};

const rollToken = async (domain) => {
    await oatclient.rollToken(`www.${domain}.com`, async (requestToken) => {
        return await oatserver.rollToken(requestToken, {});
    });
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
    await prompt("Press Enter To Start");

    let promises = [];

    /* console.time("Gen Keys"); */
    /* for (let i = 0; i < 10000; i++) { */
    /*     promises.push(genKeys(i)); */
    /* } */
    /* await Promise.all(promises); */
    /* console.timeEnd("Gen Keys"); */

    promises = [];
    console.time("Roll Keys");
    for (let i = 0; i < 10000; i++) {
        promises.push(rollToken(i));
    }
    await Promise.all(promises);
    console.timeEnd("Roll Keys");

    promises = [];
    console.time("Roll Keys Again");
    for (let i = 0; i < 10000; i++) {
        await rollToken(i);
    }
    console.timeEnd("Roll Keys Again");
})();
