//browserify background.js -o bundle.js

const oatclient = require("./oat").client;

/**
 * insert key-value pair into request header/object
 * 
 * @param {Object} headers - requestHeaders
 * @param {string} name - key
 * @param {string} value - value
 */
function insertHeader(headers, name, value) {
    headers.push({name, value});
}

/**
 * read token value and initialisation condition
 * 
 * @param {Object} headers - responseHeaders
 * @returns {Object} token and boolean value to indicate OATINIT (true) or OAT (false)
 */
function _readToken(headers) {
    for (let i = 0; i < headers.length; i++) {
        if (headers[i].name.toLowerCase() === "oat") {
            return { token:headers[i].value, init:false };
        }
        else if (headers[i].name.toLowerCase() === "oatinit") {
            return { token:headers[i].value, init:true };
        }
      }
      return { token:undefined, init:undefined };
}

(async () => {
    await require("libsodium-wrappers").ready;

    // HTTP Request before sending
    chrome.webRequest.onBeforeSendHeaders.addListener((details) => {
        // check if domain exist in localStorage
        let domain = (new URL(details.url)).hostname;

        const token = oatclient.getToken(domain);

        if (token === undefined) return;

        const newToken = oatclient.decryptNextToken(domain);

        if (newToken !== null){
            insertHeader(details.requestHeaders,"OAT", newToken);
        }
        return {requestHeaders: details.requestHeaders};
    },
    // filters
    {urls: ['https://*/*', 'http://*/*']},
    // extraInfoSpec
    ['blocking', 'requestHeaders', 'extraHeaders']);
    
    // HTTP Response recevied
    chrome.webRequest.onHeadersReceived.addListener((details) => {
        // check if domain exist in localStorage
        const domain = (new URL(details.url)).hostname;

        const { token, init } = _readToken(details.responseHeaders);

        if (token === undefined) return;
        
        if (!init) {
            oatclient.setToken(domain, token);
            return {responseHeaders: details.responseHeaders};
        }
        
        const protocol = (new URL(details.url)).protocol;
        const pathname = (new URL(details.url)).pathname;

        const url = `${protocol}//${domain}${token}`;

        oatclient.initToken(domain, async(ourBoxSignPubKey) => {
            let promise = new Promise(function(resolve, reject) {
                let xhr = new XMLHttpRequest();
                xhr.open("GET", url);
                xhr.setRequestHeader("OAT", ourBoxSignPubKey);
                xhr.onload = () => {
                    if(xhr.status === 200) resolve(xhr.getResponseHeader("OAT"));
                    else reject();
                }
                xhr.send();
            });
            return promise;
        });
        
        return {responseHeaders: details.responseHeaders};
    },
    // filters
    {urls: ['https://*/*', 'http://*/*']},
    // extraInfoSpec
    ['blocking', 'responseHeaders', 'extraHeaders']);
})();

console.log("end");