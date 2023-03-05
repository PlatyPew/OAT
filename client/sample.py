#!/usr/bin/env python3
from os import path, environ
import hashlib
import requests

import oak

URL = "https://localhost:3000"

OAK_FILE = "./token.oak"

EMAIL = "daryl@oak.com"
PASSWORD = "abc123"

curr_token: str = ""


def _get_token():
    global curr_token
    if path.exists(OAK_FILE):
        with open(OAK_FILE, "r") as f:
            curr_token = f.read()
        return

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

    token = res.headers.get("OAK")
    if not token is None:
        _update_token(token)


def _update_token(token):
    global curr_token
    curr_token = token

    with open(OAK_FILE, "w") as f:
        f.write(token)


def _gen_token():
    global curr_token
    rolled_token = oak.roll_token(curr_token.encode())

    return {"OAK": rolled_token.decode()}


def get_store_inventory():
    res = requests.get(f"{URL}/api/market/store/get", headers=_gen_token(), verify=False)

    if res.status_code != 200:
        raise Exception("API not cooperating")

    token = res.headers.get("OAK")
    if not token is None:
        _update_token(token)

    return res.text


def get_cart_inventory():
    res = requests.get(f"{URL}/api/market/cart/get", headers={"OAK": _gen_token()}, verify=False)

    if res.status_code != 200 and res.status_code != 204:
        raise Exception("API not cooperating")

    token = res.headers.get("OAK")
    if not token is None:
        _update_token(token)

    return res.text


def set_cart_inventory(cart={}):
    res = requests.post(f"{URL}/api/market/cart/set",
                       headers={"OAK": _gen_token()},
                       data=cart,
                       verify=False)

    if res.status_code != 200:
        raise Exception("API not cooperating")

    token = res.headers.get("OAK")
    if not token is None:
        _update_token(token)

    return res.text


def main():
    global curr_token
    _get_token()


if __name__ == "__main__":
    main()
