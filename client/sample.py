#!/usr/bin/env python3
from os import path, environ
import hashlib
import requests

import oak

URL = "https://localhost:3000"

OAK_FILE = "./token.oak"

EMAIL = "daryl@oak.com"
PASSWORD = "abc123"


def _get_token():
    if path.exists(OAK_FILE):
        with open(OAK_FILE, "r") as f:
            return f.read()

    pub_key = oak.init_token(environ["KEY_PASS"])

    res = requests.post(f"{URL}/api/init",
                        headers={"OAK": pub_key},
                        data={
                            "email": EMAIL,
                            "password": hashlib.sha3_512(PASSWORD.encode()).hexdigest()
                        },
                        verify=False)

    if res.status_code != 200:
        raise Exception("API not cooperating")

    oak_token = res.headers.get("OAK")

    with open(OAK_FILE, "w") as f:
        f.write(oak_token)

    return oak_token


def main():
    curr_token = _get_token()


if __name__ == "__main__":
    main()
