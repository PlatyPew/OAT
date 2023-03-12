//browserify background.js -o backgroundNode.js

const oat = require("./oat").client;
const oatcrypto = require("./oatcrypto");

function insertHeader(headers, name, value) {
    headers.push({name, value});
}

function _readToken(headers) {
    for (var i = 0; i < headers.length; i++) {
        if (headers[i].name == "OAT") {
            return headers[i].value;
        }
      }
}

function _updateToken(token) {}

function _genToken() {}

count = 0;

(async () => {
    await require("libsodium-wrappers").ready;

    chrome.webRequest.onBeforeSendHeaders.addListener(
        function(details) {
            // check if domain exist in localStorage
            console.log(details.url);
    
            // insertHeader(details.requestHeaders,"OAT", "12345");
            return {requestHeaders: details.requestHeaders};
        },
        // filters
        {urls: ['https://*/*', 'http://*/*']},
        // extraInfoSpec
        ['blocking', 'requestHeaders', 'extraHeaders']
    );
    
    chrome.webRequest.onHeadersReceived.addListener(
        function(details) {
            // check if domain exist in localStorage
            console.log(details.url);
    
            token = _readToken(details.responseHeaders);
    
            if (token == undefined) return;
    
            
    
            return {responseHeaders: details.responseHeaders};
        },
        // filters
        {urls: ['https://*/*', 'http://*/*']},
        // extraInfoSpec
        ['blocking', 'responseHeaders', 'extraHeaders']
    );
})();



console.log("end2")