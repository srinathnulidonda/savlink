# server/app/extensions.py
import os
import time
import logging
import redis as _redis

from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

logger = logging.getLogger(__name__)

db = SQLAlchemy()
migrate = Migrate()


class RedisClient:
    def __init__(self):
        self._client = None
        self._available = False
        self._last_error = None
        self._last_reconnect = 0
        self._initialize()

    def _initialize(self):
        url = os.environ.get('REDIS_URL')
        if not url:
            logger.info("REDIS_URL not set — Redis disabled")
            return
        try:
            kw = dict(decode_responses=True, max_connections=20,
                      socket_connect_timeout=10, socket_timeout=5,
                      retry_on_timeout=True, health_check_interval=30)
            if url.startswith('rediss://'):
                kw['connection_class'] = _redis.connection.SSLConnection
                kw['ssl_cert_reqs'] = None
            pool = _redis.ConnectionPool.from_url(url, **kw)
            self._client = _redis.Redis(connection_pool=pool)
            self._client.ping()
            self._available = True
            logger.info("Redis connected")
        except Exception as e:
            logger.warning("Redis unavailable: %s", e)
            self._available = False
            self._last_error = str(e)

    def _ensure(self):
        if self._available and self._client:
            return True
        if time.time() - self._last_reconnect < 30:
            return False
        self._last_reconnect = time.time()
        self._initialize()
        return self._available

    @property
    def available(self):
        return self._available and self._client is not None

    def _exec(self, op, *a, **kw):
        if not self._ensure():
            return None
        try:
            return op(*a, **kw)
        except _redis.RedisError as e:
            logger.warning("Redis error: %s", e)
            self._available = False
            return None

    def get(self, key):             return self._exec(self._client.get, key) if self.available else None
    def set(self, key, val, **kw):  return self._exec(self._client.set, key, val, **kw) if self.available else False
    def setex(self, key, ttl, val): return self._exec(self._client.setex, key, ttl, val) if self.available else False
    def delete(self, *keys):        return self._exec(self._client.delete, *keys) if self.available else 0
    def incr(self, key):            return self._exec(self._client.incr, key) if self.available else None
    def expire(self, key, s):       return self._exec(self._client.expire, key, s) if self.available else False
    def exists(self, *keys):        return self._exec(self._client.exists, *keys) if self.available else 0

    def ping(self):
        if not self._client:
            return False
        try:
            r = self._client.ping()
            self._available = True
            return r
        except Exception:
            self._available = False
            return False


redis_client = RedisClient()