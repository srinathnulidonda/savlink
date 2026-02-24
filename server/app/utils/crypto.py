# server/app/utils/crypto.py
import hashlib
import hmac
import secrets
import os


def generate_secure_token(length: int = 32) -> str:
    return secrets.token_urlsafe(length)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
    return f"{salt}:{key.hex()}"


def verify_password(password: str, stored: str) -> bool:
    if ':' not in stored:
        # Legacy SHA256 — compare directly, will migrate on next set
        return hashlib.sha256(password.encode()).hexdigest() == stored
    salt, key_hex = stored.split(':', 1)
    new_key = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
    return hmac.compare_digest(new_key.hex(), key_hex)