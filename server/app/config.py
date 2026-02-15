# server/app/config.py
import os
import json
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)

def build_cors_origins_list(include_dev_origins=False):
    """Build CORS origins list from environment variables"""
    # Get base values
    base_url = os.environ.get('BASE_URL', 'https://savlink.vercel.app')
    firebase_config_json = os.environ.get('FIREBASE_CONFIG_JSON')
    
    cors_origins = [
        # Development
        'http://localhost:5173',
        'http://localhost:3000',
        'http://localhost:5000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5000',
        
        # Production domains
        'https://savlink.vercel.app',
        'https://*.vercel.app',  # All Vercel deployments
        base_url,
        
        # Firebase Auth domains
        'https://savlink-f83ef.firebaseapp.com',
        'https://*.firebaseapp.com',
        'https://firebase.google.com',
        
        # Google OAuth domains
        'https://accounts.google.com',
        'https://oauth2.googleapis.com',
        'https://www.googleapis.com',
        'https://securetoken.google.com',
        'https://identitytoolkit.googleapis.com',
        
        # Additional OAuth providers if needed
        'https://api.github.com',
        'https://github.com'
    ]
    
    # Add development origins if requested
    if include_dev_origins:
        dev_origins = [
            'http://localhost:*',
            'http://127.0.0.1:*',
            'https://*.ngrok.io',
            'https://*.localtunnel.me'
        ]
        cors_origins.extend(dev_origins)
    
    # Parse additional origins from environment
    additional_origins = os.environ.get('ADDITIONAL_CORS_ORIGINS', '')
    if additional_origins:
        try:
            # Split by comma and clean up whitespace
            extra_origins = [origin.strip() for origin in additional_origins.split(',') if origin.strip()]
            cors_origins.extend(extra_origins)
        except Exception as e:
            logger.warning(f"Failed to parse ADDITIONAL_CORS_ORIGINS: {e}")
    
    # Parse Firebase project ID to add specific domains
    if firebase_config_json:
        try:
            config_dict = json.loads(firebase_config_json)
            project_id = config_dict.get('project_id')
            if project_id:
                # Add project-specific Firebase domains
                firebase_domains = [
                    f'https://{project_id}.firebaseapp.com',
                    f'https://{project_id}.web.app',
                    f'https://{project_id}-default-rtdb.firebaseio.com'
                ]
                cors_origins.extend(firebase_domains)
        except (json.JSONDecodeError, KeyError, TypeError) as e:
            logger.warning(f"Failed to parse Firebase config for CORS origins: {e}")
    
    # Remove duplicates while preserving order
    seen = set()
    unique_origins = []
    for origin in cors_origins:
        if origin and origin not in seen:
            seen.add(origin)
            unique_origins.append(origin)
    
    return unique_origins

class Config:
    """Production-optimized configuration for Savlink backend with OAuth support"""
    
    # Security
    SECRET_KEY = os.environ.get('SECRET_KEY') or os.urandom(32).hex()
    
    # Database Configuration - OPTIMIZED FOR SUPABASE
    # CRITICAL FIX: Strip whitespace from DATABASE_URL
    DATABASE_URL = os.environ.get('DATABASE_URL', '').strip()
    SQLALCHEMY_DATABASE_URI = DATABASE_URL
    
    # Fix for SQLAlchemy with newer PostgreSQL URLs
    if SQLALCHEMY_DATABASE_URI and SQLALCHEMY_DATABASE_URI.startswith('postgres://'):
        SQLALCHEMY_DATABASE_URI = SQLALCHEMY_DATABASE_URI.replace('postgres://', 'postgresql://', 1)
    
    # Additional validation to ensure clean URL
    if SQLALCHEMY_DATABASE_URI:
        # Remove any trailing whitespace, newlines, or carriage returns
        SQLALCHEMY_DATABASE_URI = SQLALCHEMY_DATABASE_URI.strip().rstrip('\n').rstrip('\r')
        
        # Log the database host for debugging (without credentials)
        try:
            from urllib.parse import urlparse
            parsed = urlparse(SQLALCHEMY_DATABASE_URI)
            logger.info(f"Database host: {parsed.hostname}, Database name: {parsed.path.lstrip('/')}")
        except Exception:
            pass
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # ENHANCED connection pooling specifically for Supabase
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 1,              # Minimal pool for cold starts  
        'max_overflow': 2,           # Small overflow
        'pool_recycle': 300,         # 5 minutes - shorter for hosted
        'pool_pre_ping': False,      # DISABLED - was causing connection issues
        'pool_timeout': 60,          # Longer timeout
        'pool_reset_on_return': None, # Don't reset connections
        'echo': False,               # Disable SQL logging in production
        'connect_args': {
            'connect_timeout': 30,
            'application_name': 'savlink_backend',
            'sslmode': 'require',    # Force SSL for Supabase
            'options': '-c statement_timeout=30000 -c lock_timeout=10000'
        }
    }
    
    # Connection retry settings
    DATABASE_RETRY_ATTEMPTS = 8
    DATABASE_RETRY_BASE_DELAY = 3
    DATABASE_MAX_DELAY = 60
    
    # Firebase Configuration
    FIREBASE_CONFIG_JSON = os.environ.get('FIREBASE_CONFIG_JSON')
    
    # Application URLs
    BASE_URL = os.environ.get('BASE_URL', 'https://savlink.vercel.app')
    API_URL = os.environ.get('API_URL')
    
    # Short link redirect prefix
    SHORT_LINK_PREFIX = '/r'
    
    # Redis Configuration (Optional)
    REDIS_URL = os.environ.get('REDIS_URL')
    
    # Redis settings for session/cache
    REDIS_OPTIONS = {
        'decode_responses': True,
        'socket_connect_timeout': 10,
        'socket_timeout': 10,
        'retry_on_timeout': True,
        'health_check_interval': 60,
        'max_connections': 20
    } if REDIS_URL else {}
    
    # Email Configuration (Brevo/SendinBlue)
    BREVO_API_KEY = os.environ.get('BREVO_API_KEY')
    EMAIL_FROM_NAME = os.environ.get('EMAIL_FROM_NAME', 'Savlink')
    EMAIL_FROM_ADDRESS = os.environ.get('EMAIL_FROM_ADDRESS', 'noreply@savlink.com')
    USE_BREVO_API = os.environ.get('USE_BREVO_API', 'true').lower() == 'true'
    
    # Emergency Access Configuration
    EMERGENCY_TOKEN_TTL = timedelta(minutes=15)
    EMERGENCY_SESSION_TTL = timedelta(hours=1)
    EMERGENCY_RATE_LIMIT = 3
    EMERGENCY_VERIFY_LIMIT = 10
    
    # Session Configuration
    SESSION_TOKEN_LENGTH = 32
    SESSION_COOKIE_SECURE = os.environ.get('FLASK_ENV') == 'production'
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    
    # Request Configuration - OPTIMIZED FOR COLD STARTS
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024
    REQUEST_TIMEOUT = 60  # Increased for cold starts
    
    # Rate Limiting (if Redis available)
    RATELIMIT_ENABLED = bool(REDIS_URL)
    RATELIMIT_STORAGE_URL = REDIS_URL if REDIS_URL else None
    RATELIMIT_DEFAULT = "100 per hour"
    RATELIMIT_HEADERS_ENABLED = True
    
    # Dashboard defaults
    DASHBOARD_DEFAULT_LIMIT = 20
    DASHBOARD_MAX_LIMIT = 100
    
    # Logging Configuration
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
    LOG_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    
    # Performance Monitoring
    SLOW_REQUEST_THRESHOLD = 15  # Increased for cold starts
    
    # Environment
    FLASK_ENV = os.environ.get('FLASK_ENV', 'production')
    DEBUG = FLASK_ENV == 'development'
    TESTING = FLASK_ENV == 'testing'
    
    # Feature Flags
    ENABLE_METRICS = os.environ.get('ENABLE_METRICS', 'false').lower() == 'true'
    ENABLE_PROFILING = os.environ.get('ENABLE_PROFILING', 'false').lower() == 'true'
    ENABLE_OAUTH_DEBUG = os.environ.get('ENABLE_OAUTH_DEBUG', 'false').lower() == 'true'
    
    # Cold start optimization
    ASYNC_DB_INIT = FLASK_ENV == 'production'
    
    # OAuth-specific configurations
    OAUTH_POPUP_TIMEOUT = 60  # seconds
    OAUTH_REDIRECT_TIMEOUT = 120  # seconds
    OAUTH_STATE_TTL = 300  # 5 minutes
    
    # Build CORS origins (production defaults)
    CORS_ORIGINS = build_cors_origins_list(include_dev_origins=False)
    
    @classmethod
    def init_app(cls, app):
        """Initialize application with configuration"""
        # Ensure CORS origins are set on the app config
        app.config['CORS_ORIGINS'] = cls.CORS_ORIGINS
        
        # Set up logging
        logging.basicConfig(
            level=getattr(logging, cls.LOG_LEVEL),
            format=cls.LOG_FORMAT
        )
        
        if cls.DEBUG or cls.ENABLE_OAUTH_DEBUG:
            app.logger.debug('🔧 Configuration loaded:')
            app.logger.debug(f'  - Database: {bool(cls.SQLALCHEMY_DATABASE_URI)}')
            app.logger.debug(f'  - Redis: {bool(cls.REDIS_URL)}')
            app.logger.debug(f'  - Firebase: {bool(cls.FIREBASE_CONFIG_JSON)}')
            app.logger.debug(f'  - Email: {bool(cls.BREVO_API_KEY)}')
            app.logger.debug(f'  - Base URL: {cls.BASE_URL}')
            app.logger.debug(f'  - Environment: {cls.FLASK_ENV}')
            app.logger.debug(f'  - Async DB Init: {cls.ASYNC_DB_INIT}')
            app.logger.debug(f'  - CORS Origins: {len(cls.CORS_ORIGINS)} configured')
            
            if cls.ENABLE_OAUTH_DEBUG:
                app.logger.debug('🔐 OAuth Debug - CORS Origins:')
                for i, origin in enumerate(cls.CORS_ORIGINS[:10]):  # Show first 10
                    app.logger.debug(f'    - {origin}')
                if len(cls.CORS_ORIGINS) > 10:
                    app.logger.debug(f'    ... and {len(cls.CORS_ORIGINS) - 10} more')

class DevelopmentConfig(Config):
    """Development configuration with enhanced OAuth debugging"""
    DEBUG = True
    FLASK_ENV = 'development'
    LOG_LEVEL = 'DEBUG'
    ENABLE_OAUTH_DEBUG = True
    
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 5,
        'pool_recycle': 3600,
        'pool_pre_ping': True,
        'echo': False
    }
    
    ASYNC_DB_INIT = False  # Sync for development
    
    # Override CORS origins for development (include dev origins)
    CORS_ORIGINS = build_cors_origins_list(include_dev_origins=True)

class ProductionConfig(Config):
    """Production configuration with OAuth optimizations"""
    DEBUG = False
    FLASK_ENV = 'production'
    LOG_LEVEL = 'INFO'
    
    SESSION_COOKIE_SECURE = True
    ASYNC_DB_INIT = True  # Async for production
    
    # Production OAuth settings
    OAUTH_POPUP_TIMEOUT = 30  # Shorter timeout in production
    OAUTH_REDIRECT_TIMEOUT = 60
    
    @classmethod
    def init_app(cls, app):
        # Call parent init_app first
        Config.init_app(app)
        
        # Production logging setup
        import logging
        from logging import StreamHandler
        
        # Console handler for production logs
        console_handler = StreamHandler()
        console_handler.setLevel(logging.INFO)
        formatter = logging.Formatter(cls.LOG_FORMAT)
        console_handler.setFormatter(formatter)
        
        # Remove default handlers and add our own
        app.logger.handlers.clear()
        app.logger.addHandler(console_handler)
        app.logger.setLevel(logging.INFO)
        
        # Log OAuth configuration in production (without sensitive data)
        app.logger.info(f"🔐 OAuth configured with {len(cls.CORS_ORIGINS)} CORS origins")
        app.logger.info(f"🚀 Production mode initialized")
        
        # Validate critical config
        if not cls.SECRET_KEY or cls.SECRET_KEY == 'dev-secret-key':
            app.logger.error("❌ SECRET_KEY not set or using default value!")
            raise ValueError("SECRET_KEY must be set in production")
        
        if not cls.SQLALCHEMY_DATABASE_URI:
            app.logger.error("❌ DATABASE_URL not configured!")
            raise ValueError("DATABASE_URL must be set in production")

class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    FLASK_ENV = 'testing'
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    WTF_CSRF_ENABLED = False
    
    RATELIMIT_ENABLED = False
    ASYNC_DB_INIT = False
    
    # Minimal CORS for testing
    CORS_ORIGINS = ['http://localhost:3000', 'http://localhost:5173']

# Configuration registry
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': ProductionConfig
}

def get_config():
    """Get configuration based on environment"""
    env = os.environ.get('FLASK_ENV', 'production')
    config_class = config.get(env, ProductionConfig)
    
    # Log which config is being used
    print(f"🔧 Using {config_class.__name__} configuration (env: {env})")
    
    return config_class

def validate_config():
    """Validate configuration for production readiness"""
    env = os.environ.get('FLASK_ENV', 'production')
    
    if env == 'production':
        required_vars = [
            'SECRET_KEY',
            'DATABASE_URL',
            'FIREBASE_CONFIG_JSON',
        ]
        
        missing_vars = []
        for var in required_vars:
            if not os.environ.get(var):
                missing_vars.append(var)
        
        if missing_vars:
            raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")
    
    return True

# Validate configuration on import in production
if os.environ.get('FLASK_ENV') == 'production':
    try:
        validate_config()
        print("✅ Configuration validation passed")
    except ValueError as e:
        print(f"❌ Configuration validation failed: {e}")