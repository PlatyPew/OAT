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

module.exports = {
    sign: sign,
};
