# server/app/utils/crypto.py
import hashlib
import secrets
from flask import current_app

def generate_secure_token(length: int = None) -> str:
    if length is None:
        length = current_app.config.get('SESSION_TOKEN_LENGTH', 32)
    return secrets.token_urlsafe(length)

def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()