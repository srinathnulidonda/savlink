# server/app/migrations/versions/v003_create_folders_table.py
import logging
from sqlalchemy import text
from app.extensions import db
from app.migrations.manager import Migration

logger = logging.getLogger(__name__)


class CreateFoldersTableMigration(Migration):
    """Create folders table for organizing links"""

    def __init__(self):
        super().__init__(
            version='003_create_folders_table',
            description='Create folders table for link organization'
        )

    def validate(self) -> bool:
        """Check if folders table already exists"""
        try:
            result = db.session.execute(text("""
                SELECT COUNT(*)
                FROM information_schema.tables
                WHERE table_name = 'folders'
            """)).scalar()

            if result > 0:
                logger.info("folders table already exists - skipping")
                return False

            return True

        except Exception as e:
            logger.error(f"Migration validation failed: {e}")
            return False

    def up(self) -> None:
        """Create the folders table"""
        try:
            logger.info("Creating folders table")

            db.session.execute(text("""
                CREATE TABLE folders (
                    id SERIAL PRIMARY KEY,
                    user_id TEXT NOT NULL REFERENCES users(id),
                    name VARCHAR(255) NOT NULL,
                    color VARCHAR(7),
                    icon VARCHAR(50),
                    position INTEGER NOT NULL DEFAULT 0,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    soft_deleted BOOLEAN NOT NULL DEFAULT FALSE
                )
            """))

            # Create indexes
            db.session.execute(text(
                "CREATE INDEX ix_folders_user_active ON folders(user_id, soft_deleted)"
            ))
            db.session.execute(text(
                "CREATE INDEX ix_folders_user_position ON folders(user_id, position, soft_deleted)"
            ))
            
            # Unique constraint for folder names per user (excluding soft deleted)
            db.session.execute(text("""
                CREATE UNIQUE INDEX uq_user_folder_name 
                ON folders(user_id, name, soft_deleted) 
                WHERE soft_deleted = FALSE
            """))

            logger.info("folders table created successfully with indexes")

        except Exception as e:
            logger.error(f"Failed to create folders table: {e}")
            raise

    def down(self) -> None:
        """Drop the folders table"""
        try:
            logger.info("Dropping folders table")
            db.session.execute(text("DROP TABLE IF EXISTS folders CASCADE"))
            logger.info("folders table dropped successfully")
        except Exception as e:
            logger.error(f"Failed to drop folders table: {e}")
            raise


def register_migration(manager):
    """Register this migration with the manager"""
    manager.register_migration(CreateFoldersTableMigration())