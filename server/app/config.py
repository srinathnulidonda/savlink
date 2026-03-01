# server/app/config.py

import os
import json
import logging
from datetime import timedelta

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
        logger.warning("SECRET_KEY not set — using fallback")

    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', '').strip()
    if SQLALCHEMY_DATABASE_URI.startswith('postgres://'):
        SQLALCHEMY_DATABASE_URI = SQLALCHEMY_DATABASE_URI.replace(
            'postgres://', 'postgresql://', 1
        )

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # ═══ SCALED FOR 1000+ USERS ═══
    _is_prod = os.environ.get('FLASK_ENV') == 'production'
    _worker_count = int(os.environ.get('WEB_CONCURRENCY', '4'))

    # Calculate per-worker pool size
    # Render/Railway free: ~20 DB connections max
    # Render paid: ~100 connections
    # Supabase free: ~60 connections
    _max_db_connections = int(os.environ.get('MAX_DB_CONNECTIONS', '60'))
    _pool_per_worker = max(2, _max_db_connections // _worker_count)
    _overflow_per_worker = max(3, _pool_per_worker // 2)

    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': _pool_per_worker if _is_prod else 5,
        'max_overflow': _overflow_per_worker if _is_prod else 10,
        'pool_recycle': 120 if _is_prod else 300,
        'pool_pre_ping': True,
        'pool_timeout': 10 if _is_prod else 30,
        'echo': False,
        'connect_args': {
            'connect_timeout': 10 if _is_prod else 30,
            'application_name': 'savlink',
            'sslmode': 'require',
            'options': '-c statement_timeout=15000 -c lock_timeout=5000'
                       if _is_prod else
                       '-c statement_timeout=30000 -c lock_timeout=10000',
        },
    }

    FIREBASE_CONFIG_JSON = os.environ.get('FIREBASE_CONFIG_JSON')
    BASE_URL = os.environ.get('BASE_URL')
    API_URL = os.environ.get('API_URL', '')
    REDIS_URL = os.environ.get('REDIS_URL')

    BREVO_API_KEY = os.environ.get('BREVO_API_KEY')
    EMAIL_FROM_ADDRESS = os.environ.get('EMAIL_FROM_ADDRESS', 'noreply@savlink.com')
    EMAIL_FROM_NAME = os.environ.get('EMAIL_FROM_NAME', 'Savlink')
    USE_BREVO_API = os.environ.get('USE_BREVO_API', 'true').lower() == 'true'

    EMERGENCY_TOKEN_TTL = timedelta(minutes=15)
    EMERGENCY_SESSION_TTL = timedelta(hours=1)

    FLASK_ENV = os.environ.get('FLASK_ENV', 'production')
    DEBUG = FLASK_ENV == 'development'
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024

    CORS_ORIGINS = _build_cors()

    @classmethod
    def init_app(cls, app):
        app.config['CORS_ORIGINS'] = cls.CORS_ORIGINS

        if cls.FIREBASE_CONFIG_JSON:
            try:
                firebase_config = json.loads(cls.FIREBASE_CONFIG_JSON)
                logger.info("Firebase project: %s",
                            firebase_config.get('project_id'))
            except Exception as e:
                logger.error("Invalid Firebase config JSON: %s", e)

        if cls.FLASK_ENV == 'production':
            if not cls.SQLALCHEMY_DATABASE_URI:
                raise ValueError('DATABASE_URL must be set in production')
            if cls.SECRET_KEY == 'dev-fallback-change-in-production':
                raise ValueError('SECRET_KEY must be set in production')

            logger.info(
                "[DB] Pool: %d + %d overflow per worker (%d workers, %d max)",
                cls._pool_per_worker, cls._overflow_per_worker,
                cls._worker_count, cls._max_db_connections,
            )


def get_config():
    return Config