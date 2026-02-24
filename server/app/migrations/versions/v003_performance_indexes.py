# server/app/migrations/versions/v003_performance_indexes.py
import logging
from sqlalchemy import text
from app.extensions import db
from app.migrations.manager import Migration

logger = logging.getLogger(__name__)

INDEXES = [
    ("""CREATE INDEX IF NOT EXISTS ix_links_search_gin ON links USING gin (
            to_tsvector('english',
                coalesce(title, '') || ' ' ||
                coalesce(original_url, '') || ' ' ||
                coalesce(notes, '') || ' ' ||
                coalesce(slug, '')
            )
        ) WHERE soft_deleted = false""",
     "GIN full-text search"),

    ("""CREATE INDEX IF NOT EXISTS ix_links_dashboard_all
        ON links (user_id, pinned DESC, starred DESC, updated_at DESC)
        WHERE soft_deleted = false AND archived_at IS NULL""",
     "dashboard all-view"),

    ("""CREATE INDEX IF NOT EXISTS ix_links_dashboard_recent
        ON links (user_id, updated_at DESC)
        WHERE soft_deleted = false AND archived_at IS NULL""",
     "dashboard recent-view"),

    ("""CREATE INDEX IF NOT EXISTS ix_links_user_starred_active
        ON links (user_id, starred)
        WHERE soft_deleted = false AND archived_at IS NULL""",
     "starred partial"),

    ("""CREATE INDEX IF NOT EXISTS ix_links_user_pinned_active
        ON links (user_id, pinned)
        WHERE soft_deleted = false AND archived_at IS NULL""",
     "pinned partial"),

    ("""CREATE INDEX IF NOT EXISTS ix_links_user_frequent_active
        ON links (user_id, frequently_used)
        WHERE soft_deleted = false AND archived_at IS NULL""",
     "frequently-used partial"),

    ("""CREATE INDEX IF NOT EXISTS ix_links_user_type_active
        ON links (user_id, link_type)
        WHERE soft_deleted = false AND archived_at IS NULL""",
     "link-type partial"),

    ("""CREATE INDEX IF NOT EXISTS ix_links_redirect
        ON links (slug)
        WHERE link_type = 'shortened' AND soft_deleted = false""",
     "shortlink redirect"),

    ("""CREATE INDEX IF NOT EXISTS ix_links_trash
        ON links (user_id, soft_deleted, updated_at DESC)
        WHERE soft_deleted = true""",
     "trash listing"),

    ("""CREATE INDEX IF NOT EXISTS ix_links_trash_cleanup
        ON links (soft_deleted, updated_at)
        WHERE soft_deleted = true""",
     "trash cleanup"),

    ("""CREATE INDEX IF NOT EXISTS ix_folders_trash
        ON folders (user_id, soft_deleted, updated_at DESC)
        WHERE soft_deleted = true""",
     "folders trash"),

    ("""CREATE INDEX IF NOT EXISTS ix_folders_tree
        ON folders (user_id, parent_id, position)
        WHERE soft_deleted = false""",
     "folder tree"),

    ("""CREATE INDEX IF NOT EXISTS ix_link_tags_composite
        ON link_tags (user_id, tag_id, link_id)""",
     "tag filtering"),

    ("""CREATE INDEX IF NOT EXISTS ix_links_click_stats
        ON links (user_id, link_type, click_count DESC)
        WHERE soft_deleted = false AND link_type = 'shortened'""",
     "click stats"),

    ("""CREATE INDEX IF NOT EXISTS ix_activity_user_feed
        ON activity_logs (user_id, created_at DESC)""",
     "activity feed"),

    ("""CREATE INDEX IF NOT EXISTS ix_share_active_token
        ON share_links (share_token)
        WHERE is_active = true""",
     "share token lookup"),
]

DROP_LIST = [
    "ix_links_search_gin", "ix_links_dashboard_all", "ix_links_dashboard_recent",
    "ix_links_user_starred_active", "ix_links_user_pinned_active",
    "ix_links_user_frequent_active", "ix_links_user_type_active",
    "ix_links_redirect", "ix_links_trash", "ix_links_trash_cleanup",
    "ix_folders_trash", "ix_folders_tree", "ix_link_tags_composite",
    "ix_links_click_stats", "ix_activity_user_feed", "ix_share_active_token",
]


class PerformanceIndexesMigration(Migration):
    def __init__(self):
        super().__init__(
            version='003_performance_indexes',
            description='Add GIN search, covering dashboard, redirect, trash, and composite indexes'
        )

    def up(self) -> None:
        logger.info("Creating performance indexes")
        created, failed = 0, 0

        for sql, name in INDEXES:
            try:
                db.session.execute(text(sql))
                db.session.commit()
                created += 1
            except Exception as e:
                logger.warning("Failed to create %s: %s", name, e)
                db.session.rollback()
                failed += 1

        logger.info("Performance indexes: %d created, %d failed", created, failed)

    def down(self) -> None:
        for name in DROP_LIST:
            try:
                db.session.execute(text(f"DROP INDEX IF EXISTS {name}"))
            except Exception:
                pass
        db.session.commit()


def register_migration(manager):
    manager.register_migration(PerformanceIndexesMigration())