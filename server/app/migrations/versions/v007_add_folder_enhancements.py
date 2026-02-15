"""
Migration 007: Add folder enhancements (parent_id, pinned)
"""

import logging
from sqlalchemy import text
from app.extensions import db
from app.migrations.manager import Migration

logger = logging.getLogger(__name__)

class AddFolderEnhancementsMigration(Migration):
    """Add enhanced columns to folders table"""
    
    def __init__(self):
        super().__init__(
            version='007_add_folder_enhancements', 
            description='Add parent_id and pinned columns to folders table for nesting and quick access'
        )
    
    def validate(self) -> bool:
        """Check if migration should run"""
        try:
            # Check if folders table exists
            result = db.session.execute(text("""
                SELECT COUNT(*) 
                FROM information_schema.tables 
                WHERE table_name = 'folders'
            """)).scalar()
            
            if result == 0:
                logger.warning("Folders table does not exist - cannot add columns")
                return False
            
            # Check if columns already exist
            existing_columns = db.session.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'folders' 
                AND column_name IN ('parent_id', 'pinned')
            """)).fetchall()
            
            existing_column_names = {col[0] for col in existing_columns}
            required_columns = {'parent_id', 'pinned'}
            
            if required_columns.issubset(existing_column_names):
                logger.info("All folder enhancement columns already exist - skipping")
                return False
                
            return True
            
        except Exception as e:
            logger.error(f"Migration validation failed: {e}")
            return False
    
    def up(self) -> None:
        """Apply migration"""
        try:
            logger.info("Adding folder enhancement columns")
            
            # Add parent_id column
            try:
                exists = db.session.execute(text("""
                    SELECT COUNT(*) 
                    FROM information_schema.columns 
                    WHERE table_name = 'folders' 
                    AND column_name = 'parent_id'
                """)).scalar()
                
                if exists == 0:
                    logger.info("Adding parent_id column")
                    db.session.execute(text("""
                        ALTER TABLE folders 
                        ADD COLUMN parent_id INTEGER REFERENCES folders(id) ON DELETE SET NULL
                    """))
                    db.session.commit()
                else:
                    logger.info("parent_id column already exists")
                    
            except Exception as e:
                logger.error(f"Failed to add parent_id column: {e}")
                db.session.rollback()
                raise
            
            # Add pinned column
            try:
                exists = db.session.execute(text("""
                    SELECT COUNT(*) 
                    FROM information_schema.columns 
                    WHERE table_name = 'folders' 
                    AND column_name = 'pinned'
                """)).scalar()
                
                if exists == 0:
                    logger.info("Adding pinned column")
                    db.session.execute(text("""
                        ALTER TABLE folders 
                        ADD COLUMN pinned BOOLEAN DEFAULT FALSE NOT NULL
                    """))
                    db.session.commit()
                else:
                    logger.info("pinned column already exists")
                    
            except Exception as e:
                logger.error(f"Failed to add pinned column: {e}")
                db.session.rollback()
                raise
            
            # Add indexes
            indexes_to_add = [
                ("CREATE INDEX IF NOT EXISTS ix_folders_parent ON folders(parent_id, user_id, soft_deleted)", "parent folder index"),
                ("CREATE INDEX IF NOT EXISTS ix_folders_user_pinned ON folders(user_id, pinned, soft_deleted)", "user pinned folders index"),
                ("CREATE INDEX IF NOT EXISTS ix_folders_pinned ON folders(pinned)", "pinned folders index")
            ]
            
            for index_sql, index_name in indexes_to_add:
                try:
                    logger.info(f"Creating {index_name}")
                    db.session.execute(text(index_sql))
                    db.session.commit()
                except Exception as e:
                    logger.warning(f"Failed to create {index_name}: {e}")
                    db.session.rollback()
                    # Don't fail migration for index issues
            
            logger.info("Folder enhancement columns added successfully")
            
        except Exception as e:
            logger.error(f"Failed to add folder enhancement columns: {e}")
            raise
    
    def down(self) -> None:
        """Rollback migration"""
        try:
            logger.info("Removing folder enhancement columns")
            
            # Drop indexes first
            indexes_to_drop = [
                "DROP INDEX IF EXISTS ix_folders_parent",
                "DROP INDEX IF EXISTS ix_folders_user_pinned",
                "DROP INDEX IF EXISTS ix_folders_pinned"
            ]
            
            for index_sql in indexes_to_drop:
                try:
                    db.session.execute(text(index_sql))
                except Exception as e:
                    logger.warning(f"Failed to drop index: {e}")
            
            # Drop columns
            columns_to_drop = ['parent_id', 'pinned']
            
            for col_name in columns_to_drop:
                try:
                    db.session.execute(text(f"ALTER TABLE folders DROP COLUMN IF EXISTS {col_name}"))
                except Exception as e:
                    logger.warning(f"Failed to drop column {col_name}: {e}")
            
            db.session.commit()
            logger.info("Folder enhancement columns removed successfully")
            
        except Exception as e:
            logger.error(f"Failed to remove folder enhancement columns: {e}")
            raise

def register_migration(manager):
    """Register this migration with the manager"""
    manager.register_migration(AddFolderEnhancementsMigration())