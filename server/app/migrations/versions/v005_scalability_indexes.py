# server/app/migrations/versions/v005_scalability_indexes.py

import logging
from sqlalchemy import text
from app.extensions import db
from app.migrations.manager import Migration

logger = logging.getLogger(__name__)

INDEXES = [
    ("""CREATE INDEX IF NOT EXISTS ix_links_folder_count
        ON links (user_id, folder_id)
        WHERE soft_deleted = false
          AND archived_at IS NULL
          AND folder_id IS NOT NULL""",
     "batch folder count"),

    ("""CREATE INDEX IF NOT EXISTS ix_links_folder_listing
        ON links (user_id, folder_id, pinned DESC, created_at DESC)
        WHERE soft_deleted = false
          AND archived_at IS NULL""",
     "folder link listing"),

    ("""CREATE INDEX IF NOT EXISTS ix_links_unassigned
        ON links (user_id, pinned DESC, created_at DESC)
        WHERE soft_deleted = false
          AND archived_at IS NULL
          AND folder_id IS NULL""",
     "unassigned links"),

    ("""CREATE INDEX IF NOT EXISTS ix_links_folder_stats
        ON links (folder_id, user_id)
        INCLUDE (archived_at, click_count)
        WHERE soft_deleted = false""",
     "folder stats"),

    ("""CREATE UNIQUE INDEX IF NOT EXISTS ix_folders_slug_unique
        ON folders (user_id, slug)
        WHERE soft_deleted = false
          AND slug IS NOT NULL""",
     "unique folder slug"),

    ("""CREATE INDEX IF NOT EXISTS ix_folders_user_parent_pos
        ON folders (user_id, parent_id, position, created_at)
        WHERE soft_deleted = false""",
     "folder parent position"),

    ("""CREATE INDEX IF NOT EXISTS ix_links_folder_title
        ON links (user_id, folder_id, pinned DESC, title ASC)
        WHERE soft_deleted = false
          AND archived_at IS NULL""",
     "folder links title sort"),

    ("""CREATE INDEX IF NOT EXISTS ix_links_user_stats
        ON links (user_id)
        INCLUDE (archived_at, starred, pinned, folder_id,
                 link_type, frequently_used, click_count, created_at, is_active)
        WHERE soft_deleted = false""",
     "dashboard stats aggregate"),

    ("""CREATE INDEX IF NOT EXISTS ix_link_tags_link_tag
        ON link_tags (link_id, tag_id)""",
     "link-tag pair lookup"),

    ("""CREATE INDEX IF NOT EXISTS ix_activity_cleanup
        ON activity_logs (user_id, created_at)
        WHERE created_at < NOW() - INTERVAL '90 days'""",
     "activity cleanup"),
]

DROP_LIST = [
    "ix_links_folder_count",
    "ix_links_folder_listing",
    "ix_links_unassigned",
    "ix_links_folder_stats",
    "ix_folders_slug_unique",
    "ix_folders_user_parent_pos",
    "ix_links_folder_title",
    "ix_links_user_stats",
    "ix_link_tags_link_tag",
    "ix_activity_cleanup",
]


class ScalabilityIndexesMigration(Migration):
    def __init__(self):
        super().__init__(
            version='005_scalability_indexes',
            description='Add batch count, folder listing, unassigned, '
                        'stats aggregate, and unique slug indexes for 1000+ user scale'
        )

    def validate(self) -> bool:
        try:
            result = db.session.execute(text(
                "SELECT 1 FROM information_schema.tables "
                "WHERE table_name = 'links'"
            )).fetchone()
            return result is not None
        except Exception:
            return True

    def up(self) -> None:
        logger.info("Creating scalability indexes for concurrent load")
        created, skipped, failed = 0, 0, 0

        for sql, name in INDEXES:
            try:
                idx_name = sql.split('IF NOT EXISTS ')[1].split('\n')[0].strip()
                exists = db.session.execute(text(
                    "SELECT 1 FROM pg_indexes WHERE indexname = :n"
                ), {'n': idx_name}).fetchone()

                if exists:
                    logger.info("  ⏭ %s (already exists)", name)
                    skipped += 1
                    continue

                db.session.execute(text(sql))
                db.session.commit()
                created += 1
                logger.info("  ✓ %s", name)
            except Exception as e:
                err_str = str(e).lower()
                if 'already exists' in err_str:
                    skipped += 1
                    logger.info("  ⏭ %s (already exists)", name)
                elif 'include' in err_str and 'syntax' in err_str:
                    fallback = sql.replace('INCLUDE', '-- INCLUDE')
                    try:
                        db.session.execute(text(
                            sql.split('INCLUDE')[0] + sql.split(')')[
                                -1] if 'INCLUDE' in sql else sql
                        ))
                        db.session.commit()
                        created += 1
                        logger.info("  ✓ %s (without INCLUDE)", name)
                    except Exception:
                        failed += 1
                        logger.warning("  ✗ %s: %s", name, e)
                else:
                    failed += 1
                    logger.warning("  ✗ %s: %s", name, e)
                db.session.rollback()

        logger.info(
            "Scalability indexes: %d created, %d skipped, %d failed",
            created, skipped, failed,
        )

    def down(self) -> None:
        logger.info("Dropping scalability indexes")
        for name in DROP_LIST:
            try:
                db.session.execute(text(f"DROP INDEX IF EXISTS {name}"))
            except Exception:
                pass
        db.session.commit()
        logger.info("Scalability indexes dropped")


def register_migration(manager):
    manager.register_migration(ScalabilityIndexesMigration())