# server/app/database.py

import time
import logging
import threading
from sqlalchemy import text, event
from sqlalchemy.exc import OperationalError

logger = logging.getLogger(__name__)


class DatabaseManager:
    def __init__(self):
        self.app = None
        self._health = {'healthy': False, 'last_check': 0}
        self._lock = threading.Lock()
        self._ready = False
        self._pool_stats_interval = 60
        self._last_pool_log = 0

    def init_app(self, app):
        self.app = app
        self._register_engine_events(app)

    def _register_engine_events(self, app):
        with app.app_context():
            from app.extensions import db

            @event.listens_for(db.engine, 'checkout')
            def on_checkout(dbapi_conn, connection_rec, connection_proxy):
                connection_rec.info['checkout_time'] = time.time()

            @event.listens_for(db.engine, 'checkin')
            def on_checkin(dbapi_conn, connection_rec):
                checkout_time = connection_rec.info.get('checkout_time')
                if checkout_time:
                    duration = time.time() - checkout_time
                    if duration > 5:
                        logger.warning("[DB] Connection held for %.1fs", duration)

            @event.listens_for(db.engine, 'connect')
            def on_connect(dbapi_conn, connection_rec):
                self._log_pool_stats_throttled(db.engine)

            @event.listens_for(db.engine, 'invalidate')
            def on_invalidate(dbapi_conn, connection_rec, exception):
                if exception:
                    logger.warning("[DB] Connection invalidated: %s", exception)

    def _log_pool_stats_throttled(self, engine):
        now = time.time()
        if now - self._last_pool_log < self._pool_stats_interval:
            return
        self._last_pool_log = now
        self._log_pool_stats(engine)

    def _log_pool_stats(self, engine):
        try:
            pool = engine.pool
            logger.info(
                "[DB] Pool: size=%d checked_out=%d overflow=%d/%d",
                pool.size(), pool.checkedout(), pool.overflow(), pool._max_overflow,
            )
        except Exception:
            pass

    def initialize_with_retry(self):
        if self._ready:
            return {'success': True, 'message': 'Already initialized'}

        with self._lock:
            if self._ready:
                return {'success': True, 'message': 'Already initialized'}

            from app.extensions import db

            for attempt in range(1, 6):
                try:
                    logger.info("DB init attempt %d/5", attempt)
                    with self.app.app_context():
                        if hasattr(db, 'engine') and db.engine:
                            db.engine.dispose()

                        with db.engine.connect() as conn:
                            conn.execute(text("SELECT 1"))

                        from app import models  # noqa: F401
                        db.create_all()

                        self._run_migrations()

                        tables = db.inspect(db.engine).get_table_names()
                        self._ready = True
                        self._health = {'healthy': True, 'last_check': time.time()}
                        self._log_pool_stats(db.engine)

                        return {
                            'success': True,
                            'tables_count': len(tables),
                            'tables': tables,
                        }

                except OperationalError as e:
                    err = str(e).lower()
                    logger.error("DB attempt %d failed: %s", attempt, e)

                    if 'max clients' in err or 'too many connections' in err:
                        wait = min(10 * attempt, 60)
                        logger.warning("[DB] Connection limit hit — waiting %ds", wait)
                    else:
                        wait = min(3 * attempt, 30)

                    if attempt < 5:
                        time.sleep(wait)

                except Exception as e:
                    logger.error("DB attempt %d failed: %s", attempt, e)
                    if attempt < 5:
                        time.sleep(min(3 * attempt, 30))

            return {'success': False, 'error': 'Database unavailable after 5 attempts'}

    def _run_migrations(self):
        try:
            from app.migrations import run_migrations
            result = run_migrations()
            status = result.get('status', 'unknown')
            count = result.get('migrations_run', 0)

            if count > 0:
                logger.info("Migrations completed: %d applied", count)
                for detail in result.get('details', []):
                    logger.info("  %s: %s (%sms)",
                                detail.get('version'),
                                detail.get('status'),
                                detail.get('ms', '?'))
            elif status == 'success':
                logger.info("No pending migrations")
            else:
                logger.warning("Migration result: %s", result)

        except Exception as e:
            logger.warning("Migrations failed (non-fatal): %s", e)

    def check_health(self):
        now = time.time()
        if now - self._health.get('last_check', 0) < 30:
            return self._health
        try:
            from app.extensions import db
            t = time.time()
            with db.engine.connect() as conn:
                conn.execute(text("SELECT 1"))

            pool = db.engine.pool
            self._health = {
                'healthy': True,
                'response_time_ms': round((time.time() - t) * 1000, 2),
                'last_check': now,
                'pool': {
                    'size': pool.size(),
                    'checked_out': pool.checkedout(),
                    'overflow': pool.overflow(),
                },
            }
        except Exception as e:
            self._health = {'healthy': False, 'error': str(e), 'last_check': now}
        return self._health

    def get_pool_status(self):
        try:
            from app.extensions import db
            pool = db.engine.pool
            return {
                'size': pool.size(),
                'checked_out': pool.checkedout(),
                'overflow': pool.overflow(),
                'max_overflow': pool._max_overflow,
                'checkedin': pool.checkedin(),
            }
        except Exception:
            return {'error': 'Unable to read pool status'}


db_manager = DatabaseManager()