const { spawnSync } = require("child_process");
const commandExistsSync = require("command-exists").sync;

/**
 * checks if gpg is installed in path
 *
 * @returns {boolean} boolean result if gpg is installed
 */
const _gpgExists = () => {
    return commandExistsSync("gpg");
};

/**
 * signs data and returns output as bytes
 *
 * @param {string} keyId - id of key
 * @param {bytes} data - data to sign
 * @returns {bytes} signed data
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
 * verify and returns data
 *
 * @param {string} keyId - key to use
 * @param {bytes} data - data to verify
 * @returns {bytes} signed content
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
 * encrypt data and returns output as bytes
 *
 * @param {string} keyId - key to use
 * @param {bytes} data - data to encrypt
 * @returns {bytes} encrypted data
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
 * decrypt data and returns output as bytes
 *
 * @param {bytes} data - data to decrypt
 * @returns {bytes} decrypted data
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
 * imports key and returns key ID
 *
 * @param {bytes} data - public key in bytes
 * @returns {string} key id
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
 * returns public key as bytes
 *
 * @param {string} keyId - key to export
 * @returns {bytes} exported key
 */
const exportKey = (keyId) => {
    if (!_gpgExists()) throw new Error("GPG command does not exist");

    const gpg = spawnSync("gpg", ["--export", keyId]);

    if (gpg.stderr.length !== 0) throw new Error(gpg.stderr.toString());

    return gpg.stdout;
};

/**
 * generates key pair
 *
 * @param {string} keyEmail - key email
 * @param {string} password - password to encrypt key
 * @returns {boolean} boolean of successful generation
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
    return gpg.stderr.toString().match(/\/([A-F0-9]{40})\./)[1];
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
