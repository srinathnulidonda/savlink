# server/app/migrations/versions/v001_initial_schema.py
import logging
from sqlalchemy import text
from app.extensions import db
from app.migrations.manager import Migration

logger = logging.getLogger(__name__)


class InitialSchemaMigration(Migration):
    def __init__(self):
        super().__init__(
            version='001_initial_schema',
            description='Create users, emergency_tokens, folders, links, tags, link_tags tables'
        )

    def up(self) -> None:
        logger.info("Creating initial schema")

        db.session.execute(text("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email VARCHAR(255) NOT NULL UNIQUE,
                name VARCHAR(255),
                avatar_url TEXT,
                auth_provider VARCHAR(50),
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                last_login_at TIMESTAMP,
                emergency_enabled BOOLEAN NOT NULL DEFAULT FALSE
            )
        """))
        db.session.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_users_email ON users(email)"
        ))

        db.session.execute(text("""
            CREATE TABLE IF NOT EXISTS emergency_tokens (
                id SERIAL PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                token_hash VARCHAR(255) NOT NULL UNIQUE,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                used_at TIMESTAMP,
                ip_address VARCHAR(45)
            )
        """))
        db.session.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_emergency_tokens_user_id ON emergency_tokens(user_id)"
        ))
        db.session.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_emergency_tokens_hash ON emergency_tokens(token_hash)"
        ))

        db.session.execute(text("""
            CREATE TABLE IF NOT EXISTS folders (
                id SERIAL PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                parent_id INTEGER REFERENCES folders(id) ON DELETE SET NULL,
                name VARCHAR(255) NOT NULL,
                color VARCHAR(7),
                icon VARCHAR(50),
                pinned BOOLEAN NOT NULL DEFAULT FALSE,
                position INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                soft_deleted BOOLEAN NOT NULL DEFAULT FALSE,
                deleted_at TIMESTAMP
            )
        """))
        db.session.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_folders_user_id ON folders(user_id)"
        ))
        db.session.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_folders_parent_id ON folders(parent_id)"
        ))
        db.session.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_folders_pinned ON folders(pinned)"
        ))
        db.session.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_folders_soft_deleted ON folders(soft_deleted)"
        ))
        db.session.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_folders_user_active ON folders(user_id, soft_deleted)"
        ))
        db.session.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_folders_parent ON folders(parent_id, user_id, soft_deleted)"
        ))

        self._create_unique_index(
            'uq_user_folder_name',
            'folders(user_id, name, soft_deleted)',
            'WHERE soft_deleted = FALSE'
        )

        db.session.execute(text("""
            CREATE TABLE IF NOT EXISTS links (
                id SERIAL PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL,
                original_url TEXT NOT NULL,
                link_type VARCHAR(20) NOT NULL DEFAULT 'saved',
                slug VARCHAR(255) UNIQUE,
                title VARCHAR(500),
                notes TEXT,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                pinned BOOLEAN NOT NULL DEFAULT FALSE,
                starred BOOLEAN NOT NULL DEFAULT FALSE,
                frequently_used BOOLEAN NOT NULL DEFAULT FALSE,
                pinned_at TIMESTAMP,
                archived_at TIMESTAMP,
                expires_at TIMESTAMP,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                soft_deleted BOOLEAN NOT NULL DEFAULT FALSE,
                deleted_at TIMESTAMP,
                click_count INTEGER NOT NULL DEFAULT 0,
                metadata JSONB DEFAULT '{}'::jsonb,
                password_hash VARCHAR(255)
            )
        """))
        db.session.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_links_user_id ON links(user_id)"
        ))
        db.session.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_links_folder_id ON links(folder_id)"
        ))
        db.session.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_links_link_type ON links(link_type)"
        ))
        db.session.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_links_slug ON links(slug)"
        ))
        db.session.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_links_pinned ON links(pinned)"
        ))
        db.session.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_links_starred ON links(starred)"
        ))
        db.session.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_links_frequently_used ON links(frequently_used)"
        ))
        db.session.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_links_archived_at ON links(archived_at)"
        ))
        db.session.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_links_expires_at ON links(expires_at)"
        ))
        db.session.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_links_created_at ON links(created_at)"
        ))
        db.session.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_links_soft_deleted ON links(soft_deleted)"
        ))
        db.session.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_links_deleted_at ON links(deleted_at)"
        ))
        db.session.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_links_user_active ON links(user_id, soft_deleted, archived_at)"
        ))
        db.session.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_links_slug_active ON links(slug, is_active, soft_deleted)"
        ))
        db.session.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_links_user_created ON links(user_id, created_at, soft_deleted)"
        ))
        db.session.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_links_user_folder ON links(user_id, folder_id, soft_deleted)"
        ))
        db.session.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_links_expires ON links(expires_at, link_type, is_active)"
        ))

        db.session.execute(text("""
            CREATE TABLE IF NOT EXISTS tags (
                id SERIAL PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(100) NOT NULL,
                color VARCHAR(7),
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """))
        db.session.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_tags_user_id ON tags(user_id)"
        ))

        self._create_unique_index('uq_user_tag_name', 'tags(user_id, name)')

        db.session.execute(text("""
            CREATE TABLE IF NOT EXISTS link_tags (
                id SERIAL PRIMARY KEY,
                link_id INTEGER NOT NULL REFERENCES links(id) ON DELETE CASCADE,
                tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """))
        db.session.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_link_tags_user_id ON link_tags(user_id)"
        ))
        db.session.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_link_tags_link_id ON link_tags(link_id)"
        ))
        db.session.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_link_tags_tag_id ON link_tags(tag_id)"
        ))

        self._create_unique_index('uq_link_tag', 'link_tags(link_id, tag_id)')

        db.session.execute(text("""
            CREATE OR REPLACE FUNCTION update_updated_at()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = now();
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql
        """))

        for table in ('links', 'folders'):
            db.session.execute(text(
                f"DROP TRIGGER IF EXISTS trigger_{table}_updated_at ON {table}"
            ))
            db.session.execute(text(f"""
                CREATE TRIGGER trigger_{table}_updated_at
                BEFORE UPDATE ON {table}
                FOR EACH ROW EXECUTE FUNCTION update_updated_at()
            """))

        logger.info("Initial schema created successfully")

    def _create_unique_index(self, name, definition, where=''):
        try:
            exists = db.session.execute(text(
                "SELECT 1 FROM pg_indexes WHERE indexname = :n"
            ), {'n': name}).fetchone()
            if not exists:
                sql = f"CREATE UNIQUE INDEX {name} ON {definition}"
                if where:
                    sql += f" {where}"
                db.session.execute(text(sql))
        except Exception as e:
            logger.warning("Index %s may already exist: %s", name, e)

    def down(self) -> None:
        for table in ('folders', 'links'):
            db.session.execute(text(
                f"DROP TRIGGER IF EXISTS trigger_{table}_updated_at ON {table}"
            ))
        db.session.execute(text("DROP FUNCTION IF EXISTS update_updated_at()"))
        db.session.execute(text("DROP TABLE IF EXISTS link_tags CASCADE"))
        db.session.execute(text("DROP TABLE IF EXISTS tags CASCADE"))
        db.session.execute(text("DROP TABLE IF EXISTS links CASCADE"))
        db.session.execute(text("DROP TABLE IF EXISTS folders CASCADE"))
        db.session.execute(text("DROP TABLE IF EXISTS emergency_tokens CASCADE"))
        db.session.execute(text("DROP TABLE IF EXISTS users CASCADE"))


def register_migration(manager):
    manager.register_migration(InitialSchemaMigration())