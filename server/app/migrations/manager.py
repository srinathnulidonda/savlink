# server/app/migrations/manager.py

import logging
import time
from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy import text, create_engine
from sqlalchemy.exc import OperationalError, ProgrammingError
from flask import current_app
from app.extensions import db
import threading

logger = logging.getLogger(__name__)

class MigrationError(Exception):
    """Custom migration error"""
    pass

class Migration:
    """Base migration class"""
    
    def __init__(self, version: str, description: str):
        self.version = version
        self.description = description
        self.timestamp = datetime.utcnow()
    
    def up(self) -> None:
        """Apply migration - override in subclasses"""
        raise NotImplementedError("Migration must implement up() method")
    
    def down(self) -> None:
        """Rollback migration - override in subclasses"""
        raise NotImplementedError("Migration must implement down() method")
    
    def validate(self) -> bool:
        """Validate migration can be applied"""
        return True

class EnhancedMigrationManager:
    """Production-grade migration manager with enhanced error handling"""
    
    MIGRATIONS_TABLE = 'schema_migrations'
    LOCK_TIMEOUT = 300  # 5 minutes
    MAX_RETRY_ATTEMPTS = 5
    
    def __init__(self, app=None):
        self.app = app
        self.migrations: List[Migration] = []
        self._lock_acquired = False
        self._lock = threading.Lock()
    
    def register_migration(self, migration: Migration) -> None:
        """Register a migration"""
        self.migrations.append(migration)
        # Sort by version to ensure order
        self.migrations.sort(key=lambda m: m.version)
    
    def _ensure_migrations_table_with_retry(self) -> None:
        """Ensure migrations tracking table exists with retry logic"""
        max_attempts = 3
        base_delay = 2
        
        for attempt in range(max_attempts):
            try:
                logger.info(f"Creating migrations table (attempt {attempt + 1}/{max_attempts})")
                
                db.session.execute(text(f"""
                    CREATE TABLE IF NOT EXISTS {self.MIGRATIONS_TABLE} (
                        version VARCHAR(50) PRIMARY KEY,
                        description TEXT NOT NULL,
                        applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        execution_time_ms INTEGER,
                        checksum VARCHAR(64)
                    )
                """))
                
                # Test that we can query the table
                db.session.execute(text(f"SELECT COUNT(*) FROM {self.MIGRATIONS_TABLE}"))
                db.session.commit()
                
                logger.info(f"Migrations table {self.MIGRATIONS_TABLE} ensured")
                return
                
            except OperationalError as e:
                error_msg = str(e).lower()
                if any(keyword in error_msg for keyword in ['timeout', 'connection']) and attempt < max_attempts - 1:
                    delay = base_delay * (2 ** attempt)
                    logger.warning(f"Failed to create migrations table (attempt {attempt + 1}), retrying in {delay}s: {e}")
                    db.session.rollback()
                    time.sleep(delay)
                    continue
                else:
                    logger.error(f"Failed to create migrations table: {e}")
                    db.session.rollback()
                    raise MigrationError(f"Cannot create migrations table: {e}")
            except Exception as e:
                logger.error(f"Unexpected error creating migrations table: {e}")
                db.session.rollback()
                raise MigrationError(f"Cannot create migrations table: {e}")
    
    def _acquire_lock_with_fallback(self) -> bool:
        """Acquire migration lock with fallback strategies"""
        try:
            # Try PostgreSQL advisory lock first
            result = db.session.execute(text("""
                SELECT pg_try_advisory_lock(12345)
            """)).scalar()
            
            if result:
                self._lock_acquired = True
                logger.info("Migration lock acquired")
                return True
            else:
                logger.warning("Could not acquire migration lock - another migration may be running")
                
                # Wait a bit and try once more
                time.sleep(5)
                result = db.session.execute(text("""
                    SELECT pg_try_advisory_lock(12345)
                """)).scalar()
                
                if result:
                    self._lock_acquired = True
                    logger.info("Migration lock acquired on second attempt")
                    return True
                else:
                    logger.error("Could not acquire migration lock after retry")
                    return False
                
        except OperationalError as e:
            # Fallback for connection issues or non-PostgreSQL databases
            logger.warning(f"Advisory lock failed: {e}")
            
            # For single-instance deployments or when advisory locks don't work
            if 'timeout' in str(e).lower() or 'connection' in str(e).lower():
                logger.warning("Using fallback locking strategy due to connection issues")
                return True
            
            # For non-PostgreSQL databases, proceed without lock
            logger.warning("Advisory lock not supported, proceeding without lock")
            return True
    
    def _release_lock(self) -> None:
        """Release migration lock"""
        if self._lock_acquired:
            try:
                db.session.execute(text("SELECT pg_advisory_unlock(12345)"))
                self._lock_acquired = False
                logger.info("Migration lock released")
            except Exception as e:
                logger.warning(f"Failed to release lock: {e}")
    
    def _get_applied_migrations(self) -> set:
        """Get list of applied migrations with retry"""
        max_attempts = 3
        
        for attempt in range(max_attempts):
            try:
                result = db.session.execute(text(f"""
                    SELECT version FROM {self.MIGRATIONS_TABLE}
                """)).fetchall()
                return {row[0] for row in result}
            except OperationalError as e:
                if 'does not exist' in str(e) or 'relation' in str(e):
                    # Table doesn't exist yet
                    return set()
                elif attempt < max_attempts - 1:
                    logger.warning(f"Failed to get applied migrations (attempt {attempt + 1}): {e}")
                    time.sleep(1)
                    continue
                else:
                    raise
            except Exception as e:
                if attempt < max_attempts - 1:
                    logger.warning(f"Unexpected error getting migrations (attempt {attempt + 1}): {e}")
                    time.sleep(1)
                    continue
                else:
                    # Table probably doesn't exist yet
                    return set()
        
        return set()
    
    def _record_migration_with_retry(self, migration: Migration, execution_time_ms: int) -> None:
        """Record successful migration with retry"""
        max_attempts = 3
        
        for attempt in range(max_attempts):
            try:
                db.session.execute(text(f"""
                    INSERT INTO {self.MIGRATIONS_TABLE} 
                    (version, description, execution_time_ms)
                    VALUES (:version, :description, :execution_time)
                """), {
                    'version': migration.version,
                    'description': migration.description,
                    'execution_time': execution_time_ms
                })
                db.session.commit()
                logger.info(f"Migration {migration.version} recorded")
                return
                
            except Exception as e:
                logger.error(f"Failed to record migration (attempt {attempt + 1}): {e}")
                db.session.rollback()
                if attempt < max_attempts - 1:
                    time.sleep(1)
                    continue
                else:
                    raise
    
    def run_migrations_with_enhanced_retry(self, dry_run: bool = False) -> Dict[str, Any]:
        """Run pending migrations with enhanced error handling"""
        if not self.migrations:
            logger.info("No migrations registered")
            return {'status': 'success', 'migrations_run': 0, 'details': []}
        
        # Use thread lock for safety
        with self._lock:
            return self._execute_migrations(dry_run)
    
    def _execute_migrations(self, dry_run: bool) -> Dict[str, Any]:
        """Execute migrations with comprehensive error handling"""
        migrations_run = 0
        results = []
        
        try:
            # Acquire lock if not dry run
            if not dry_run and not self._acquire_lock_with_fallback():
                return {
                    'status': 'error',
                    'error': 'Could not acquire migration lock',
                    'migrations_run': 0
                }
            
            # Ensure migrations table exists
            if not dry_run:
                self._ensure_migrations_table_with_retry()
            
            # Get applied migrations
            applied = self._get_applied_migrations()
            pending = [m for m in self.migrations if m.version not in applied]
            
            if not pending:
                logger.info("No pending migrations")
                return {'status': 'success', 'migrations_run': 0, 'details': []}
            
            logger.info(f"Found {len(pending)} pending migrations")
            
            # Execute each migration
            for migration in pending:
                try:
                    logger.info(f"{'[DRY RUN] ' if dry_run else ''}Running migration {migration.version}: {migration.description}")
                    
                    # Validate migration
                    if not migration.validate():
                        logger.info(f"Migration {migration.version} skipped (validation returned False)")
                        results.append({
                            'version': migration.version,
                            'status': 'skipped',
                            'reason': 'validation_failed'
                        })
                        continue
                    
                    start_time = time.time()
                    
                    if not dry_run:
                        # Execute migration with retry
                        success = self._execute_single_migration(migration)
                        
                        if success:
                            execution_time_ms = int((time.time() - start_time) * 1000)
                            self._record_migration_with_retry(migration, execution_time_ms)
                            migrations_run += 1
                            
                            results.append({
                                'version': migration.version,
                                'status': 'success',
                                'execution_time_ms': execution_time_ms
                            })
                            
                            logger.info(f"✅ Migration {migration.version} completed in {execution_time_ms}ms")
                        else:
                            results.append({
                                'version': migration.version,
                                'status': 'error',
                                'error': 'Migration execution failed'
                            })
                            # Stop on first failure
                            break
                    else:
                        results.append({
                            'version': migration.version,
                            'status': 'pending',
                            'description': migration.description
                        })
                        
                except Exception as e:
                    logger.error(f"Migration {migration.version} failed: {e}", exc_info=True)
                    results.append({
                        'version': migration.version,
                        'status': 'error',
                        'error': str(e)
                    })
                    # Stop on first failure
                    break
            
            return {
                'status': 'success',
                'migrations_run': migrations_run,
                'details': results,
                'dry_run': dry_run
            }
            
        except Exception as e:
            logger.error(f"Migration process failed: {e}", exc_info=True)
            return {
                'status': 'error',
                'error': str(e),
                'migrations_run': migrations_run
            }
        
        finally:
            if not dry_run:
                self._release_lock()
    
    def _execute_single_migration(self, migration: Migration) -> bool:
        """Execute a single migration with retry logic"""
        max_attempts = 3
        
        for attempt in range(max_attempts):
            try:
                # Create a new transaction
                migration.up()
                db.session.commit()
                return True
                
            except OperationalError as e:
                error_msg = str(e).lower()
                db.session.rollback()
                
                if any(keyword in error_msg for keyword in ['timeout', 'connection', 'server']) and attempt < max_attempts - 1:
                    delay = 2 ** attempt
                    logger.warning(f"Migration {migration.version} failed (attempt {attempt + 1}), retrying in {delay}s: {e}")
                    time.sleep(delay)
                    continue
                else:
                    logger.error(f"Migration {migration.version} failed permanently: {e}")
                    return False
                    
            except Exception as e:
                db.session.rollback()
                logger.error(f"Migration {migration.version} failed with unexpected error: {e}")
                return False
        
        return False

# Global migration manager instance
migration_manager = EnhancedMigrationManager()

# Keep the old name for backward compatibility  
class MigrationManager(EnhancedMigrationManager):
    pass