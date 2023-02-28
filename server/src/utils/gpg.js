const { spawnSync } = require("child_process");
const commandExistsSync = require("command-exists").sync;

/**
 * Checks if gpg is installed in path
 *
 * @returns {boolean} Boolean result if gpg is installed
 */
const _gpg_exists = () => {
    return commandExistsSync("gpg");
};

/**
 * Signs data and returns output as bytes
 *
 * @param {string} keyId - ID of key
 * @param {bytes} data - Data to sign
 * @returns {bytes} Signed Data
 */
const sign = (keyId, data) => {
    if (!_gpg_exists()) throw new Error("GPG command does not exist");

    const gpg = spawnSync("gpg", ["--local-user", keyId, "--output", "-", "--sign"], {
        input: data,
    });

    if (gpg.stderr.length !== 0) throw new Error(gpg.stderr);

    return gpg.stdout;
};

/**
 * Verify data and returns output boolean
 *
 * @param {string} keyId - Key To Use
 * @param {bytes} data - Data To Verify
 * @returns {bytes} Boolean Of Successful Verification
 */
const verify = (keyId, data) => {
    if (!_gpg_exists()) throw new Error("GPG command does not exist");

    const gpg = spawnSync("gpg", ["--verify"], {
        input: data,
    });

    return gpg.stderr.includes(`<${keyId}>`) && gpg.status === 0;
};

/**
 * Encrypt data and returns output as bytes
 *
 * @param {string} keyId - Key To Use
 * @param {bytes} data - Data To Encrypt
 * @returns {bytes} Encrypted Data
 */
const encrypt = (keyId, data) => {
    if (!_gpg_exists()) throw new Error("GPG command does not exist");

    const gpg = spawnSync("gpg", ["--recipient", keyId, "--output", "-", "--encrypt"], {
        input: data,
    });

    if (gpg.stderr.length !== 0) throw new Erorr(gpg.stderr.toString());

    return gpg.stdout;
};

/**
 * Decrypt data and returns output as bytes
 *
 * @param {string} keyId - Key To Use
 * @param {bytes} data - Data To Decrypt
 * @returns {bytes} Decrypted Data
 */
const decrypt = (keyId, data) => {
    if (!_gpg_exists()) throw new Error("GPG command does not exist");

    const gpg = spawnSync("gpg", ["--decrypt"], {
        input: data,
    });

    if (!gpg.stderr.includes(`<${keyId}>`)) throw new Error(gpg.stderr.toString());

    return gpg.stdout;
};

module.exports = {
    sign: sign,
    verify: verify,
    encrypt: encrypt,
    decrypt: decrypt,
};
