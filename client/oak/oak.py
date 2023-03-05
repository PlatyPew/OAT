from base64 import b64encode, b64decode
from json import loads

from oak import gpg


def _strip_key_id(fields: dict) -> dict:
    if not 'pubkeyid' in fields:
        raise Exception("Public Key ID Not Found")

    del fields['pubkeyid']
    return fields


def _split_token(token: bytes) -> tuple:
    enc_key_b64, data = token.split(b"-")
    fields_b64, hmac_b64 = data.split(b"|")

    enc_key = b64decode(enc_key_b64)
    fields = loads(b64decode(fields_b64))
    hmac = b64decode(hmac_b64)

    return enc_key, fields, hmac


def get_session_data(token: bytes) -> dict:
    _, fields, _ = _split_token(token)
    return _strip_key_id(fields)


def init_token(password: str) -> bytes:
    from getpass import getuser
    from socket import gethostname

    key_id = gpg.gen_key(f"{getuser()}@{gethostname()}", password)

    return b64encode(gpg.export_key(key_id))


def roll_token(token: bytes) -> bytes:
    enc_key, fields, _ = _split_token(token)
    key = gpg.decrypt(enc_key)

    key_id = fields["pubkeyid"]
    signed_key = gpg.sign(key_id, key)

    return b64encode(signed_key) + b"-" + token.split(b"-")[1]
