# server/app/extensions.py
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
import redis
import os
import logging

logger = logging.getLogger(__name__)

db = SQLAlchemy()
migrate = Migrate()

class RedisClient:
    """Wrapper for Redis client with graceful degradation"""
    
    def __init__(self):
        self._client = None
        self._available = False
        self._initialize()
    
    def _initialize(self):
        """Initialize Redis connection if URL provided"""
        redis_url = os.environ.get('REDIS_URL')
        if not redis_url:
            logger.warning("REDIS_URL not configured - Redis features disabled")
            return
        
        try:
            # Support both redis:// and rediss:// (TLS)
            self._client = redis.from_url(
                redis_url,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True,
                health_check_interval=30
            )
            # Test connection
            self._client.ping()
            self._available = True
            logger.info("Redis client initialized successfully")
        except Exception as e:
            logger.warning(f"Redis initialization failed: {e}. Redis features will be disabled.")
            self._client = None
            self._available = False
    
    @property
    def available(self):
        """Check if Redis is available"""
        return self._available and self._client is not None
    
    def execute(self, func, *args, **kwargs):
        """Execute Redis command with error handling"""
        if not self.available:
            return None
        
        try:
            return func(*args, **kwargs)
        except (redis.ConnectionError, redis.TimeoutError) as e:
            logger.warning(f"Redis operation failed: {e}")
            self._available = False
            return None
        except Exception as e:
            logger.error(f"Unexpected Redis error: {e}")
            return None
    
    # Proxy methods for common operations
    def get(self, key):
        return self.execute(self._client.get, key) if self.available else None
    
    def set(self, key, value, ex=None):
        return self.execute(self._client.set, key, value, ex=ex) if self.available else False
    
    def setex(self, key, seconds, value):
        return self.execute(self._client.setex, key, seconds, value) if self.available else False
    
    def delete(self, *keys):
        return self.execute(self._client.delete, *keys) if self.available else 0
    
    def incr(self, key):
        return self.execute(self._client.incr, key) if self.available else None
    
    def expire(self, key, seconds):
        return self.execute(self._client.expire, key, seconds) if self.available else False
    
    def ttl(self, key):
        return self.execute(self._client.ttl, key) if self.available else -2
    
    def exists(self, *keys):
        return self.execute(self._client.exists, *keys) if self.available else 0
    
    def ping(self):
        """Test Redis connectivity"""
        if not self._client:
            return False
        
        try:
            self._client.ping()
            self._available = True
            return True
        except:
            self._available = False
            return False

# Initialize Redis client singleton
redis_client = RedisClient()