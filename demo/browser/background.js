//browserify background.js -o bundle.js

const oatclient = require("./oat").client;

function insertHeader(headers, name, value) {
    headers.push({name, value});
}

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