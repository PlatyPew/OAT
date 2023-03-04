// Import express
const express = require("express");
const app = express();

// Imports for express
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");

// Declare port
const PORT = 3000;

// URI for Mongodb
const MONGO = "mongodb://localhost/oak";

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false, limit: "8mb" }));
app.use(bodyParser.json({ limit: "8mb" }));

// User Credential Authentication + Generate IV
const auth = require("./src/routes/init");
app.use("/api/init", auth);

const request = require("./src/routes/request");
app.use("/api/request", request);

// Start Server
console.log(`Waiting to connect to ${MONGO}`);
mongoose.set("strictQuery", false);
mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true }, () => {
    app.listen(PORT, () => console.log(`App listening on port ${PORT}`));
});
