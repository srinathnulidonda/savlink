# server/app/migrations/versions/v002_create_links_table.py

import logging
from sqlalchemy import text
from app.extensions import db
from app.migrations.manager import Migration

logger = logging.getLogger(__name__)


class CreateLinksTableMigration(Migration):
    """Create links table with all Phase 2 columns"""

    def __init__(self):
        super().__init__(
            version='002_create_links_table',
            description='Create links table for saved and shortened links'
        )

    def validate(self) -> bool:
        """Check if links table already exists"""
        try:
            result = db.session.execute(text("""
                SELECT COUNT(*)
                FROM information_schema.tables
                WHERE table_name = 'links'
            """)).scalar()

            if result > 0:
                logger.info("links table already exists - verifying columns")
                self._ensure_columns()
                return False

            return True

        except Exception as e:
            logger.error(f"Migration validation failed: {e}")
            return False

    def _ensure_columns(self):
        """Ensure all required columns exist on an existing links table"""
        required_columns = {
            'click_count': "ALTER TABLE links ADD COLUMN click_count INTEGER DEFAULT 0 NOT NULL",
            'metadata': "ALTER TABLE links ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb",
            'pinned_at': "ALTER TABLE links ADD COLUMN pinned_at TIMESTAMP",
            'archived_at': "ALTER TABLE links ADD COLUMN archived_at TIMESTAMP",
            'soft_deleted': "ALTER TABLE links ADD COLUMN soft_deleted BOOLEAN DEFAULT FALSE NOT NULL",
            'notes': "ALTER TABLE links ADD COLUMN notes TEXT",
            'link_type': "ALTER TABLE links ADD COLUMN link_type VARCHAR(20) DEFAULT 'saved' NOT NULL",
            'slug': "ALTER TABLE links ADD COLUMN slug VARCHAR(255) UNIQUE",
            'pinned': "ALTER TABLE links ADD COLUMN pinned BOOLEAN DEFAULT FALSE NOT NULL",
            'is_active': "ALTER TABLE links ADD COLUMN is_active BOOLEAN DEFAULT TRUE NOT NULL",
            'updated_at': "ALTER TABLE links ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL",
        }

        for col_name, alter_sql in required_columns.items():
            try:
                exists = db.session.execute(text("""
                    SELECT COUNT(*)
                    FROM information_schema.columns
                    WHERE table_name = 'links'
                    AND column_name = :col
                """), {'col': col_name}).scalar()

                if exists == 0:
                    logger.info(f"Adding missing column: {col_name}")
                    db.session.execute(text(alter_sql))
                    db.session.commit()

            except Exception as e:
                logger.warning(f"Could not add column {col_name}: {e}")
                db.session.rollback()

    def up(self) -> None:
        """Create the links table"""
        try:
            logger.info("Creating links table")

            db.session.execute(text("""
                CREATE TABLE links (
                    id SERIAL PRIMARY KEY,
                    user_id TEXT NOT NULL REFERENCES users(id),
                    original_url TEXT NOT NULL,
                    link_type VARCHAR(20) NOT NULL DEFAULT 'saved',
                    slug VARCHAR(255) UNIQUE,
                    title VARCHAR(500),
                    notes TEXT,
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    pinned BOOLEAN NOT NULL DEFAULT FALSE,
                    pinned_at TIMESTAMP,
                    archived_at TIMESTAMP,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    soft_deleted BOOLEAN NOT NULL DEFAULT FALSE,
                    click_count INTEGER NOT NULL DEFAULT 0,
                    metadata JSONB DEFAULT '{}'::jsonb
                )
            """))

            # Create indexes
            db.session.execute(text(
                "CREATE INDEX ix_links_user_id ON links(user_id)"
            ))
            db.session.execute(text(
                "CREATE INDEX ix_links_link_type ON links(link_type)"
            ))
            db.session.execute(text(
                "CREATE INDEX ix_links_slug ON links(slug)"
            ))
            db.session.execute(text(
                "CREATE INDEX ix_links_pinned ON links(pinned)"
            ))
            db.session.execute(text(
                "CREATE INDEX ix_links_created_at ON links(created_at)"
            ))
            db.session.execute(text(
                "CREATE INDEX ix_links_soft_deleted ON links(soft_deleted)"
            ))
            db.session.execute(text(
                "CREATE INDEX ix_links_archived_at ON links(archived_at)"
            ))
            db.session.execute(text(
                "CREATE INDEX ix_links_user_active ON links(user_id, soft_deleted, archived_at)"
            ))
            db.session.execute(text(
                "CREATE INDEX ix_links_user_pinned ON links(user_id, pinned, soft_deleted)"
            ))
            db.session.execute(text(
                "CREATE INDEX ix_links_slug_active ON links(slug, is_active, soft_deleted)"
            ))
            db.session.execute(text(
                "CREATE INDEX ix_links_user_created ON links(user_id, created_at, soft_deleted)"
            ))

            logger.info("links table created successfully with all indexes")

        except Exception as e:
            logger.error(f"Failed to create links table: {e}")
            raise

    def down(self) -> None:
        """Drop the links table"""
        try:
            logger.info("Dropping links table")
            db.session.execute(text("DROP TABLE IF EXISTS links CASCADE"))
            logger.info("links table dropped successfully")
        except Exception as e:
            logger.error(f"Failed to drop links table: {e}")
            raise


def register_migration(manager):
    """Register this migration with the manager"""
    manager.register_migration(CreateLinksTableMigration())