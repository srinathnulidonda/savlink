# server/app/migrations/versions/v002_feature_tables.py
import logging
from sqlalchemy import text
from app.extensions import db
from app.migrations.manager import Migration

logger = logging.getLogger(__name__)


class FeatureTablesMigration(Migration):
    def __init__(self):
        super().__init__(
            version='002_feature_tables',
            description='Create activity_logs, share_links, user_preferences tables'
        )

    def up(self) -> None:
        logger.info("Creating feature tables")

        db.session.execute(text("""
            CREATE TABLE IF NOT EXISTS activity_logs (
                id SERIAL PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                action VARCHAR(50) NOT NULL,
                entity_type VARCHAR(20) NOT NULL,
                entity_id INTEGER,
                details JSONB DEFAULT '{}'::jsonb,
                ip_address VARCHAR(45),
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """))
        db.session.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_activity_logs_user_id ON activity_logs(user_id)"
        ))
        db.session.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_activity_logs_action ON activity_logs(action)"
        ))
        db.session.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_activity_logs_created_at ON activity_logs(created_at)"
        ))
        db.session.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_activity_user_created ON activity_logs(user_id, created_at DESC)"
        ))
        db.session.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_activity_user_action ON activity_logs(user_id, action)"
        ))
        db.session.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_activity_user_entity ON activity_logs(user_id, entity_type, created_at DESC)"
        ))

        db.session.execute(text("""
            CREATE TABLE IF NOT EXISTS share_links (
                id SERIAL PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                link_id INTEGER REFERENCES links(id) ON DELETE CASCADE,
                folder_id INTEGER REFERENCES folders(id) ON DELETE CASCADE,
                share_token VARCHAR(64) NOT NULL UNIQUE,
                share_type VARCHAR(20) NOT NULL DEFAULT 'link',
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                password_hash VARCHAR(255),
                expires_at TIMESTAMP,
                view_count INTEGER NOT NULL DEFAULT 0,
                max_views INTEGER,
                allow_copy BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """))
        db.session.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_share_links_user_id ON share_links(user_id)"
        ))
        db.session.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_share_links_link_id ON share_links(link_id)"
        ))
        db.session.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_share_links_folder_id ON share_links(folder_id)"
        ))
        db.session.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_share_links_token ON share_links(share_token)"
        ))

        db.session.execute(text("""
            CREATE TABLE IF NOT EXISTS user_preferences (
                id SERIAL PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
                theme VARCHAR(20) NOT NULL DEFAULT 'system',
                compact_mode BOOLEAN NOT NULL DEFAULT FALSE,
                show_previews BOOLEAN NOT NULL DEFAULT TRUE,
                show_favicons BOOLEAN NOT NULL DEFAULT TRUE,
                default_view VARCHAR(20) NOT NULL DEFAULT 'all',
                links_per_page INTEGER NOT NULL DEFAULT 20,
                default_link_type VARCHAR(20) NOT NULL DEFAULT 'saved',
                auto_fetch_metadata BOOLEAN NOT NULL DEFAULT TRUE,
                timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
                date_format VARCHAR(20) NOT NULL DEFAULT 'relative',
                email_notifications BOOLEAN NOT NULL DEFAULT FALSE,
                expiry_reminders BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """))
        db.session.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_user_preferences_user_id ON user_preferences(user_id)"
        ))

        db.session.execute(text(
            "DROP TRIGGER IF EXISTS trigger_user_preferences_updated_at ON user_preferences"
        ))
        db.session.execute(text("""
            CREATE TRIGGER trigger_user_preferences_updated_at
            BEFORE UPDATE ON user_preferences
            FOR EACH ROW EXECUTE FUNCTION update_updated_at()
        """))

        logger.info("Feature tables created successfully")

    def down(self) -> None:
        db.session.execute(text(
            "DROP TRIGGER IF EXISTS trigger_user_preferences_updated_at ON user_preferences"
        ))
        db.session.execute(text("DROP TABLE IF EXISTS user_preferences CASCADE"))
        db.session.execute(text("DROP TABLE IF EXISTS share_links CASCADE"))
        db.session.execute(text("DROP TABLE IF EXISTS activity_logs CASCADE"))


def register_migration(manager):
    manager.register_migration(FeatureTablesMigration())