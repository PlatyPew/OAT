#!/usr/bin/env python3
from os import path, environ
import hashlib
import requests

import oat

URL = "https://www.charming-brahmagupta.cloud"

OAT_FILE = "./token.oat"

curr_token: str = ""


def _get_token():
    global curr_token
    if path.exists(OAT_FILE):
        with open(OAT_FILE, "r") as f:
            curr_token = f.read()
        return

    pub_key = oat.init_token(environ["KEY_PASS"])

    res = requests.post(f"{URL}/api/init",
                        headers={"OAT": pub_key},
                        data={
                            "email": input("Email: "),
                            "password": hashlib.sha3_512(input("Password: ").encode()).hexdigest()
                        })

    if res.status_code != 200:
        raise Exception(res.text)

    token = res.headers.get("OAT")
    if not token is None:
        _update_token(token)


def _update_token(token):
    global curr_token
    curr_token = token

    with open(OAT_FILE, "w") as f:
        f.write(token)


def _gen_token():
    global curr_token
    rolled_token = oat.roll_token(curr_token.encode())

    return rolled_token.decode()


def get_store_inventory():
    res = requests.get(f"{URL}/api/market/store/get", headers={"OAT": _gen_token()})

    token = res.headers.get("OAT")
    if not token is None:
        _update_token(token)

    if res.status_code == 200:
        return res.text

    if res.status_code == 204:
        return None

    raise Exception(res.text)


def get_cart_inventory():
    res = requests.get(f"{URL}/api/market/cart/get", headers={"OAT": _gen_token()})

    token = res.headers.get("OAT")
    if not token is None:
        _update_token(token)

    if res.status_code == 200:
        return res.text

    if res.status_code == 204:
        return None

    raise Exception(res.text)


def set_cart_inventory(cart={}):
    res = requests.post(f"{URL}/api/market/cart/set", headers={"OAT": _gen_token()}, data=cart)

    token = res.headers.get("OAT")
    if not token is None:
        _update_token(token)

    if res.status_code == 200:
        return res.text

    if res.status_code == 204:
        return None

    raise Exception(res.text)


def buy_from_cart():
    res = requests.post(f"{URL}/api/market/store/buy", headers={"OAT": _gen_token()})

    token = res.headers.get("OAT")
    if not token is None:
        _update_token(token)

    if res.status_code == 200:
        return res.text

    if res.status_code == 204:
        return None

    raise Exception(res.text)


def set_store_inventory(store={}):
    res = requests.post(f"{URL}/api/market/store/restock",
                        headers={"OAT": _gen_token()},
                        data=store)

    token = res.headers.get("OAT")
    if not token is None:
        _update_token(token)

    if res.status_code == 200:
        return res.text

    if res.status_code == 204:
        return None

    raise Exception(res.text)


def main():
    global curr_token
    _get_token()


if __name__ == "__main__":
    main()
