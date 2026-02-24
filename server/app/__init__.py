# server/app/__init__.py
import time
import logging
import threading
from flask import Flask, jsonify, request, g
from flask_cors import CORS
from .config import get_config
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

    logger.info("Application ready — env=%s", app.config.get('FLASK_ENV'))
    return app


def _init_extensions(app):
    db.init_app(app)
    migrate.init_app(app, db)
    db_manager.init_app(app)

    CORS(app,
         origins=app.config.get('CORS_ORIGINS', []),
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
            if dur > 10:
                logger.warning("Slow request: %s %s %.2fs", request.method, request.path, dur)

        resp.headers['Cross-Origin-Opener-Policy'] = 'unsafe-none'
        resp.headers['Cross-Origin-Embedder-Policy'] = 'unsafe-none'
        resp.headers['X-Content-Type-Options'] = 'nosniff'
        resp.headers['X-Frame-Options'] = 'SAMEORIGIN'
        resp.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'

        vary = set(filter(None, resp.headers.get('Vary', '').split(', '))) | {'Origin'}
        resp.headers['Vary'] = ', '.join(vary)

        if request.path.startswith(('/api/', '/auth/')):
            resp.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        elif request.path.startswith('/r/'):
            resp.headers['Cache-Control'] = 'public, max-age=300'

        return resp


def _register_health(app):
    @app.route('/')
    def _index():
        return jsonify(service='savlink-backend', status='online', version='3.0.0')

    @app.route('/ping')
    def _ping():
        return 'pong', 200

    @app.route('/health')
    def _health():
        return jsonify(status='healthy', service='savlink-backend', ts=time.time())

    @app.route('/health/full')
    def _health_full():
        checks = {'database': db_manager.check_health()}
        if redis_client.available:
            checks['redis'] = {'healthy': redis_client.ping()}
        status = 'healthy' if checks['database'].get('healthy') else 'degraded'
        return jsonify(status=status, checks=checks)


def _init_database(app):
    def _task():
        with app.app_context():
            result = db_manager.initialize_with_retry()
            if result['success']:
                logger.info("Database initialized — %d tables", result.get('tables_count', 0))
            else:
                logger.error("Database init failed: %s", result.get('error'))

    if app.config.get('FLASK_ENV') == 'production':
        threading.Thread(target=_task, daemon=True).start()
    else:
        _task()


def _init_firebase(app):
    if not app.config.get('FIREBASE_CONFIG_JSON'):
        logger.warning("FIREBASE_CONFIG_JSON not set — Firebase auth disabled")
        return
    try:
        from .auth.firebase import initialize_firebase
        initialize_firebase()
        logger.info("Firebase initialized")
    except Exception as e:
        logger.error("Firebase init failed: %s", e)


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

    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(links_bp, url_prefix='/api/links')
    app.register_blueprint(folders_bp, url_prefix='/api/folders')
    app.register_blueprint(tags_bp, url_prefix='/api/tags')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    app.register_blueprint(search_bp, url_prefix='/api/search')
    app.register_blueprint(shortlinks_bp, url_prefix='/api/shortlinks')
    app.register_blueprint(redirect_bp, url_prefix='/r')
    app.register_blueprint(metadata_bp, url_prefix='/api/metadata')
    app.register_blueprint(export_bp, url_prefix='/api/export')


def _register_errors(app):
    for code, msg in [(400, 'Bad request'), (401, 'Unauthorized'), (403, 'Forbidden'),
                      (404, 'Not found'), (429, 'Rate limit exceeded'), (503, 'Service unavailable')]:
        app.register_error_handler(code, lambda e, m=msg: (jsonify(success=False, error=m), e.code))

    @app.errorhandler(500)
    def _500(e):
        logger.error("Internal error: %s", e, exc_info=True)
        return jsonify(success=False, error='Internal server error'), 500

    @app.errorhandler(Exception)
    def _unhandled(e):
        logger.error("Unhandled: %s", e, exc_info=True)
        return jsonify(success=False, error='Server error'), 500