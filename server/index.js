const crypto = require("crypto");

const generateIV = () => {
    return crypto.randomBytes(64);
}

const generateNewToken = (previousToken) => {
    // Convert previous token SHA 512 hex string to byte array
    const previousTokenByte = Buffer.from(previousToken, "hex");
    
    // Generate new IV byte array for next rolling token
    const rng = generateIV();

    console.log(previousTokenByte);
    console.log(rng);
    console.log(Buffer.from(previousTokenByte).toString('base64'));
    console.log(Buffer.from(rng).toString('base64'));

    // Concatenate old token byte array and new IV byte array
    const arr = [previousTokenByte, rng];
    const buf = Buffer.concat(arr);

    // Generate SHA512 hash from concatenated byte array
    const newToken = crypto.createHash('sha512').update(buf).digest("hex");
    
    return { rng, newToken};
 };

module.exports = { generateIV, generateNewToken }