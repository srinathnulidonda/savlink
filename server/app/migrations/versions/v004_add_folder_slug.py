# server/app/migrations/versions/v004_add_folder_slug.py

import logging
from sqlalchemy import text
from app.extensions import db
from app.migrations.manager import Migration

logger = logging.getLogger(__name__)


class AddFolderSlugMigration(Migration):
    def __init__(self):
        super().__init__(
            version='004_add_folder_slug',
            description='Add slug column to folders table'
        )

    def up(self) -> None:
        logger.info("Adding slug column to folders table")

        # Add the slug column
        db.session.execute(text("""
            ALTER TABLE folders 
            ADD COLUMN IF NOT EXISTS slug VARCHAR(255)
        """))

        # Add individual index for slug column (matches index=True in model)
        db.session.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_folders_slug ON folders(slug)
        """))

        # Add the composite index matching your model
        db.session.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_folders_user_slug 
            ON folders(user_id, slug, soft_deleted)
        """))

        logger.info("Folder slug column added successfully")

    def down(self) -> None:
        logger.info("Removing slug column from folders table")
        
        # Drop the composite index
        db.session.execute(text("DROP INDEX IF EXISTS ix_folders_user_slug"))
        
        # Drop the individual index
        db.session.execute(text("DROP INDEX IF EXISTS ix_folders_slug"))
        
        # Drop the column
        db.session.execute(text("ALTER TABLE folders DROP COLUMN IF EXISTS slug"))

        logger.info("Folder slug column removed successfully")


def register_migration(manager):
    manager.register_migration(AddFolderSlugMigration())