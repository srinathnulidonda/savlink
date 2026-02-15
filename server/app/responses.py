# server/app/responses.py
from flask import jsonify
from typing import Any, Optional, Dict

def success_response(data: Optional[Any] = None, message: Optional[str] = None, status: int = 200):
    response = {'success': True}
    if data is not None:
        response['data'] = data
    if message:
        response['message'] = message
    return jsonify(response), status

def error_response(message: str, status: int = 400, code: Optional[str] = None):
    response = {
        'success': False,
        'error': message
    }
    if code:
        response['code'] = code
    return jsonify(response), status