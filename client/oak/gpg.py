#!/usr/bin/env python3
import subprocess


def _gpg_exists() -> bool:
    """
    Checks if gpg is installed in path

    :return: Boolean result if gpg is installed
    """
    from shutil import which
    return which("gpg") is not None


def sign(key_id: str, data: bytes, options: list = []) -> bytes:
    """
    Signs data and returns output as bytes

    :param key_id: Key To Use
    :param data: Data To Sign
    :param options: Additional Options
    :return: Signed Data
    """
    if not _gpg_exists():
        raise Exception("GPG command does not exist")

    process = subprocess.Popen(["gpg", "--local-user", key_id, "--output", "-"] + options +
                               ["--sign"],
                               stdin=subprocess.PIPE,
                               stdout=subprocess.PIPE,
                               stderr=subprocess.PIPE)
    stdout, stderr = process.communicate(input=data)

    if stderr:
        raise Exception(stderr)

    return stdout


def verify(key_id: str, data: bytes, options: list = []) -> bytes:
    """
    Verify and returns data

    :param key_id: Key To Use
    :param data: Data To Verify
    :param options: Additional Options
    :return: Signed Content
    """
    if not _gpg_exists():
        raise Exception("GPG command does not exist")

    process = subprocess.Popen(["gpg"] + options + ["--decrypt"],
                               stdin=subprocess.PIPE,
                               stdout=subprocess.PIPE,
                               stderr=subprocess.PIPE)
    stdout, stderr = process.communicate(input=data)

    if process.wait() != 0:
        raise Exception(stderr)

    if f"<{key_id}>".encode() not in stderr:
        raise Exception("Invalid Key ID")

    return stdout


def encrypt(key_id: str, data: bytes, options: list = []) -> bytes:
    """
    Encrypt data and returns output as bytes

    :param key_id: Key To Use
    :param data: Data To Encrypt
    :param options: Additional Options
    :return: Encrypted Data
    """
    if not _gpg_exists():
        raise Exception("GPG command does not exist")

    process = subprocess.Popen(
        ["gpg", "--recipient", key_id, "--trust-model", "always", "--output", "-"] + options +
        ["--encrypt"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE)
    stdout, stderr = process.communicate(input=data)

    if stderr:
        raise Exception(stderr)

    return stdout


def decrypt(key_id: str, data: bytes, options: list = []) -> bytes:
    """
    Decrypt data and returns output as bytes

    :param key_id: Key To Use
    :param data: Data To Decrypt
    :param options: Additional Options
    :return: Decrypted Data
    """
    if not _gpg_exists():
        raise Exception("GPG does not exist")

    process = subprocess.Popen(["gpg"] + options + ["--decrypt"],
                               stdin=subprocess.PIPE,
                               stdout=subprocess.PIPE,
                               stderr=subprocess.PIPE)
    stdout, stderr = process.communicate(input=data)

    if f"<{key_id}>".encode() not in stderr:
        raise Exception(stderr)

    return stdout


def import_key(data: bytes, options: list = []) -> bool:
    """
    Imports key and returns key ID

    :param data: Public Key In Bytes
    :param options: Additional Options
    :return: Key ID
    """
    if not _gpg_exists():
        raise Exception("GPG command does not exist")

    process = subprocess.Popen(["gpg"] + options + ["--import"],
                               stdin=subprocess.PIPE,
                               stdout=subprocess.PIPE,
                               stderr=subprocess.PIPE)
    _, stderr = process.communicate(input=data)

    if process.wait() != 0:
        raise Exception(stderr)

    from re import findall
    return findall('''gpg: key \w+: public key "(.+)" imported''', stderr.decode())[0]


def export_key(key_id: str, options: list = []) -> bytes:
    """
    Returns public key as bytes

    :param key_id: Key To Export
    :param options: Additional Options
    :return: Exported Key
    """
    if not _gpg_exists():
        raise Exception("GPG command does not exist")

    process = subprocess.Popen(["gpg"] + options + ["--export", key_id],
                               stdin=subprocess.PIPE,
                               stdout=subprocess.PIPE,
                               stderr=subprocess.PIPE)
    stdout, stderr = process.communicate()

    if stderr:
        raise Exception(stderr)

    return stdout


def gen_key(key_id: str, password: str, options: list = []) -> bool:
    """
    Generates key pair

    :param key_id: Key ID
    :param password: Password To Encrypt Key
    :param options: Additional Options
    :return: Boolean of successful generation
    """
    if not _gpg_exists():
        raise Exception("GPG command does not exist")

    process = subprocess.Popen(["gpg"] + options + [
        "--batch", "--passphrase", password, "--quick-gen-key", f"OAK <{key_id}>", "default",
        "default"
    ],
                               stdin=subprocess.PIPE,
                               stdout=subprocess.PIPE,
                               stderr=subprocess.PIPE)

    process.communicate()

    return process.wait() == 0
