# server/app/migrations/versions/v004_create_tags_tables.py
import logging
from sqlalchemy import text
from app.extensions import db
from app.migrations.manager import Migration

logger = logging.getLogger(__name__)


class CreateTagsTablesMigration(Migration):
    """Create tags and link_tags tables for tagging system"""

    def __init__(self):
        super().__init__(
            version='004_create_tags_tables',
            description='Create tags and link_tags tables for link tagging'
        )

    def validate(self) -> bool:
        """Check if tags tables already exist"""
        try:
            tags_exists = db.session.execute(text("""
                SELECT COUNT(*)
                FROM information_schema.tables
                WHERE table_name = 'tags'
            """)).scalar()

            link_tags_exists = db.session.execute(text("""
                SELECT COUNT(*)
                FROM information_schema.tables
                WHERE table_name = 'link_tags'
            """)).scalar()

            if tags_exists > 0 and link_tags_exists > 0:
                logger.info("tags and link_tags tables already exist - skipping")
                return False

            return True

        except Exception as e:
            logger.error(f"Migration validation failed: {e}")
            return False

    def up(self) -> None:
        """Create the tags and link_tags tables"""
        try:
            # Create tags table
            logger.info("Creating tags table")
            db.session.execute(text("""
                CREATE TABLE IF NOT EXISTS tags (
                    id SERIAL PRIMARY KEY,
                    user_id TEXT NOT NULL REFERENCES users(id),
                    name VARCHAR(100) NOT NULL,
                    color VARCHAR(7),
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            """))

            # Create indexes for tags
            db.session.execute(text(
                "CREATE INDEX IF NOT EXISTS ix_tags_user ON tags(user_id)"
            ))
            
            # Unique constraint for tag names per user
            db.session.execute(text("""
                CREATE UNIQUE INDEX IF NOT EXISTS uq_user_tag_name 
                ON tags(user_id, name)
            """))

            # Create link_tags junction table
            logger.info("Creating link_tags table")
            db.session.execute(text("""
                CREATE TABLE IF NOT EXISTS link_tags (
                    id SERIAL PRIMARY KEY,
                    link_id INTEGER NOT NULL REFERENCES links(id) ON DELETE CASCADE,
                    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
                    user_id TEXT NOT NULL REFERENCES users(id),
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            """))

            # Create indexes for link_tags
            db.session.execute(text(
                "CREATE INDEX IF NOT EXISTS ix_link_tags_user ON link_tags(user_id)"
            ))
            db.session.execute(text(
                "CREATE INDEX IF NOT EXISTS ix_link_tags_link ON link_tags(link_id)"
            ))
            db.session.execute(text(
                "CREATE INDEX IF NOT EXISTS ix_link_tags_tag ON link_tags(tag_id)"
            ))
            
            # Unique constraint to prevent duplicate tag assignments
            db.session.execute(text("""
                CREATE UNIQUE INDEX IF NOT EXISTS uq_link_tag 
                ON link_tags(link_id, tag_id)
            """))

            logger.info("tags and link_tags tables created successfully with indexes")

        except Exception as e:
            logger.error(f"Failed to create tags tables: {e}")
            raise

    def down(self) -> None:
        """Drop the tags and link_tags tables"""
        try:
            logger.info("Dropping link_tags table")
            db.session.execute(text("DROP TABLE IF EXISTS link_tags CASCADE"))
            
            logger.info("Dropping tags table")
            db.session.execute(text("DROP TABLE IF EXISTS tags CASCADE"))
            
            logger.info("tags and link_tags tables dropped successfully")
        except Exception as e:
            logger.error(f"Failed to drop tags tables: {e}")
            raise


def register_migration(manager):
    """Register this migration with the manager"""
    manager.register_migration(CreateTagsTablesMigration())