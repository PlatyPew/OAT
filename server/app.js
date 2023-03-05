// Import express
const express = require("express");
const app = express();

const https = require("https");
const fs = require("fs");

// Imports for express
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");

// Declare port
const PORT = 3000;

// URI for Mongodb
const MONGO = "mongodb://database/oak";

// Initialise database
(async () => {
    const { AccountInfoModel } = require("./src/models/AccountModel");
    const { InventoryInfoModel } = require("./src/models/MarketModel");

    if ((await AccountInfoModel.find()).length === 0) {
        AccountInfoModel.insertMany([
            {
                email: "admin@oak.com",
                password:
                    "d9f7cd77d0695cff5e23862024f3cc07e24606dd168ba7593f665a89ced9e972d20c78680c6cb65a4264e496f3e143df3ec9a7efa4f847d7acfee0f39b6e6b2b",
                admin: true,
            },
            {
                email: "daryl@oak.com",
                password:
                    "a95a503d26a8d0282f213b7b692057a10f74ac11b9e686755498765900acbf54a88affd2ad28538752084814332e965a88b1d1c8e070f4423b9f150cf6174448",
                admin: false,
            },
        ]);
    }

    if ((await InventoryInfoModel.find()).length === 0) {
        InventoryInfoModel.insertMany([
            {
                banana: 25,
                grape: 23,
                apple: 17,
                watermelon: 4,
                orange: 41,
                lemon: 29,
            },
        ]);
    }
})();

if (!process.env.OAK_PASS) throw Error("OAK_PASS is not set");

// HTTPS settings
const SSL_OPTIONS = {
    key: fs.readFileSync("key.pem"),
    cert: fs.readFileSync("cert.pem"),
};

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false, limit: "8mb" }));
app.use(bodyParser.json({ limit: "8mb" }));

// User Credential Authentication + Generate IV
const auth = require("./src/routes/init");
app.use("/api/init", auth);

const market = require("./src/routes/market");
app.use("/api/market", market);

// Start Server
console.log(`Waiting to connect to ${MONGO}`);
mongoose.set("strictQuery", false);
mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true }, () => {
    https
        .createServer(SSL_OPTIONS, app)
        .listen(PORT, () => console.log(`App listening on port ${PORT}`));
});
