# server/app/config.py

import os
import json
import logging
from datetime import timedelta
from urllib.parse import urlparse

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


def _parse_db_config(uri: str) -> dict:
    if not uri:
        return {'provider': 'none', 'pooler': False, 'pool_mode': 'session', 'port': 5432}

    parsed = urlparse(uri)
    hostname = parsed.hostname or ''
    port = parsed.port or 5432

    is_supabase = 'supabase' in hostname
    is_pooler = 'pooler' in hostname or 'supavisor' in hostname

    if is_supabase and is_pooler:
        pool_mode = 'transaction' if port == 6543 else 'session'
    else:
        pool_mode = os.environ.get('DB_POOL_MODE', 'session').lower()

    return {
        'provider': 'supabase' if is_supabase else 'postgres',
        'pooler': is_pooler,
        'pool_mode': pool_mode,
        'port': port,
    }


def _build_engine_options(db_uri: str, is_prod: bool) -> dict:
    db_info = _parse_db_config(db_uri)
    worker_count = int(os.environ.get('WEB_CONCURRENCY', '2'))
    thread_count = int(os.environ.get('GUNICORN_THREADS', '2'))
    concurrent_slots = worker_count * thread_count

    if db_info['pooler'] and db_info['pool_mode'] == 'transaction':
        max_conns = int(os.environ.get('MAX_DB_CONNECTIONS', '20'))
        pool_per_worker = max(2, min(5, max_conns // worker_count))
        overflow = max(2, pool_per_worker)

        logger.info(
            "[DB] Supabase Transaction mode (port %d) — "
            "%d pool + %d overflow per worker (%d workers × %d threads)",
            db_info['port'], pool_per_worker, overflow,
            worker_count, thread_count,
        )

        return {
            'pool_size': pool_per_worker if is_prod else 2,
            'max_overflow': overflow if is_prod else 3,
            'pool_recycle': 300,
            'pool_pre_ping': True,
            'pool_timeout': 10,
            'echo': False,
            'connect_args': {
                'connect_timeout': 10,
                'application_name': 'savlink',
                'sslmode': 'require',
            },
        }

    elif db_info['pooler'] and db_info['pool_mode'] == 'session':
        max_conns = int(os.environ.get('MAX_DB_CONNECTIONS', '15'))
        pool_per_worker = max(1, min(3, max_conns // concurrent_slots))
        overflow = max(1, min(2, pool_per_worker))

        logger.warning(
            "[DB] Supabase Session mode (port %d) — UPGRADE TO TRANSACTION MODE "
            "(port 6543) FOR BETTER PERFORMANCE. "
            "Using %d pool + %d overflow per worker (%d workers × %d threads, %d max)",
            db_info['port'], pool_per_worker, overflow,
            worker_count, thread_count, max_conns,
        )

        return {
            'pool_size': pool_per_worker if is_prod else 2,
            'max_overflow': overflow if is_prod else 2,
            'pool_recycle': 60,
            'pool_pre_ping': True,
            'pool_timeout': 5,
            'echo': False,
            'connect_args': {
                'connect_timeout': 10,
                'application_name': 'savlink',
                'sslmode': 'require',
                'options': '-c statement_timeout=15000 -c lock_timeout=5000',
            },
        }

    else:
        max_conns = int(os.environ.get('MAX_DB_CONNECTIONS', '60'))
        pool_per_worker = max(2, max_conns // worker_count)
        overflow = max(3, pool_per_worker // 2)

        logger.info(
            "[DB] Direct PostgreSQL — %d pool + %d overflow per worker "
            "(%d workers × %d threads, %d max)",
            pool_per_worker, overflow,
            worker_count, thread_count, max_conns,
        )

        return {
            'pool_size': pool_per_worker if is_prod else 5,
            'max_overflow': overflow if is_prod else 10,
            'pool_recycle': 120 if is_prod else 300,
            'pool_pre_ping': True,
            'pool_timeout': 10 if is_prod else 30,
            'echo': False,
            'connect_args': {
                'connect_timeout': 10 if is_prod else 30,
                'application_name': 'savlink',
                'sslmode': 'require',
                'options': '-c statement_timeout=15000 -c lock_timeout=5000'
                           if is_prod else
                           '-c statement_timeout=30000 -c lock_timeout=10000',
            },
        }


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

    _is_prod = os.environ.get('FLASK_ENV') == 'production'
    _db_info = _parse_db_config(SQLALCHEMY_DATABASE_URI)

    SQLALCHEMY_ENGINE_OPTIONS = _build_engine_options(
        SQLALCHEMY_DATABASE_URI, _is_prod
    )

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
    CACHE_WARMUP_ENABLED = os.environ.get('CACHE_WARMUP_ENABLED', 'false').lower() == 'true'

    @classmethod
    def init_app(cls, app):
        app.config['CORS_ORIGINS'] = cls.CORS_ORIGINS
        app.config['CACHE_WARMUP_ENABLED'] = cls.CACHE_WARMUP_ENABLED

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


def get_config():
    return Config