# server/app/database.py
import time
import logging
from sqlalchemy import text, event, exc
from sqlalchemy.exc import OperationalError, DatabaseError, DisconnectionError
from sqlalchemy.pool import Pool
import threading
from typing import Dict, Any

logger = logging.getLogger(__name__)

class DatabaseManager:
    """Enhanced database manager with robust connection handling"""
    
    def __init__(self, app=None):
        self.app = app
        self._health_status = {'healthy': False, 'last_check': 0}
        self._initialization_lock = threading.Lock()
        self._initialized = False
        self._pool_events_registered = False
        
    def init_app(self, app):
        """Initialize database with app context"""
        self.app = app
        
        # CRITICAL FIX: Optimized connection pool settings for Supabase
        app.config['SQLALCHEMY_ENGINE_OPTIONS'].update({
            'pool_size': 1,              # Minimal pool size for cold starts
            'max_overflow': 2,           # Small overflow
            'pool_timeout': 60,          # Longer timeout
            'pool_recycle': 300,         # 5 minutes - shorter for hosted DBs
            'pool_pre_ping': False,      # DISABLED - was causing issues
            'pool_reset_on_return': None, # Don't reset connections
            'echo': False,               # Disable SQL logging
            'connect_args': {
                'connect_timeout': 30,
                'application_name': 'savlink_backend',
                'sslmode': 'require',    # Force SSL for Supabase
                'options': '-c statement_timeout=30000'
            }
        })
        
        # Register pool events only once
        self._setup_pool_events()
    
    def _setup_pool_events(self):
        """Set up connection pool event listeners - SIMPLIFIED"""
        if self._pool_events_registered:
            return
            
        from app.extensions import db
        
        @event.listens_for(Pool, "invalidate")
        def receive_invalidate(dbapi_connection, connection_record, exception):
            """Handle connection invalidation"""
            logger.info("Connection invalidated, will create new one")
        
        self._pool_events_registered = True
    
    def initialize_with_retry(self) -> Dict[str, Any]:
        """Initialize database with FIXED connection logic"""
        if self._initialized:
            return {'success': True, 'message': 'Already initialized'}
        
        with self._initialization_lock:
            if self._initialized:
                return {'success': True, 'message': 'Already initialized'}
            
            max_attempts = 8
            base_delay = 3
            max_delay = 30  # Reduced max delay
            
            for attempt in range(1, max_attempts + 1):
                try:
                    logger.info(f"Database initialization attempt {attempt}/{max_attempts}")
                    
                    result = self._attempt_connection(attempt)
                    
                    if result['success']:
                        self._initialized = True
                        self._health_status = {'healthy': True, 'last_check': time.time()}
                        logger.info("✅ Database initialization successful")
                        return result
                    
                except Exception as e:
                    error_msg = str(e)
                    logger.error(f"Database attempt {attempt} failed: {error_msg}")
                    
                    if attempt < max_attempts:
                        delay = min(base_delay * attempt, max_delay)  # Linear backoff
                        logger.info(f"⏳ Retrying in {delay} seconds...")
                        time.sleep(delay)
                        continue
                    else:
                        break
            
            logger.error("❌ Database initialization failed after all attempts")
            return {
                'success': False, 
                'error': 'Database unavailable after multiple attempts',
                'attempts': max_attempts
            }
    
    def _attempt_connection(self, attempt: int) -> Dict[str, Any]:
        """FIXED: Single connection attempt with proper cleanup"""
        from app.extensions import db
        
        start_time = time.time()
        
        with self.app.app_context():
            try:
                # CRITICAL: Dispose of any existing connections first
                if hasattr(db, 'engine') and db.engine:
                    db.engine.dispose()
                    logger.info("Disposed existing database connections")
                
                # Import models to ensure they're registered
                try:
                    from app import models
                except ImportError:
                    logger.warning("Could not import models module")
                
                # Test connection with a fresh engine
                with db.engine.connect() as conn:
                    result = conn.execute(text("SELECT 1 as test")).fetchone()
                    if result[0] != 1:
                        raise Exception("Database test query failed")
                
                logger.info(f"✅ Connection test passed ({time.time() - start_time:.2f}s)")
                
                # Create tables
                db.create_all()
                
                # Verify tables exist
                inspector = db.inspect(db.engine)
                tables = inspector.get_table_names()
                
                required_tables = ['users', 'emergency_tokens', 'links', 'folders', 'tags', 'link_tags']
                missing_tables = set(required_tables) - set(tables)
                
                if missing_tables:
                    logger.warning(f"Missing tables detected: {missing_tables}")
                    db.create_all()
                    
                    # Verify again
                    tables = inspector.get_table_names()
                    still_missing = set(required_tables) - set(tables)
                    
                    if still_missing:
                        raise Exception(f"Failed to create tables: {still_missing}")
                
                elapsed = time.time() - start_time
                logger.info(f"✅ Database tables verified ({elapsed:.2f}s)")
                logger.info(f"📊 Available tables: {', '.join(sorted(tables))}")
                
                return {
                    'success': True,
                    'elapsed_time': elapsed,
                    'tables_count': len(tables),
                    'tables': tables
                }
                
            except Exception as e:
                # Clean up on error
                try:
                    if hasattr(db, 'engine') and db.engine:
                        db.engine.dispose()
                except:
                    pass
                raise
    
    def check_health(self) -> Dict[str, Any]:
        """Quick health check with caching"""
        current_time = time.time()
        
        # Cache health check for 30 seconds
        if (current_time - self._health_status.get('last_check', 0)) < 30:
            return self._health_status
        
        try:
            from app.extensions import db
            
            start_time = time.time()
            with db.engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            
            response_time = (time.time() - start_time) * 1000
            
            self._health_status = {
                'healthy': True,
                'response_time_ms': round(response_time, 2),
                'last_check': current_time,
                'initialized': self._initialized
            }
            
        except Exception as e:
            logger.warning(f"Database health check failed: {e}")
            self._health_status = {
                'healthy': False,
                'error': str(e),
                'last_check': current_time,
                'initialized': self._initialized
            }
        
        return self._health_status
    
    def get_connection_info(self) -> Dict[str, Any]:
        """Get detailed connection information"""
        if not self._initialized:
            return {'status': 'not_initialized'}
        
        try:
            from app.extensions import db
            
            return {
                'status': 'initialized',
                'engine_disposed': db.engine._pool.invalid,
                'url': str(db.engine.url).split('@')[0] + '@****'  # Hide credentials
            }
        except Exception as e:
            return {'status': 'error', 'error': str(e)}

# Global database manager instance
db_manager = DatabaseManager()