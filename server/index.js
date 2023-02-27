const crypto = require("crypto");

const generateIV = () => {
    return crypto.randomBytes(64);
}

const generateNewToken = (previousToken) => {
    // Convert previous token SHA 512 hex string to byte array
    const previousTokenByte = Buffer.from(previousToken, "hex");

    // Generate new IV byte array for next rolling token
    const rng = generateIV();

    // Concatenate old token byte array and new IV byte array
    const arr = [previousTokenByte, rng];
    const buf = Buffer.concat(arr);

    // Generate SHA512 hash from concatenated byte array
    const hash = crypto.createHash('sha512').update(buf).digest("hex");
    
    return hash;
 };

module.exports = { generateIV, generateNewToken }