# server/app/migrations/versions/001_add_emergency_enabled.py
"""
Migration 001: Add emergency_enabled column to users table
"""

import logging
from sqlalchemy import text
from app.extensions import db
from app.migrations.manager import Migration

logger = logging.getLogger(__name__)

class AddEmergencyEnabledMigration(Migration):
    """Add emergency_enabled column to users table"""
    
    def __init__(self):
        super().__init__(
            version='001_add_emergency_enabled',
            description='Add emergency_enabled column to users table'
        )
    
    def validate(self) -> bool:
        """Validate migration can be applied"""
        try:
            # Check if users table exists
            result = db.session.execute(text("""
                SELECT COUNT(*) 
                FROM information_schema.tables 
                WHERE table_name = 'users'
            """)).scalar()
            
            if result == 0:
                logger.warning("Users table does not exist - will be created")
                return True
            
            # Check if column already exists
            result = db.session.execute(text("""
                SELECT COUNT(*) 
                FROM information_schema.columns 
                WHERE table_name = 'users' 
                AND column_name = 'emergency_enabled'
            """)).scalar()
            
            if result > 0:
                logger.info("emergency_enabled column already exists - skipping")
                return False  # Skip this migration
                
            return True
            
        except Exception as e:
            logger.error(f"Migration validation failed: {e}")
            return False
    
    def up(self) -> None:
        """Apply migration"""
        try:
            # Ensure users table exists first
            from app.models import User, EmergencyToken
            db.create_all()
            
            # Check if column exists (double-check)
            result = db.session.execute(text("""
                SELECT COUNT(*) 
                FROM information_schema.columns 
                WHERE table_name = 'users' 
                AND column_name = 'emergency_enabled'
            """)).scalar()
            
            if result > 0:
                logger.info("emergency_enabled column already exists")
                return
            
            # Add the column
            logger.info("Adding emergency_enabled column to users table")
            db.session.execute(text("""
                ALTER TABLE users 
                ADD COLUMN emergency_enabled BOOLEAN DEFAULT FALSE NOT NULL
            """))
            
            # Update existing users to have emergency_enabled = false
            db.session.execute(text("""
                UPDATE users 
                SET emergency_enabled = FALSE 
                WHERE emergency_enabled IS NULL
            """))
            
            logger.info("emergency_enabled column added successfully")
            
        except Exception as e:
            logger.error(f"Failed to add emergency_enabled column: {e}")
            raise
    
    def down(self) -> None:
        """Rollback migration"""
        try:
            logger.info("Removing emergency_enabled column from users table")
            db.session.execute(text("""
                ALTER TABLE users 
                DROP COLUMN IF EXISTS emergency_enabled
            """))
            logger.info("emergency_enabled column removed successfully")
        except Exception as e:
            logger.error(f"Failed to remove emergency_enabled column: {e}")
            raise

# Register migration function
def register_migration(manager):
    """Register this migration with the manager"""
    manager.register_migration(AddEmergencyEnabledMigration())