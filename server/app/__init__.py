# server/app/__init__.py

import time
import logging
import threading
from flask import Flask, jsonify, request, g
from flask_cors import CORS
from .config import get_config, _parse_db_config
from .extensions import db, migrate, redis_client
from .database import db_manager

logger = logging.getLogger(__name__)


def create_app(config_class=None):
    if config_class is None:
        config_class = get_config()

    app = Flask(__name__)
    app.config.from_object(config_class)
    config_class.init_app(app)

    _init_extensions(app)
    _register_hooks(app)
    _register_health(app)
    _init_database(app)
    _init_firebase(app)
    _register_blueprints(app)
    _register_errors(app)

    _log_startup_banner(app)
    return app


def _log_startup_banner(app):
    import os
    from datetime import datetime, timezone

    env = app.config.get('FLASK_ENV', 'development')
    debug = app.config.get('DEBUG', False)
    port = os.environ.get('PORT', '10000')
    cors_count = len(app.config.get('CORS_ORIGINS', []))

    db_uri = app.config.get('SQLALCHEMY_DATABASE_URI', '')
    db_info = _parse_db_config(db_uri)
    db_driver = db_uri.split('://')[0].split('+')[0] if '://' in db_uri else 'none'

    if db_info['pooler']:
        db_status = f"{db_driver} ({db_info['provider']} {db_info['pool_mode']} mode)"
    else:
        db_status = db_driver

    firebase_ok = bool(app.config.get('FIREBASE_CONFIG_JSON'))
    redis_ok = redis_client.available

    engine_opts = app.config.get('SQLALCHEMY_ENGINE_OPTIONS', {})
    pool_size = engine_opts.get('pool_size', '?')
    max_overflow = engine_opts.get('max_overflow', '?')

    now = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')

    services = [
        ("database", db_status, db_driver != 'none'),
        ("pool", f"size={pool_size} overflow={max_overflow}", True),
        ("redis", "connected" if redis_ok else "unavailable", redis_ok),
        ("auth", "firebase" if firebase_ok else "disabled", firebase_ok),
    ]

    all_ok = all(h for _, _, h in services)

    logger.info("")
    logger.info("  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    logger.info("")
    logger.info("  api.savlink")
    logger.info("  v0.5.0 · Link Management API")
    logger.info("")
    logger.info("  ── Configuration ──────────────────────────────")
    logger.info("")
    logger.info("    environment   %s", env)
    logger.info("    port          %s", port)
    logger.info("    debug         %s", "on" if debug else "off")
    logger.info("    cors          %d origins", cors_count)
    logger.info("    blueprints    13")
    logger.info("")
    logger.info("  ── Services ───────────────────────────────────")
    logger.info("")
    for name, value, healthy in services:
        icon = "✓" if healthy else "✗"
        logger.info("    %s  %-12s  %s", icon, name, value)
    logger.info("")
    logger.info("  ── Status ─────────────────────────────────────")
    logger.info("")
    logger.info("    %s  %s", "●" if all_ok else "◐", "All systems operational" if all_ok else "Degraded mode")
    logger.info("    Started %s", now)
    logger.info("")
    logger.info("  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    logger.info("")
    logger.info("  ✓ Ready to accept connections")
    logger.info("")


def _init_extensions(app):
    db.init_app(app)
    migrate.init_app(app, db)
    db_manager.init_app(app)

    cors_origins = app.config.get('CORS_ORIGINS', [])
    logger.info("[CORS] Allowed origins: %d configured", len(cors_origins))

    CORS(app,
         origins=cors_origins,
         supports_credentials=True,
         allow_headers=['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
         expose_headers=['Content-Type', 'Authorization'],
         max_age=86400)


def _register_hooks(app):
    @app.before_request
    def _before():
        g.request_start_time = time.time()

    @app.after_request
    def _after(resp):
        if hasattr(g, 'request_start_time'):
            dur = time.time() - g.request_start_time
            if dur > 5:
                logger.warning("[SLOW] %s %s took %.2fs", request.method, request.path, dur)

        resp.headers['Cross-Origin-Opener-Policy'] = 'same-origin-allow-popups'
        resp.headers['Cross-Origin-Embedder-Policy'] = 'unsafe-none'
        resp.headers['X-Content-Type-Options'] = 'nosniff'
        resp.headers['X-Frame-Options'] = 'SAMEORIGIN'
        resp.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'

        vary = set(filter(None, resp.headers.get('Vary', '').split(', '))) | {'Origin'}
        resp.headers['Vary'] = ', '.join(vary)

        if request.path.startswith('/api/'):
            resp.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        elif request.path.startswith('/r/'):
            resp.headers['Cache-Control'] = 'public, max-age=300'

        return resp

    @app.teardown_appcontext
    def _teardown(exception=None):
        try:
            if exception:
                db.session.rollback()
            db.session.remove()
        except Exception:
            pass


def _register_health(app):
    @app.route('/')
    def _index():
        return jsonify(service='api.savlink', status='online', version='0.5.0')

    @app.route('/ping')
    def _ping():
        return 'pong', 200

    @app.route('/health')
    def _health():
        return jsonify(status='healthy', service='api.savlink', ts=time.time())

    @app.route('/health/full')
    def _health_full():
        checks = {'database': db_manager.check_health()}
        checks['pool'] = db_manager.get_pool_status()
        if redis_client.available:
            checks['redis'] = {'healthy': redis_client.ping()}
        status = 'healthy' if checks['database'].get('healthy') else 'degraded'
        return jsonify(status=status, checks=checks)


def _init_database(app):
    def _task():
        with app.app_context():
            result = db_manager.initialize_with_retry()
            if result['success']:
                logger.info("[DB] Initialized successfully — %d tables", result.get('tables_count', 0))
            else:
                logger.error("[DB] Initialization failed: %s", result.get('error'))

    if app.config.get('FLASK_ENV') == 'production':
        threading.Thread(target=_task, daemon=True).start()
    else:
        _task()


def _init_firebase(app):
    if not app.config.get('FIREBASE_CONFIG_JSON'):
        logger.warning("[AUTH] Firebase config not set — authentication disabled")
        return
    try:
        from .auth.firebase import initialize_firebase
        initialize_firebase()
        logger.info("[AUTH] Firebase initialized")
    except Exception as e:
        logger.error("[AUTH] Firebase initialization failed: %s", e)


def _register_blueprints(app):
    from .auth import auth_bp
    from .links import links_bp
    from .folders import folders_bp
    from .tags import tags_bp
    from .dashboard import dashboard_bp
    from .search import search_bp
    from .shortlinks import shortlinks_bp
    from .redirect import redirect_bp
    from .metadata.routes import metadata_bp
    from .export import export_bp
    from .activity import activity_bp
    from .trash import trash_bp
    from .users import users_bp

    app.register_blueprint(auth_bp,       url_prefix='/api/auth')
    app.register_blueprint(links_bp,      url_prefix='/api/links')
    app.register_blueprint(folders_bp,    url_prefix='/api/folders')
    app.register_blueprint(tags_bp,       url_prefix='/api/tags')
    app.register_blueprint(dashboard_bp,  url_prefix='/api/dashboard')
    app.register_blueprint(search_bp,     url_prefix='/api/search')
    app.register_blueprint(shortlinks_bp, url_prefix='/api/shortlinks')
    app.register_blueprint(redirect_bp,   url_prefix='/r')
    app.register_blueprint(metadata_bp,   url_prefix='/api/metadata')
    app.register_blueprint(export_bp,     url_prefix='/api/export')
    app.register_blueprint(activity_bp,   url_prefix='/api/activity')
    app.register_blueprint(trash_bp,      url_prefix='/api/trash')
    app.register_blueprint(users_bp,      url_prefix='/api/user')

    logger.info("[ROUTES] Registered %d blueprints", 13)


def _register_errors(app):
    for code, msg in [(400, 'Bad request'), (401, 'Unauthorized'), (403, 'Forbidden'),
                      (404, 'Not found'), (429, 'Rate limit exceeded'), (503, 'Service unavailable')]:
        app.register_error_handler(code, lambda e, m=msg: (jsonify(success=False, error=m), e.code))

    @app.errorhandler(500)
    def _500(e):
        logger.error("[ERROR] Internal server error: %s", e, exc_info=True)
        return jsonify(success=False, error='Internal server error'), 500

    @app.errorhandler(Exception)
    def _unhandled(e):
        logger.error("[ERROR] Unhandled exception: %s", e, exc_info=True)
        return jsonify(success=False, error='Server error'), 500