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
                    "3274f8455be84b8c7d79f9bd93e6c8520d13f6bd2855f3bb9c006ca9f3cce25d4b924d0370f8af4e27a350fd2baeef58bc37e0f4e4a403fe64c98017fa012757",
            },
            {
                email: "daryl@oat.com",
                password:
                    "3274f8455be84b8c7d79f9bd93e6c8520d13f6bd2855f3bb9c006ca9f3cce25d4b924d0370f8af4e27a350fd2baeef58bc37e0f4e4a403fe64c98017fa012757",
            },
            {
                email: "joshua@oat.com",
                password:
                    "3274f8455be84b8c7d79f9bd93e6c8520d13f6bd2855f3bb9c006ca9f3cce25d4b924d0370f8af4e27a350fd2baeef58bc37e0f4e4a403fe64c98017fa012757",
            },
            {
                email: "kunfeng@oat.com",
                password:
                    "3274f8455be84b8c7d79f9bd93e6c8520d13f6bd2855f3bb9c006ca9f3cce25d4b924d0370f8af4e27a350fd2baeef58bc37e0f4e4a403fe64c98017fa012757",
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
app.use(oat.deinit());

const auth = require("./src/routes/auth");
app.use("/api/auth", auth);

const market = require("./src/routes/market");
app.use("/api/market", market);

const public = require("./src/routes/public");
app.use("/", public);

// Start Server
console.log(`Waiting to connect to ${MONGO}`);
mongoose.set("strictQuery", false);
mongoose.connect(MONGO).then(() => {
    https
        .createServer(SSL_OPTIONS, app)
        .listen(PORT, () => console.log(`App listening on port ${PORT}`));
});
