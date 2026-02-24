# server/app/responses.py
from flask import jsonify
from typing import Any, Optional


def success_response(data: Optional[Any] = None, message: Optional[str] = None, status: int = 200):
    body = {'success': True}
    if data is not None:
        body['data'] = data
    if message:
        body['message'] = message
    return jsonify(body), status


def error_response(message: str, status: int = 400, code: Optional[str] = None):
    body = {'success': False, 'error': message}
    if code:
        body['code'] = code
    return jsonify(body), status