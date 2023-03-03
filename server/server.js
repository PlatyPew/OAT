// Import dependencies
const express = require('express');
const mongoose = require("mongoose");

// Setup the express server
const app = express();
const PORT = 8080;

// Import middle ware into epress
app.use(express.json({limit:"8mb"}));

// User Credential Authentication + Generate IV
const auth = require("./src/routes/init");
app.use("/api/init", auth);

const request = require("./src/routes/request");
app.use("/api/request", request);

const MONGO = "mongodb://localhost:8000/oak"

// Start Server
console.log(`Waiting to connect to ${MONGO}`);
mongoose.set("strictQuery", false);
mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true }, () => {
    app.listen(PORT, () => console.log(`App listening on port ${PORT}`));
});