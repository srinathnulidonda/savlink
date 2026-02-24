# server/app/migrations/manager.py
import logging
import time
import threading
from typing import List, Dict, Any
from datetime import datetime
from sqlalchemy import text
from sqlalchemy.exc import OperationalError
from app.extensions import db

logger = logging.getLogger(__name__)


class MigrationError(Exception):
    pass


class Migration:
    def __init__(self, version: str, description: str):
        self.version = version
        self.description = description
        self.timestamp = datetime.utcnow()

    def up(self) -> None:
        raise NotImplementedError

    def down(self) -> None:
        raise NotImplementedError

    def validate(self) -> bool:
        return True


class MigrationManager:
    MIGRATIONS_TABLE = 'schema_migrations'

    def __init__(self):
        self.migrations: List[Migration] = []
        self._lock_acquired = False
        self._lock = threading.Lock()

    def register_migration(self, migration: Migration) -> None:
        self.migrations.append(migration)
        self.migrations.sort(key=lambda m: m.version)

    def run_migrations(self, dry_run: bool = False) -> Dict[str, Any]:
        if not self.migrations:
            return {'status': 'success', 'migrations_run': 0, 'details': []}
        with self._lock:
            return self._execute(dry_run)

    def _ensure_table(self) -> None:
        for attempt in range(3):
            try:
                db.session.execute(text(f"""
                    CREATE TABLE IF NOT EXISTS {self.MIGRATIONS_TABLE} (
                        version VARCHAR(50) PRIMARY KEY,
                        description TEXT NOT NULL,
                        applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        execution_time_ms INTEGER
                    )
                """))
                db.session.commit()
                return
            except OperationalError as e:
                db.session.rollback()
                if attempt < 2:
                    time.sleep(2 ** attempt)
                    continue
                raise MigrationError(f"Cannot create migrations table: {e}")

    def _acquire_lock(self) -> bool:
        try:
            result = db.session.execute(text("SELECT pg_try_advisory_lock(12345)")).scalar()
            if result:
                self._lock_acquired = True
                return True
            time.sleep(5)
            result = db.session.execute(text("SELECT pg_try_advisory_lock(12345)")).scalar()
            if result:
                self._lock_acquired = True
                return True
            return False
        except OperationalError:
            return True

    def _release_lock(self) -> None:
        if self._lock_acquired:
            try:
                db.session.execute(text("SELECT pg_advisory_unlock(12345)"))
                self._lock_acquired = False
            except Exception:
                pass

    def _get_applied(self) -> set:
        try:
            rows = db.session.execute(text(
                f"SELECT version FROM {self.MIGRATIONS_TABLE}"
            )).fetchall()
            return {r[0] for r in rows}
        except Exception:
            return set()

    def _record(self, migration: Migration, ms: int) -> None:
        for attempt in range(3):
            try:
                db.session.execute(text(f"""
                    INSERT INTO {self.MIGRATIONS_TABLE} (version, description, execution_time_ms)
                    VALUES (:v, :d, :t)
                """), {'v': migration.version, 'd': migration.description, 't': ms})
                db.session.commit()
                return
            except Exception:
                db.session.rollback()
                if attempt < 2:
                    time.sleep(1)

    def _execute(self, dry_run: bool) -> Dict[str, Any]:
        results = []
        count = 0

        try:
            if not dry_run:
                if not self._acquire_lock():
                    return {'status': 'error', 'error': 'Could not acquire lock', 'migrations_run': 0}
                self._ensure_table()

            applied = self._get_applied()
            pending = [m for m in self.migrations if m.version not in applied]

            if not pending:
                return {'status': 'success', 'migrations_run': 0, 'details': []}

            logger.info("Found %d pending migrations", len(pending))

            for migration in pending:
                if not migration.validate():
                    results.append({'version': migration.version, 'status': 'skipped'})
                    continue

                logger.info("%sRunning %s: %s",
                            '[DRY RUN] ' if dry_run else '', migration.version, migration.description)

                if dry_run:
                    results.append({'version': migration.version, 'status': 'pending'})
                    continue

                start = time.time()
                success = self._run_single(migration)
                ms = int((time.time() - start) * 1000)

                if success:
                    self._record(migration, ms)
                    count += 1
                    results.append({'version': migration.version, 'status': 'success', 'ms': ms})
                    logger.info("✅ %s completed in %dms", migration.version, ms)
                else:
                    results.append({'version': migration.version, 'status': 'error'})
                    break

            return {'status': 'success', 'migrations_run': count, 'details': results, 'dry_run': dry_run}

        except Exception as e:
            logger.error("Migration process failed: %s", e, exc_info=True)
            return {'status': 'error', 'error': str(e), 'migrations_run': count}
        finally:
            if not dry_run:
                self._release_lock()

    def _run_single(self, migration: Migration) -> bool:
        for attempt in range(3):
            try:
                migration.up()
                db.session.commit()
                return True
            except OperationalError as e:
                db.session.rollback()
                if attempt < 2 and any(k in str(e).lower() for k in ('timeout', 'connection')):
                    time.sleep(2 ** attempt)
                    continue
                logger.error("Migration %s failed: %s", migration.version, e)
                return False
            except Exception as e:
                db.session.rollback()
                logger.error("Migration %s failed: %s", migration.version, e)
                return False
        return False


migration_manager = MigrationManager()