#!/usr/bin/env python3
import subprocess


def sign(key_id: str, data: bytes) -> bytes:
    """
    Signs data and returns output as bytes

    :param key_id: Key To Use
    :param data: Data To Sign
    :return: Signed Data
    """
    process = subprocess.Popen(["gpg", "--local-user", key_id, "--output", "-", "--sign"],
                               stdin=subprocess.PIPE,
                               stdout=subprocess.PIPE)
    output, error = process.communicate(input=data)

    if error:
        raise Exception(error)

    return output


def verify(key_id: str, data: bytes) -> bool:
    """
    Verify data and returns output boolean

    :param key_id: Key To Use
    :param data: Data To Verify
    :return: Boolean Of Successful Verification
    """
    process = subprocess.Popen(["gpg", "--verify"],
                               stdin=subprocess.PIPE,
                               stdout=subprocess.PIPE,
                               stderr=subprocess.PIPE)
    _, output = process.communicate(input=data)

    return f"<{key_id}>".encode() in output and process.wait() == 0


def encrypt(key_id: str, data: bytes) -> bytes:
    """
    Encrypt data and returns output as bytes

    :param key_id: Key To Use
    :param data: Data To Encrypt
    :return: Encrypted Data
    """
    process = subprocess.Popen(["gpg", "--recipient", key_id, "--output", "-", "--encrypt"],
                               stdin=subprocess.PIPE,
                               stdout=subprocess.PIPE)
    output, error = process.communicate(input=data)

    if error:
        raise Exception(error)

    return output


def decrypt(key_id: str, data: bytes) -> bytes:
    """
    Decrypt data and returns output as bytes

    :param key_id: Key To Use
    :param data: Data To Decrypt
    :return: Decrypted Data
    """
    process = subprocess.Popen(["gpg", "--decrypt"],
                               stdin=subprocess.PIPE,
                               stdout=subprocess.PIPE,
                               stderr=subprocess.PIPE)
    output, meta = process.communicate(input=data)

    if f"<{key_id}>".encode() not in meta:
        raise Exception(meta)

    return output


def import_key(data: bytes) -> bool:
    """
    Imports key and returns output as boolean

    :param data: Public Key In Bytes
    :return: Boolean of successful import
    """
    process = subprocess.Popen(["gpg", "--import"],
                               stdin=subprocess.PIPE,
                               stdout=subprocess.PIPE,
                               stderr=subprocess.PIPE)
    process.communicate(input=data)

    return process.wait() == 0


def export_key(key_id: str) -> bytes:
    """
    Returns public key as bytes

    :param key_id: Key To Export
    :return: Exported Key
    """
    process = subprocess.Popen(["gpg", "--export", key_id],
                               stdin=subprocess.PIPE,
                               stdout=subprocess.PIPE,
                               stderr=subprocess.PIPE)
    output, error = process.communicate()

    if error:
        raise Exception(error)

    return output
