# server/app/database.py
import time
import logging
import threading
from sqlalchemy import text

logger = logging.getLogger(__name__)


class DatabaseManager:
    def __init__(self):
        self.app = None
        self._health = {'healthy': False, 'last_check': 0}
        self._lock = threading.Lock()
        self._ready = False

    def init_app(self, app):
        self.app = app

    def initialize_with_retry(self):
        if self._ready:
            return {'success': True, 'message': 'Already initialized'}

        with self._lock:
            if self._ready:
                return {'success': True, 'message': 'Already initialized'}

            from app.extensions import db

            for attempt in range(1, 9):
                try:
                    logger.info("DB init attempt %d/8", attempt)
                    with self.app.app_context():
                        if hasattr(db, 'engine') and db.engine:
                            db.engine.dispose()

                        with db.engine.connect() as conn:
                            conn.execute(text("SELECT 1"))

                        from app import models  # noqa: F401
                        db.create_all()

                        tables = db.inspect(db.engine).get_table_names()
                        self._ready = True
                        self._health = {'healthy': True, 'last_check': time.time()}
                        return {'success': True, 'tables_count': len(tables), 'tables': tables}

                except Exception as e:
                    logger.error("DB attempt %d failed: %s", attempt, e)
                    if attempt < 8:
                        time.sleep(min(3 * attempt, 30))

            return {'success': False, 'error': 'Database unavailable after 8 attempts'}

    def check_health(self):
        now = time.time()
        if now - self._health.get('last_check', 0) < 30:
            return self._health
        try:
            from app.extensions import db
            t = time.time()
            with db.engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            self._health = {'healthy': True, 'response_time_ms': round((time.time() - t) * 1000, 2), 'last_check': now}
        except Exception as e:
            self._health = {'healthy': False, 'error': str(e), 'last_check': now}
        return self._health


db_manager = DatabaseManager()