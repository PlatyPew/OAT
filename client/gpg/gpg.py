#!/usr/bin/env python3
import subprocess


def sign(key_id: str, data: bytes, options: list = []) -> bytes:
    """
    Signs data and returns output as bytes

    :param key_id: Key To Use
    :param data: Data To Sign
    :param options: Additional Options
    :return: Signed Data
    """
    process = subprocess.Popen(["gpg", "--local-user", key_id, "--output", "-"] + options +
                               ["--sign"],
                               stdin=subprocess.PIPE,
                               stdout=subprocess.PIPE,
                               stderr=subprocess.PIPE)
    output, error = process.communicate(input=data)

    if error:
        raise Exception(error)

    return output


def verify(key_id: str, data: bytes, options: list = []) -> bool:
    """
    Verify data and returns output boolean

    :param key_id: Key To Use
    :param data: Data To Verify
    :param options: Additional Options
    :return: Boolean Of Successful Verification
    """
    process = subprocess.Popen(["gpg"] + options + ["--verify"],
                               stdin=subprocess.PIPE,
                               stdout=subprocess.PIPE,
                               stderr=subprocess.PIPE)
    _, output = process.communicate(input=data)

    return f"<{key_id}>".encode() in output and process.wait() == 0


def encrypt(key_id: str, data: bytes, options: list = []) -> bytes:
    """
    Encrypt data and returns output as bytes

    :param key_id: Key To Use
    :param data: Data To Encrypt
    :param options: Additional Options
    :return: Encrypted Data
    """
    process = subprocess.Popen(["gpg", "--recipient", key_id, "--output", "-"] + options +
                               ["--encrypt"],
                               stdin=subprocess.PIPE,
                               stdout=subprocess.PIPE,
                               stderr=subprocess.PIPE)
    output, error = process.communicate(input=data)

    if error:
        raise Exception(error)

    return output


def decrypt(key_id: str, data: bytes, options: list = []) -> bytes:
    """
    Decrypt data and returns output as bytes

    :param key_id: Key To Use
    :param data: Data To Decrypt
    :param options: Additional Options
    :return: Decrypted Data
    """
    process = subprocess.Popen(["gpg"] + options + ["--decrypt"],
                               stdin=subprocess.PIPE,
                               stdout=subprocess.PIPE,
                               stderr=subprocess.PIPE)
    output, meta = process.communicate(input=data)

    if f"<{key_id}>".encode() not in meta:
        raise Exception(meta)

    return output


def import_key(data: bytes, options: list = []) -> bool:
    """
    Imports key and returns output as boolean

    :param data: Public Key In Bytes
    :param options: Additional Options
    :return: Boolean of successful import
    """
    process = subprocess.Popen(["gpg"] + options + ["--import"],
                               stdin=subprocess.PIPE,
                               stdout=subprocess.PIPE,
                               stderr=subprocess.PIPE)
    process.communicate(input=data)

    return process.wait() == 0


def export_key(key_id: str, options: list = []) -> bytes:
    """
    Returns public key as bytes

    :param key_id: Key To Export
    :param options: Additional Options
    :return: Exported Key
    """
    process = subprocess.Popen(["gpg"] + options + ["--export", key_id],
                               stdin=subprocess.PIPE,
                               stdout=subprocess.PIPE,
                               stderr=subprocess.PIPE)
    output, error = process.communicate()

    if error:
        raise Exception(error)

    return output
