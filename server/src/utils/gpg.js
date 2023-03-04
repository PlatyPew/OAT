const { spawnSync } = require("child_process");
const commandExistsSync = require("command-exists").sync;

/**
 * Checks if gpg is installed in path
 *
 * @returns {boolean} Boolean result if gpg is installed
 */
const _gpgExists = () => {
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
    if (!_gpgExists()) throw new Error("GPG command does not exist");

    const gpg = spawnSync("gpg", ["--default-key", keyId, "--output", "-", "--sign"], {
        input: data,
    });

    if (gpg.status !== 0) throw new Error(gpg.stderr);

    return gpg.stdout;
};

/**
 * Verify and returns data
 *
 * @param {string} keyId - Key To Use
 * @param {bytes} data - Data To Verify
 * @returns {bytes} Signed Content
 */
const verify = (keyId, data) => {
    if (!_gpgExists()) throw new Error("GPG command does not exist");

    const gpg = spawnSync("gpg", ["--decrypt"], {
        input: data,
    });

    if (gpg.status !== 0) throw new Error(gpg.stderr);

    if (!gpg.stderr.includes(` ${keyId}\n`) && !gpg.stderr.includes(` ${keyId}\r`))
        throw new Error("Invalid Key ID");

    return gpg.stdout;
};

/**
 * Encrypt data and returns output as bytes
 *
 * @param {string} keyId - Key To Use
 * @param {bytes} data - Data To Encrypt
 * @returns {bytes} Encrypted Data
 */
const encrypt = (keyId, data) => {
    if (!_gpgExists()) throw new Error("GPG command does not exist");

    const gpg = spawnSync(
        "gpg",
        ["--recipient", keyId, "--trust-model", "always", "--output", "-", "--encrypt"],
        {
            input: data,
        }
    );

    if (gpg.stderr.length !== 0) throw new Error(gpg.stderr.toString());

    return gpg.stdout;
};

/**
 * Decrypt data and returns output as bytes
 *
 * @param {bytes} data - Data To Decrypt
 * @returns {bytes} Decrypted Data
 */
const decrypt = (data) => {
    if (!_gpgExists()) throw new Error("GPG command does not exist");

    const gpg = spawnSync("gpg", ["--decrypt"], {
        input: data,
    });

    if (gpg.status !== 0) throw new Error(gpg.stderr.toString());

    return gpg.stdout;
};

/**
 * Imports key and returns key ID
 *
 * @param {bytes} data - Public Key In Bytes
 * @returns {string} Key ID
 */
const importKey = (data) => {
    if (!_gpgExists()) throw new Error("GPG command does not exist");

    const gpg = spawnSync("gpg", ["--import-options", "import-show", "--import"], {
        input: data,
    });

    if (gpg.status !== 0) throw new Error(gpg.stderr.toString());

    return gpg.stdout.toString().match(/.+ \[expires: .+\]\s+(.+)/)[1];
};

/**
 * Returns public key as bytes
 *
 * @param {string} keyId - Key To Export
 * @returns {bytes} Exported Key
 */
const exportKey = (keyId) => {
    if (!_gpgExists()) throw new Error("GPG command does not exist");

    const gpg = spawnSync("gpg", ["--export", keyId]);

    if (gpg.stderr.length !== 0) throw new Error(gpg.stderr.toString());

    return gpg.stdout;
};

/**
 * Generates key pair
 *
 * @param {string} keyEmail - Key Email
 * @param {string} password - Password To Encrypt Key
 * @returns {boolean} Boolean of successful generation
 */
const genKey = (keyEmail, password) => {
    if (!_gpgExists()) throw new Error("GPG command does not exist");

    const gpg = spawnSync("gpg", [
        "--batch",
        "--passphrase",
        password,
        "--quick-gen-key",
        `OAK <${keyEmail}>`,
        "default",
        "default",
    ]);

    if (gpg.status !== 0) throw new Error(gpg.stderr.toString());

    return gpg.stderr.toString().match(/\/([A-F0-9]{40})\./)[0];
};

module.exports = {
    sign: sign,
    verify: verify,
    encrypt: encrypt,
    decrypt: decrypt,
    importKey: importKey,
    exportKey: exportKey,
    genKey: genKey,
};
