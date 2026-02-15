# server/app/migrations/versions/v005_add_folder_to_links.py
import logging
from sqlalchemy import text
from app.extensions import db
from app.migrations.manager import Migration

logger = logging.getLogger(__name__)


class AddFolderToLinksMigration(Migration):
    """Add folder_id column to links table"""

    def __init__(self):
        super().__init__(
            version='005_add_folder_to_links',
            description='Add folder_id column to links table for folder organization'
        )

    def validate(self) -> bool:
        """Check if folder_id column already exists"""
        try:
            # Check if links table exists
            links_exists = db.session.execute(text("""
                SELECT COUNT(*)
                FROM information_schema.tables
                WHERE table_name = 'links'
            """)).scalar()
            
            if links_exists == 0:
                logger.warning("links table does not exist - cannot add folder_id")
                return False
            
            # Check if folder_id column already exists
            result = db.session.execute(text("""
                SELECT COUNT(*)
                FROM information_schema.columns
                WHERE table_name = 'links'
                AND column_name = 'folder_id'
            """)).scalar()

            if result > 0:
                logger.info("folder_id column already exists - skipping")
                return False

            return True

        except Exception as e:
            logger.error(f"Migration validation failed: {e}")
            return False

    def up(self) -> None:
        """Add folder_id column to links table"""
        try:
            logger.info("Adding folder_id column to links table")
            
            # Add the column
            db.session.execute(text("""
                ALTER TABLE links 
                ADD COLUMN folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL
            """))
            
            # Add index for folder_id
            db.session.execute(text(
                "CREATE INDEX ix_links_folder_id ON links(folder_id)"
            ))
            
            # Add composite index for user + folder queries
            db.session.execute(text(
                "CREATE INDEX ix_links_user_folder ON links(user_id, folder_id, soft_deleted)"
            ))

            logger.info("folder_id column added successfully with indexes")

        except Exception as e:
            logger.error(f"Failed to add folder_id column: {e}")
            raise

    def down(self) -> None:
        """Remove folder_id column from links table"""
        try:
            logger.info("Removing folder_id column from links table")
            
            # Drop indexes first
            db.session.execute(text("DROP INDEX IF EXISTS ix_links_folder_id"))
            db.session.execute(text("DROP INDEX IF EXISTS ix_links_user_folder"))
            
            # Drop the column
            db.session.execute(text("""
                ALTER TABLE links 
                DROP COLUMN IF EXISTS folder_id
            """))
            
            logger.info("folder_id column removed successfully")
        except Exception as e:
            logger.error(f"Failed to remove folder_id column: {e}")
            raise


def register_migration(manager):
    """Register this migration with the manager"""
    manager.register_migration(AddFolderToLinksMigration())