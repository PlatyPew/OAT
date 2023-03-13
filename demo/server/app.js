// Import express
const express = require("express");
const app = express();

const https = require("https");
const fs = require("fs");
const path = require("path");

// Imports for express
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const oat = require("@platypew/oatoken-express");

// Declare port
const PORT = 3000;

// URI for Mongodb
const MONGO = "mongodb://database/oat";

// Initialise database
(async () => {
    const { AccountInfoModel } = require("./src/models/AccountModel");
    const { InventoryInfoModel } = require("./src/models/MarketModel");

    if ((await AccountInfoModel.find()).length === 0) {
        AccountInfoModel.insertMany([
            {
                email: "alford@oat.com",
                password:
                    "a95a503d26a8d0282f213b7b692057a10f74ac11b9e686755498765900acbf54a88affd2ad28538752084814332e965a88b1d1c8e070f4423b9f150cf6174448",
            },
            {
                email: "daryl@oat.com",
                password:
                    "a95a503d26a8d0282f213b7b692057a10f74ac11b9e686755498765900acbf54a88affd2ad28538752084814332e965a88b1d1c8e070f4423b9f150cf6174448",
            },
            {
                email: "joshua@oat.com",
                password:
                    "a95a503d26a8d0282f213b7b692057a10f74ac11b9e686755498765900acbf54a88affd2ad28538752084814332e965a88b1d1c8e070f4423b9f150cf6174448",
            },
            {
                email: "kunfeng@oat.com",
                password:
                    "a95a503d26a8d0282f213b7b692057a10f74ac11b9e686755498765900acbf54a88affd2ad28538752084814332e965a88b1d1c8e070f4423b9f150cf6174448",
            },
        ]);
    }

    if ((await InventoryInfoModel.find()).length === 0) {
        InventoryInfoModel.insertMany([
            { banana: 100, grape: 100, apple: 100, watermelon: 100, orange: 100, lemon: 100 },
        ]);
    }
})();

// HTTPS settings
const SSL_OPTIONS = {
    key: fs.readFileSync("key.pem"),
    cert: fs.readFileSync("cert.pem"),
    ca: fs.readFileSync("chain.pem"),
};

app.use(cors());

app.use(bodyParser.urlencoded({ extended: true, limit: "8mb" }));
app.use(bodyParser.json({ limit: "8mb" }));

app.use(oat.init({ cart: {} }));

app.use(express.static(path.join(__dirname, "src/public")));

const auth = require("./src/routes/auth");
app.use("/api/auth", auth);

const market = require("./src/routes/market");
app.use("/api/market", market);

app.get("*", (_, res) => {
    res.redirect("/");
});

// Start Server
console.log(`Waiting to connect to ${MONGO}`);
mongoose.set("strictQuery", false);
mongoose.connect(MONGO).then(() => {
    https
        .createServer(SSL_OPTIONS, app)
        .listen(PORT, () => console.log(`App listening on port ${PORT}`));
});
