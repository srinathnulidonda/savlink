# server/app/config.py
import os
import json
import logging

logger = logging.getLogger(__name__)


class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', os.urandom(32).hex())

    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', '').strip()
    if SQLALCHEMY_DATABASE_URI.startswith('postgres://'):
        SQLALCHEMY_DATABASE_URI = SQLALCHEMY_DATABASE_URI.replace('postgres://', 'postgresql://', 1)

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 2,
        'max_overflow': 3,
        'pool_recycle': 300,
        'pool_pre_ping': False,
        'pool_timeout': 60,
        'pool_reset_on_return': None,
        'echo': False,
        'connect_args': {
            'connect_timeout': 30,
            'application_name': 'savlink',
            'sslmode': 'require',
            'options': '-c statement_timeout=30000 -c lock_timeout=10000',
        },
    }

    FIREBASE_CONFIG_JSON = os.environ.get('FIREBASE_CONFIG_JSON')
    BASE_URL = os.environ.get('BASE_URL', 'https://savlink.vercel.app')
    API_URL = os.environ.get('API_URL', '')
    REDIS_URL = os.environ.get('REDIS_URL')
    BREVO_API_KEY = os.environ.get('BREVO_API_KEY')
    EMAIL_FROM_ADDRESS = os.environ.get('EMAIL_FROM_ADDRESS', 'noreply@savlink.com')

    FLASK_ENV = os.environ.get('FLASK_ENV', 'production')
    DEBUG = FLASK_ENV == 'development'
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024

    CORS_ORIGINS = _build_cors()

    @staticmethod
    def _build_cors():
        raw = os.environ.get('CORS_ORIGINS', '')
        base = os.environ.get('BASE_URL', 'https://savlink.vercel.app')
        defaults = [
            'http://localhost:5173', 'http://localhost:3000',
            'https://savlink.vercel.app', base,
            'https://accounts.google.com',
        ]
        extra = [o.strip() for o in raw.split(',') if o.strip()] if raw else []
        firebase_json = os.environ.get('FIREBASE_CONFIG_JSON')
        if firebase_json:
            try:
                pid = json.loads(firebase_json).get('project_id')
                if pid:
                    defaults.append(f'https://{pid}.firebaseapp.com')
            except Exception:
                pass
        return list(dict.fromkeys(defaults + extra))

    @classmethod
    def init_app(cls, app):
        app.config['CORS_ORIGINS'] = cls.CORS_ORIGINS
        if cls.FLASK_ENV == 'production':
            if not cls.SQLALCHEMY_DATABASE_URI:
                raise ValueError('DATABASE_URL must be set in production')


# re-evaluate at import time
Config.CORS_ORIGINS = Config._build_cors()


def get_config():
    return Config