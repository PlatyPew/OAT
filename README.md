# OAT

Written in Node.js (server) and Python3 (client) to establish a one-time use API token.

1. [Server](#server)
    - [Installation](#installation)
    - [Usage](#usage)
2. [Client](#client)
    - [Installation](#installation-1)
    - [Usage](#usage-1)
3. [Contributors](#Contributors)

## Server

Server generates a one-time API token with to authenticate a client to make API calls.  
Server regenerates and sends to client a new API token along with the API response and expires the previous API token.

### Installation

This is a [Node.js](https://nodejs.org/en/) module available through the
[npm registry](https://www.npmjs.com/).

Installation is done using the
[`npm install` command](https://docs.npmjs.com/getting-started/installing-npm-packages-locally):

```console
npm install oat
```

### Usage

Example using [Express](https://expressjs.com/) to utilise OAT-Server

```javascript
// Import dependencies
const oat = require("oat")
const express = require("express")
const app = express();

app.get('/api/init', function (req, res) {
    // Client send Base 64 encoded public key in HTTP Request Header "OAT"
    const publicKeyB64 = req.get("OAT");

    // Initialise OAT token
    const token = oat.initToken(
        publicKeyB64, // Base 64 encoded public key
        {},     // Session data
        (keyId, nextKey) => {}  // Callback to store new key ID and API key
    );

    // Set HTTP Request Header "OAT"
    res.setHeader("OAT", token);

    // Send HTTP Response
    res.status(200).json({ response: "API token successfully initialised" });
})

app.get('/api/request', function (req, res) {
    // Client send Base 64 encoded public key in HTTP Request Header "OAT"
    const token = req.get("OAT");

    // Generate next OAT token
    const nextToken = oat.rollToken(
        (keyId) => {...}, // Anon. Function to retrieve next API token from database/file
        token,  // Current OAT token
        {},     // Session data
        (keyId, nextKey) => {}  // Callback to store new key ID and API key
    );

    // Set HTTP Request Header "OAT"
    res.setHeader("OAT", nextToken);

    // Send HTTP Response
    res.status(200).json({ response: "API token successfully regenerated" });
})

app.listen(3000)
```

Running Node.js server with OAT_PASS environment variable

```console
OAT_PASS="<secret_password_here>" node .
```

#### Working Demo: [Demo Server](https://github.com/PlatyPew/OAT/tree/master/server)

```console
OAT_PASS=<secret_password_here> docker compose up -d
```

## Client

Client make API calls to server which requires one-time API token.  
Client will parse new API token and store locally, to be used for its next API request.

### Installation

[to do]

### Usage

[to do]

## Contributors

This project would not exist without these folks!

-   [@PlatyPew](https://github.com/PlatyPew)
-   [@S0meDev99](https://github.com/S0meDev99)
-   [@PototoPatata](https://github.com/PototoPatata)
-   [@Raphi3z1](https://github.com/Raphi3z1)
