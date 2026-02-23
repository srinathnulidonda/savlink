# server/app/__init__.py
import os
import logging
import time
import threading
from flask import Flask, jsonify, request, make_response, g
from flask_cors import CORS
from sqlalchemy import text
from .config import Config, get_config
from .extensions import db, migrate, redis_client
from .database import db_manager
import json
import re

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global initialization state
_app_initialized = False
_initialization_lock = threading.Lock()

def create_app(config_class=None):
    """Create and configure the Flask application with enhanced error handling"""
    global _app_initialized
    
    if config_class is None:
        config_class = get_config()
    
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Initialize configuration
    config_class.init_app(app)
    
    logger.info(f"🚀 Starting Savlink backend in {app.config.get('FLASK_ENV', 'production')} mode")
    
    # Step 1: Initialize core extensions (no DB required)
    initialize_core_extensions(app)
    
    # Step 2: Configure request handling
    configure_request_handling(app)
    
    # Step 3: Register endpoints early (for health checks)
    register_root_endpoints(app)
    
    # Step 4: Initialize database in background for production
    if app.config.get('FLASK_ENV') == 'production':
        initialize_database_async(app)
    else:
        # Synchronous for development
        initialize_database_sync(app)
    
    # Step 5: Register blueprints and error handlers
    register_blueprints(app)
    register_error_handlers(app)
    
    logger.info(f"✅ Savlink backend initialized successfully")
    
    return app

def initialize_core_extensions(app):
    """Initialize Flask extensions that don't require database"""
    try:
        # Database ORM (no connection yet)
        db.init_app(app)
        migrate.init_app(app, db)
        
        # Initialize database manager
        db_manager.init_app(app)
        
        # ENHANCED CORS configuration for OAuth compatibility
        cors_origins = app.config.get('CORS_ORIGINS') or []  # FIXED: Handle None case
        
        CORS(app,
             origins=cors_origins,
             supports_credentials=True,
             allow_headers=[
                 'Content-Type', 
                 'Authorization', 
                 'X-Requested-With',
                 'Accept',
                 'Origin',
                 'Access-Control-Request-Method',
                 'Access-Control-Request-Headers'
             ],
             methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
             expose_headers=['Content-Type', 'Authorization'],
             max_age=86400)
        
        logger.info("✅ Extensions initialized successfully")
        logger.info(f"🌐 CORS origins: {len(cors_origins)} configured")
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize extensions: {e}", exc_info=True)
        raise

def is_oauth_related_origin(origin):
    """Check if the origin is related to OAuth flows"""
    if not origin:
        return False
    
    oauth_domains = [
        'firebase',
        'googleapis',
        'accounts.google',
        'oauth2.googleapis',
        'www.googleapis',
        'securetoken.google',
        'identitytoolkit.googleapis'
    ]
    
    origin_lower = origin.lower()
    return any(domain in origin_lower for domain in oauth_domains)

def configure_request_handling(app):
    """Configure request timeout, performance monitoring, and CORS — SIMPLIFIED"""

    @app.before_request
    def before_request():
        """Track request timing. CORS preflight is handled by Flask-CORS."""
        g.request_start_time = time.time()

        if app.config.get('DEBUG'):
            logger.debug(f"Request: {request.method} {request.path} "
                         f"from {request.headers.get('Origin', 'unknown')}")

    @app.after_request
    def after_request(response):
        """Add security + COOP headers to every response."""

        # ── Performance monitoring ──
        if hasattr(g, 'request_start_time'):
            duration = time.time() - g.request_start_time
            threshold = app.config.get('SLOW_REQUEST_THRESHOLD', 15)
            if duration > threshold:
                logger.warning(f"🐌 Slow request: {request.method} {request.path} took {duration:.2f}s")
            if app.config.get('DEBUG'):
                response.headers['X-Response-Time'] = f"{duration:.3f}s"

        # ── COOP / COEP — must be unsafe-none for OAuth popup compatibility ──
        response.headers['Cross-Origin-Opener-Policy'] = 'unsafe-none'
        response.headers['Cross-Origin-Embedder-Policy'] = 'unsafe-none'

        # ── Standard security headers ──
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'SAMEORIGIN'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'

        # ── Vary header for correct CORS caching ──
        existing_vary = response.headers.get('Vary', '')
        vary_values = set(filter(None, existing_vary.split(', '))) | {'Origin'}
        response.headers['Vary'] = ', '.join(vary_values)

        # ── Cache control ──
        if request.path.startswith('/api/') or request.path.startswith('/auth/'):
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response.headers['Pragma'] = 'no-cache'
            response.headers['Expires'] = '0'
        elif request.path.startswith('/r/'):
            response.headers['Cache-Control'] = 'public, max-age=300'

        return response

    @app.teardown_request
    def teardown_request(exception):
        if exception:
            logger.error(f"❌ Request exception: {exception}", exc_info=True)

def initialize_database_async(app):
    """Initialize database asynchronously for production"""
    
    def init_task():
        with app.app_context():
            try:
                logger.info("🔄 Starting async database initialization...")
                
                # Initialize database with retry
                result = db_manager.initialize_with_retry()
                
                if result['success']:
                    # Run migrations
                    try:
                        run_database_migrations(app)
                    except Exception as e:
                        logger.error(f"❌ Migration failed but continuing: {e}")
                    
                    # Initialize Firebase
                    try:
                        initialize_firebase(app)
                    except Exception as e:
                        logger.error(f"❌ Firebase init failed but continuing: {e}")
                else:
                    logger.warning(f"⚠️ Database initialization failed: {result.get('error')}")
                    
            except Exception as e:
                logger.error(f"❌ Async database initialization failed: {e}", exc_info=True)
    
    # Start background initialization
    thread = threading.Thread(target=init_task, daemon=True)
    thread.start()
    
    logger.info("🔄 Database initialization started in background")

def initialize_database_sync(app):
    """Initialize database synchronously for development"""
    with app.app_context():
        try:
            logger.info("🔄 Initializing database synchronously...")
            
            result = db_manager.initialize_with_retry()
            
            if result['success']:
                logger.info("✅ Database initialized successfully")
                
                # Run migrations
                run_database_migrations(app)
                
                # Initialize Firebase
                initialize_firebase(app)
            else:
                logger.warning(f"⚠️ Database initialization failed: {result.get('error')}")
                # Continue anyway for development
                
        except Exception as e:
            logger.error(f"❌ Database initialization error: {e}", exc_info=True)
            # Don't raise in development to allow debugging

def run_database_migrations(app):
    """Run database migrations with enhanced error handling"""
    try:
        logger.info("🔄 Checking for database migrations...")
        
        from .migrations.manager import migration_manager
        from .migrations import register_all_migrations
        
        # Register all migrations
        register_all_migrations()
        
        # Run migrations with retry
        result = migration_manager.run_migrations_with_enhanced_retry(dry_run=False)
        
        if result['status'] == 'success':
            if result['migrations_run'] > 0:
                logger.info(f"✅ Applied {result['migrations_run']} migrations")
                for detail in result['details']:
                    if detail['status'] == 'success':
                        logger.info(f"  ✅ {detail['version']} ({detail.get('execution_time_ms', 0)}ms)")
                    elif detail['status'] == 'skipped':
                        logger.info(f"  ⏭️ {detail['version']} (skipped - {detail.get('reason', 'unknown')})")
            else:
                logger.info("✅ Database schema is up to date")
        else:
            logger.error(f"❌ Migration failed: {result.get('error', 'Unknown error')}")
            
    except Exception as e:
        logger.error(f"❌ Migration process error: {e}", exc_info=True)

def initialize_firebase(app):
    """Initialize Firebase Admin SDK with error handling"""
    try:
        from .auth.firebase import initialize_firebase as init_firebase
        
        if not app.config.get('FIREBASE_CONFIG_JSON'):
            logger.warning("⚠️ FIREBASE_CONFIG_JSON not configured - Firebase auth disabled")
            return
        
        firebase_app = init_firebase()
        
        if firebase_app:
            logger.info("✅ Firebase Admin SDK initialized")
        else:
            logger.warning("⚠️ Firebase Admin SDK initialization returned None")
            
    except ValueError as ve:
        logger.error(f"❌ Firebase configuration error: {ve}")
    except Exception as e:
        logger.error(f"❌ Firebase initialization error: {e}")

def register_blueprints(app):
    """Register all application blueprints"""
    try:
        # Auth blueprint
        from .auth import auth_bp
        app.register_blueprint(auth_bp, url_prefix='/auth')
        logger.info("✅ Auth blueprint registered")
        
        # Links blueprint
        from .links import links_bp
        app.register_blueprint(links_bp, url_prefix='/api/links')
        logger.info("✅ Links blueprint registered")
        
        # Dashboard blueprint
        from .dashboard import dashboard_bp
        app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
        logger.info("✅ Dashboard blueprint registered")
        
        # Redirect blueprint
        from .redirect import redirect_bp
        app.register_blueprint(redirect_bp, url_prefix='/r')
        logger.info("✅ Redirect blueprint registered")
        
        # Folders blueprint
        from .folders import folders_bp
        app.register_blueprint(folders_bp, url_prefix='/api/folders')
        logger.info("✅ Folders blueprint registered")
        
        # Tags blueprint
        from .tags import tags_bp
        app.register_blueprint(tags_bp, url_prefix='/api/tags')
        logger.info("✅ Tags blueprint registered")
        
        # Search blueprint
        from .search import search_bp
        app.register_blueprint(search_bp, url_prefix='/api/search')
        logger.info("✅ Search blueprint registered")
        
        # Shortlinks blueprint
        from .shortlinks import shortlinks_bp
        app.register_blueprint(shortlinks_bp, url_prefix='/api/shortlinks')
        logger.info("✅ Shortlinks blueprint registered")
        
        # NEW: Metadata blueprint
        from .metadata.routes import metadata_bp
        app.register_blueprint(metadata_bp, url_prefix='/api/metadata')
        logger.info("✅ Metadata blueprint registered")
        
    except Exception as e:
        logger.error(f"❌ Failed to register blueprints: {e}", exc_info=True)
        raise

def register_error_handlers(app):
    """Register error handlers for the application"""
    
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({'success': False, 'error': 'Bad request', 'message': str(error)}), 400
    
    @app.errorhandler(401)
    def unauthorized(error):
        response = jsonify({'success': False, 'error': 'Unauthorized', 'message': 'Authentication required'})
        # Add CORS headers for OAuth error responses
        origin = request.headers.get('Origin', '')
        if origin and (origin in app.config.get('CORS_ORIGINS', []) or is_oauth_related_origin(origin)):
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response, 401
    
    @app.errorhandler(403)
    def forbidden(error):
        return jsonify({'success': False, 'error': 'Forbidden', 'message': 'Access denied'}), 403
    
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'success': False, 'error': 'Not found', 'message': 'Resource not found'}), 404
    
    @app.errorhandler(429)
    def rate_limit_exceeded(error):
        return jsonify({'success': False, 'error': 'Too many requests', 'message': 'Rate limit exceeded'}), 429
    
    @app.errorhandler(500)
    def internal_error(error):
        logger.error(f"❌ Internal server error: {error}", exc_info=True)
        return jsonify({'success': False, 'error': 'Internal server error', 'message': 'Something went wrong'}), 500
    
    @app.errorhandler(503)
    def service_unavailable(error):
        return jsonify({'success': False, 'error': 'Service unavailable', 'message': 'Service temporarily unavailable'}), 503
    
    @app.errorhandler(504)
    def gateway_timeout(error):
        return jsonify({'success': False, 'error': 'Gateway timeout', 'message': 'Request timed out'}), 504
    
    @app.errorhandler(Exception)
    def unhandled_exception(error):
        logger.error(f"❌ Unhandled exception: {error}", exc_info=True)
        
        if app.config.get('DEBUG'):
            return jsonify({
                'success': False,
                'error': error.__class__.__name__,
                'message': str(error)
            }), 500
        else:
            return jsonify({
                'success': False,
                'error': 'Server error',
                'message': 'An unexpected error occurred'
            }), 500

def register_root_endpoints(app):
    """Register root-level endpoints with immediate health checks"""
    
    @app.route('/')
    def index():
        """Root endpoint - API information"""
        return jsonify({
            'service': 'savlink-backend',
            'version': '3.0.0',
            'status': 'online',
            'timestamp': time.time(),
            'environment': app.config.get('FLASK_ENV', 'production'),
            'message': 'Savlink API is running successfully',
            'port': os.environ.get('PORT', '10000')
        })
    
    @app.route('/ping')
    def ping():
        """Ultra-lightweight ping endpoint"""
        return 'pong', 200, {'Content-Type': 'text/plain'}
    
    @app.route('/health')
    def health_check():
        """Immediate health check for Render"""
        # Return immediately without database checks for port detection
        return jsonify({
            'status': 'healthy',
            'service': 'savlink-backend',
            'version': '3.0.0',
            'timestamp': time.time(),
            'environment': app.config.get('FLASK_ENV', 'production'),
            'port': os.environ.get('PORT', '10000'),
            'message': 'Service is running'
        })
    
    @app.route('/health/full')
    def health_check_full():
        """Comprehensive health check endpoint"""
        start_time = time.time()
        health_status = {
            'status': 'healthy',
            'service': 'savlink-backend',
            'version': '3.0.0',
            'timestamp': time.time(),
            'environment': app.config.get('FLASK_ENV', 'production'),
            'checks': {}
        }
        
        # Check database
        db_health = db_manager.check_health()
        health_status['checks']['database'] = db_health
        
        if not db_health.get('healthy', False):
            health_status['status'] = 'degraded'
        
        # Check Redis if available
        try:
            if redis_client.available:
                redis_start = time.time()
                redis_healthy = redis_client.ping()
                redis_time = (time.time() - redis_start) * 1000
                
                health_status['checks']['redis'] = {
                    'status': 'healthy' if redis_healthy else 'unhealthy',
                    'response_time_ms': round(redis_time, 2)
                }
            else:
                health_status['checks']['redis'] = {'status': 'not_configured'}
        except Exception as e:
            health_status['checks']['redis'] = {'status': 'error', 'error': str(e)}
        
        # Check Firebase
        try:
            from .auth.firebase import _firebase_app
            health_status['checks']['firebase'] = {
                'status': 'healthy' if _firebase_app else 'not_initialized'
            }
        except Exception:
            health_status['checks']['firebase'] = {'status': 'not_configured'}
        
        # Calculate total response time
        total_time = (time.time() - start_time) * 1000
        health_status['response_time_ms'] = round(total_time, 2)
        
        return jsonify(health_status)
    
    @app.route('/ready')
    def readiness_check():
        """Kubernetes readiness probe"""
        try:
            # Quick database check
            db_health = db_manager.check_health()
            
            if db_health.get('healthy', False):
                return jsonify({'ready': True, 'service': 'savlink-backend'}), 200
            else:
                return jsonify({'ready': False, 'service': 'savlink-backend', 'reason': 'database_unhealthy'}), 503
                
        except Exception as e:
            logger.error(f"❌ Readiness check failed: {e}")
            return jsonify({'ready': False, 'service': 'savlink-backend', 'error': str(e)}), 503
    
    @app.route('/db-status')
    def database_status():
        """Detailed database status endpoint"""
        try:
            health = db_manager.check_health()
            connection_info = db_manager.get_connection_info()
            
            return jsonify({
                'database': {
                    'health': health,
                    'connection': connection_info,
                    'timestamp': time.time()
                }
            }), 200 if health.get('healthy', False) else 503
            
        except Exception as e:
            return jsonify({
                'database': {
                    'error': str(e),
                    'timestamp': time.time()
                }
            }), 500
    
    @app.route('/cors-test')
    def cors_test():
        """Test CORS configuration"""
        origin = request.headers.get('Origin', 'none')
        return jsonify({
            'message': 'CORS test successful',
            'origin': origin,
            'oauth_related': is_oauth_related_origin(origin),
            'allowed_origins': len(app.config.get('CORS_ORIGINS', [])),
            'timestamp': time.time()
        })