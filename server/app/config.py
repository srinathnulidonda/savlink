# server/app/config.py
import os
import json
import logging

logger = logging.getLogger(__name__)


def _build_cors():
    raw = os.environ.get('CORS_ORIGINS', '')
    base = os.environ.get('BASE_URL')
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
    return list(dict.fromkeys(d for d in defaults + extra if d))


class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY')
    if not SECRET_KEY:
        SECRET_KEY = 'dev-fallback-change-in-production'
        logger.warning("SECRET_KEY not set — using fallback (NOT safe for production)")

    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', '').strip()
    if SQLALCHEMY_DATABASE_URI.startswith('postgres://'):
        SQLALCHEMY_DATABASE_URI = SQLALCHEMY_DATABASE_URI.replace('postgres://', 'postgresql://', 1)

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 5,
        'max_overflow': 10,
        'pool_recycle': 300,
        'pool_pre_ping': True,
        'pool_timeout': 30,
        'echo': False,
        'connect_args': {
            'connect_timeout': 30,
            'application_name': 'savlink',
            'sslmode': 'require',
            'options': '-c statement_timeout=30000 -c lock_timeout=10000',
        },
    }

    FIREBASE_CONFIG_JSON = os.environ.get('FIREBASE_CONFIG_JSON')
    BASE_URL = os.environ.get('BASE_URL')
    API_URL = os.environ.get('API_URL', '')
    REDIS_URL = os.environ.get('REDIS_URL')
    BREVO_API_KEY = os.environ.get('BREVO_API_KEY')
    EMAIL_FROM_ADDRESS = os.environ.get('EMAIL_FROM_ADDRESS')

    FLASK_ENV = os.environ.get('FLASK_ENV', 'production')
    DEBUG = FLASK_ENV == 'development'
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024

    CORS_ORIGINS = _build_cors()

    @classmethod
    def init_app(cls, app):
        app.config['CORS_ORIGINS'] = cls.CORS_ORIGINS
        if cls.FLASK_ENV == 'production':
            if not cls.SQLALCHEMY_DATABASE_URI:
                raise ValueError('DATABASE_URL must be set in production')
            if cls.SECRET_KEY == 'dev-fallback-change-in-production':
                raise ValueError('SECRET_KEY must be set in production')


def get_config():
    return Config