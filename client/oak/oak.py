from base64 import b64encode, b64decode
from json import loads

import hashlib

from oak import gpg


def get_data_fields(metadata_sig: bytes) -> dict:
    [metadata_b64, _] = metadata_sig.split(b"|")
    metadata_bytes = b64decode(metadata_b64)
    return loads(metadata_bytes)


def init_token(key_id):
    return b64encode(gpg.export_key(key_id))


def roll_token(key_id: str, curr_token_b64: bytes, encrypted_rng: bytes) -> bytes:
    rng = gpg.decrypt(key_id, encrypted_rng)
    curr_token = b64decode(curr_token_b64)
    next_token = hashlib.sha3_512(curr_token + rng).digest()

    return b64encode(gpg.sign(key_id, next_token))
