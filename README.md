<p align="center">
    <br />
    <img src="./logo.png" alt="oat" style="width: 20%; height: auto;"/>
    <h1 align="center">An Unstealable Access Token That Authenticates APIs & Sessions</h1>
</p>

<p align="center">
    <i>1xAccessToken (OAT) is an API key that constantly rolls, cryptographically secure and immune to being stolen!</i><br />
    <i>You cannot steal a token that expires upon usage.</i>
    <br /><br />
    <img src="https://img.shields.io/badge/license-LGPLv3-green" />
    <img src="https://img.shields.io/badge/node-%3E%3D19.8.0-brightgreen" />
    <a href="https://www.npmjs.com/package/@platypew/oatoken"><img src="https://img.shields.io/npm/v/@platypew/oatoken?label=oatoken" /></a>
    <a href="https://www.npmjs.com/package/@platypew/oatoken-express"><img src="https://img.shields.io/npm/v/@platypew/oatoken-express?label=oatoken-express" /></a>
    <br /><br />
</p>
<hr>

Powered by NodeJS and Libsodium to establish a 1xAccessToken

-   [Installation](#installation)
-   [Usage](#usage)
    -   [Client](#client)
    -   [Server](#server)
-   [Documentation](#documentation)
-   [Contributors](#Contributors)

## Installation

This is a [Node.js](https://nodejs.org/en/) module available through the
[npm registry](https://www.npmjs.com/).

Installation is done using the
[`npm install` command](https://docs.npmjs.com/getting-started/installing-npm-packages-locally):

Oatoken for both client and server

```bash
npm install @platypew/oatoken
```

Server integration with ExpressJS with a higher-level wrapper around oatoken

```bash
npm install @platypew/oatoken-express
```

## Usage

Examples of how to use OAT

### Client

Example here.

Initialising Token

_If the server is running an ExpressJS instance, to initialise the token, `/oat/<random value>`. This path is provided in the `OATINIT` header usually after some form of authentication._

```javascript
const oat = require("@platypew/oatoken").client;

// Initialise token
const initialiseTokenWithServer = async (url) => {
    // requestToken is initial request token to send to the server to perform key  exchange
    await oat.initToken(url, async (requestToken) => {
        // Perform request to server
        const responseToken = await getResponseInitTokenFromServer(url);
        return responseToken;
    });
};
```

Rolling Token

```javascript
const oat = require("@platypew/oatoken").client;

// Perform request
const rollTokenWithServer = async (url) => {
    // requestToken is request token to send to the server for authentication
    await oat.rollToken(url, async (requestToken) => {
        // Perform request to server
        const responseToken = await getResponseTokenFromServer(url);
        return responseToken;
    });
};
```

### Server

Example here.

Using ExpressJS (OAT is only supported using HTTPS)

```javascript
const express = require("express");
const app = express();

const oat = require("@platypew/oatoken-express");

app.use(oat.init());

app.get("/api/login");

app.post(
    "/login",
    async (req, res, next) => {
        if (req.body.email !== "oatuser" || req.body.password !== "oatpassword")
            return res.status(403).json({ response: "Wrong Username Or Password" });

        next();
    },
    oat.initpath, // Generates a path in OATINIT header that performs key exchange
    (_, res) => {
        return res.redirect("/");
    }
);

app.get(
    "/logout",
    oat.deinit, // Sets a header OATDEINIT with the domain to deinit keys
    (_, res) => {
        return res.send();
    }
);

app.get(
    "/api/request",
    oat.roll, // Perform rolling token
    async (_, res) => {
        console.log(await oat.getsession(res)); // Gets session data
        await oat.setsesion(res, {}); // Sets session data
        // Do something here
        return res.send();
    }
);

app.listen(3000);
```

## Documentation

### Package `@platypew/oatoken`

`oat.client.initToken(domain, initConn)`

-   `domain` \<string\>
-   `initConn` \<Function\>
    -   `initialisationToken` \<string\>
    -   Returns: Promise\<string\>

This function sends public keys to a server and then stores the response token. The function takes two parameters: the `domain` of the server and a function `initConn` that returns a promise containing the initial request token.

<br />

`oat.client.rollToken(domain, initConn)`

-   `domain` \<string\>
-   `initConn` \<Function\>
    -   `initialisationToken` \<string\>
    -   Returns: Promise\<string\>

This function is used to generate a new token. It takes in two parameters: the server `domain` and a function `initConn` for initiating the connection with the server.

<br />

`oat.client.getSessionData(token)`

-   `token` \<string\>
-   Returns: \<Object\>

This function is used to get the session data from the token. It takes in one parameter: the request token and returns the JSON object stored in the token.

<br />

`oat.client.deinitToken(domain)`

-   `domain` \<string\>
-   Returns: \<boolean\>

This function is used to delete the session keys on the client. It takes in one parameter: the `domain` of the session and returns if the token has been successfully removed.

<br />

`oat.server.initToken(initialisationToken, fields)`

-   `initialisationToken` \<string\>
-   `fields` \<Object\>
-   Returns: \<string\>

This function is used to initialise the session keys on the server and return the response token. It takes in two parameters: the `initialisationToken` from the client and a JSON object `fields` to use in the token.

<br />

`oat.server.authToken(serverDomain, token)`

-   `serverDomain` \<string\>
-   `token` \<string\>
-   Returns: \<boolean\>

This function is used to authenticate the request token from the client. It takes in two parameters: `serverDomain` which is the domain of the server it is running on and `token` which is the request token from the client. It returns true if the token is valid.

<br />

`oat.server.rollToken(token, fields)`

-   `token` \<string\>
-   `fields` \<Object\>
-   Returns: \<string\>

this function is used to roll and provide the response token from the server, It takes two parameters: `token` which is is the request token, and `fields` which is the JSON data to insert into the response token

<br />

`oat.server.getSessionData(token)`

-   `token` \<string\>
-   Returns: \<Object\>

This function is used to get the session data from the token. It takes in one parameter: the request token and returns the JSON object stored in the token.

<br />

`oat.server.setSessionData(token, fields)`

-   `token` \<string\>
-   `fields` \<Object\>
-   Returns: \<string\>

This function is used to insert session data into the response token. It takes two parameters: `token` which is the response token and `fields` which is JSON data to be updated.

<br />

`oat.server.deinitToken(clientId)`

-   `clientId` \<string\>
-   Returns: \<boolean\>

This function is used to delete the session keys on the server. It takes in one parameter: the `clientId` of the session and returns if the token has been successfully removed.

### Package `@platypew/oatoken-express`

`oat.init(initialField)(req, res, next)`

-   `initialField` \<Object\>

This function handles the initialising `/oat` path for key exchange

<br />

`oat.initpath(req, res, next)`

This function should be called after performing a successful authentication. Creates the header `OATINIT` which provides the path for initialising the key exchange process.

<br />

`oat.deinit(req, res, next)`

This function is called to delete the session from the database.

<br />

`oat.roll(req, res, next)`

This function performs authentication and rolls the token for the client.

<br />

`oat.getsession(res)`

-   `res` \<Response\>
-   Returns: \<Object\>

This function takes in `res` gets the session data from the token and returns it in JSON format.

<br />

`oat.setsession(res, fields)`

-   `res` \<Response\>
-   `fields` \<Object\>

This function takes in `res` and updates the field for the current response token.

## Contributors

This project would not exist without these folks!

-   [@PlatyPew](https://github.com/PlatyPew)
-   [@S0meDev99](https://github.com/S0meDev99)
-   [@PototoPatata](https://github.com/PototoPatata)
-   [@Raphi3z1](https://github.com/Raphi3z1)
-   [@JoshuaNg1910](https://github.com/JoshuaNg1910)
