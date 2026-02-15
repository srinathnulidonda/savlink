"""
Migration 006: Add enhanced link features (starred, frequently_used, expires_at, password_hash)
"""

import logging
from sqlalchemy import text
from app.extensions import db
from app.migrations.manager import Migration

logger = logging.getLogger(__name__)

class AddLinkEnhancementsMigration(Migration):
    """Add enhanced columns to links table"""
    
    def __init__(self):
        super().__init__(
            version='006_add_link_enhancements',
            description='Add starred, frequently_used, expires_at, and password_hash columns to links table'
        )
    
    def validate(self) -> bool:
        """Check if migration should run"""
        try:
            # Check if links table exists
            result = db.session.execute(text("""
                SELECT COUNT(*) 
                FROM information_schema.tables 
                WHERE table_name = 'links'
            """)).scalar()
            
            if result == 0:
                logger.warning("Links table does not exist - cannot add columns")
                return False
            
            # Check if columns already exist
            existing_columns = db.session.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'links' 
                AND column_name IN ('starred', 'frequently_used', 'expires_at', 'password_hash')
            """)).fetchall()
            
            existing_column_names = {col[0] for col in existing_columns}
            required_columns = {'starred', 'frequently_used', 'expires_at', 'password_hash'}
            
            if required_columns.issubset(existing_column_names):
                logger.info("All link enhancement columns already exist - skipping")
                return False
                
            return True
            
        except Exception as e:
            logger.error(f"Migration validation failed: {e}")
            return False
    
    def up(self) -> None:
        """Apply migration"""
        try:
            logger.info("Adding link enhancement columns")
            
            # Check and add each column individually
            columns_to_add = [
                ('starred', "ALTER TABLE links ADD COLUMN starred BOOLEAN DEFAULT FALSE NOT NULL"),
                ('frequently_used', "ALTER TABLE links ADD COLUMN frequently_used BOOLEAN DEFAULT FALSE NOT NULL"),
                ('expires_at', "ALTER TABLE links ADD COLUMN expires_at TIMESTAMP"),
                ('password_hash', "ALTER TABLE links ADD COLUMN password_hash VARCHAR(64)")
            ]
            
            for col_name, alter_sql in columns_to_add:
                try:
                    # Check if column exists
                    exists = db.session.execute(text("""
                        SELECT COUNT(*) 
                        FROM information_schema.columns 
                        WHERE table_name = 'links' 
                        AND column_name = :col
                    """), {'col': col_name}).scalar()
                    
                    if exists == 0:
                        logger.info(f"Adding {col_name} column")
                        db.session.execute(text(alter_sql))
                        db.session.commit()
                    else:
                        logger.info(f"Column {col_name} already exists")
                        
                except Exception as e:
                    logger.error(f"Failed to add column {col_name}: {e}")
                    db.session.rollback()
                    raise
            
            # Add indexes for new columns
            indexes_to_add = [
                ("CREATE INDEX IF NOT EXISTS ix_links_starred ON links(starred)", "starred index"),
                ("CREATE INDEX IF NOT EXISTS ix_links_frequently_used ON links(frequently_used)", "frequently_used index"),
                ("CREATE INDEX IF NOT EXISTS ix_links_expires_at ON links(expires_at)", "expires_at index"),
                ("CREATE INDEX IF NOT EXISTS ix_links_user_starred ON links(user_id, starred, soft_deleted)", "user starred index"),
                ("CREATE INDEX IF NOT EXISTS ix_links_expires ON links(expires_at, link_type, is_active)", "expiration compound index")
            ]
            
            for index_sql, index_name in indexes_to_add:
                try:
                    logger.info(f"Creating {index_name}")
                    db.session.execute(text(index_sql))
                    db.session.commit()
                except Exception as e:
                    logger.warning(f"Failed to create {index_name}: {e}")
                    db.session.rollback()
                    # Don't fail migration for index creation issues
            
            logger.info("Link enhancement columns added successfully")
            
        except Exception as e:
            logger.error(f"Failed to add link enhancement columns: {e}")
            raise
    
    def down(self) -> None:
        """Rollback migration"""
        try:
            logger.info("Removing link enhancement columns")
            
            # Drop indexes first
            indexes_to_drop = [
                "DROP INDEX IF EXISTS ix_links_starred",
                "DROP INDEX IF EXISTS ix_links_frequently_used", 
                "DROP INDEX IF EXISTS ix_links_expires_at",
                "DROP INDEX IF EXISTS ix_links_user_starred",
                "DROP INDEX IF EXISTS ix_links_expires"
            ]
            
            for index_sql in indexes_to_drop:
                try:
                    db.session.execute(text(index_sql))
                except Exception as e:
                    logger.warning(f"Failed to drop index: {e}")
            
            # Drop columns
            columns_to_drop = ['starred', 'frequently_used', 'expires_at', 'password_hash']
            
            for col_name in columns_to_drop:
                try:
                    db.session.execute(text(f"ALTER TABLE links DROP COLUMN IF EXISTS {col_name}"))
                except Exception as e:
                    logger.warning(f"Failed to drop column {col_name}: {e}")
            
            db.session.commit()
            logger.info("Link enhancement columns removed successfully")
            
        except Exception as e:
            logger.error(f"Failed to remove link enhancement columns: {e}")
            raise

def register_migration(manager):
    """Register this migration with the manager"""
    manager.register_migration(AddLinkEnhancementsMigration())