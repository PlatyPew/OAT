<p align="center">
    <br />
    <img src="./logo.png" alt="oat" style="width: 20%; height: auto;"/>
    <h1 align="center">An Unstealable Access Token That Handles Authentication For APIs & Sessions</h1>
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

TODO

## Contributors

This project would not exist without these folks!

-   [@PlatyPew](https://github.com/PlatyPew)
-   [@S0meDev99](https://github.com/S0meDev99)
-   [@PototoPatata](https://github.com/PototoPatata)
-   [@Raphi3z1](https://github.com/Raphi3z1)
-   [@JoshuaNg1910](https://github.com/JoshuaNg1910)
