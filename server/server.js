// Import dependencies
const express = require('express');
const mongoose = require("mongoose");

// OAK Module
// const oak = require('./index');

// Setup the express server
const app = express();
const PORT = 8080;

// Import middle ware into epress
app.use(express.json({limit:"8mb"}));

// User Credential Authentication + Generate IV
const auth = require("./src/routes/init");
app.use("/api/auth", auth);

const request = require("./src/routes/request");
app.use("/api/request", request);

// token = oak.generateNewToken("3615f80c9d293ed7402687f94b22d58e529b8cc7916f8fac7fddf7fbd5af4cf777d3d795a7a00a16bf7e7f3fb9561ee9baae480da9fe7a18769e71886b03f315");

// console.log(token) // "Some User token"

const MONGO = "mongodb://localhost:8000/oak"

// Start Server
console.log(`Waiting to connect to ${MONGO}`);
mongoose.set("strictQuery", false);
mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true }, () => {
    app.listen(PORT, () => console.log(`App listening on port ${PORT}`));
});