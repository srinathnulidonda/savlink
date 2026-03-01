# server/app/cache/redis_layer.py

import json
import time
import logging
import hashlib
from typing import Any, Optional, List

from app.extensions import redis_client

logger = logging.getLogger(__name__)

_local_cache: dict = {}
_local_ttls: dict = {}
LOCAL_MAX = 200
LOCAL_TTL = 3

# ═══ Stampede lock tracking ═══
_locks: dict = {}
LOCK_TTL = 10


class cache:

    @staticmethod
    def get(key: str) -> Optional[Any]:
        now = time.time()
        if key in _local_cache and _local_ttls.get(key, 0) > now:
            return _local_cache[key]

        if not redis_client.available:
            return None
        try:
            raw = redis_client.get(key)
            if raw is None:
                return None
            data = json.loads(raw)
            _l1_set(key, data)
            return data
        except (json.JSONDecodeError, TypeError):
            return None
        except Exception as e:
            logger.warning("cache.get(%s) error: %s", key, e)
            return None

    @staticmethod
    def put(key: str, data: Any, ttl: int = 300) -> bool:
        _l1_set(key, data)
        if not redis_client.available:
            return False
        try:
            return redis_client.setex(
                key, ttl, json.dumps(data, default=str)
            ) is not False
        except Exception as e:
            logger.warning("cache.put(%s) error: %s", key, e)
            return False

    @staticmethod
    def drop(*keys: str):
        for k in keys:
            _local_cache.pop(k, None)
            _local_ttls.pop(k, None)
        if not redis_client.available:
            return
        try:
            valid = [k for k in keys if k]
            if valid:
                redis_client.delete(*valid)
        except Exception as e:
            logger.warning("cache.drop error: %s", e)

    @staticmethod
    def drop_many(keys: List[str]):
        if keys:
            cache.drop(*keys)

    @staticmethod
    def exists(key: str) -> bool:
        if key in _local_cache and _local_ttls.get(key, 0) > time.time():
            return True
        if not redis_client.available:
            return False
        try:
            return redis_client.exists(key) > 0
        except Exception:
            return False

    @staticmethod
    def get_or_set(key: str, factory, ttl: int = 300):
        data = cache.get(key)
        if data is not None:
            return data
        data = factory()
        if data is not None:
            cache.put(key, data, ttl)
        return data

    @staticmethod
    def get_or_set_locked(key: str, factory, ttl: int = 300):
        """
        Cache stampede protection.
        Only one caller computes; others wait or get stale data.
        """
        data = cache.get(key)
        if data is not None:
            return data

        lock_key = f'lock:{key}'
        now = time.time()

        # Check in-memory lock
        if lock_key in _locks and _locks[lock_key] > now:
            # Someone else is computing — wait briefly then return whatever
            time.sleep(0.1)
            data = cache.get(key)
            return data

        # Acquire lock
        _locks[lock_key] = now + LOCK_TTL

        try:
            data = factory()
            if data is not None:
                cache.put(key, data, ttl)
            return data
        finally:
            _locks.pop(lock_key, None)

    @staticmethod
    def incr_counter(key: str, ttl: int = 86400) -> int:
        if not redis_client.available:
            return 0
        try:
            val = redis_client.incr(key)
            if val == 1:
                redis_client.expire(key, ttl)
            return val or 0
        except Exception:
            return 0

    @staticmethod
    def available() -> bool:
        return redis_client.available


def _l1_set(key: str, data: Any):
    if len(_local_cache) > LOCAL_MAX:
        oldest = sorted(_local_ttls, key=_local_ttls.get)[:LOCAL_MAX // 4]
        for k in oldest:
            _local_cache.pop(k, None)
            _local_ttls.pop(k, None)
    _local_cache[key] = data
    _local_ttls[key] = time.time() + LOCAL_TTL