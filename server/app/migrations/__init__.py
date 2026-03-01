# server/app/migrations/__init__.py

from .manager import migration_manager
from .versions.v001_initial_schema import register_migration as register_001
from .versions.v002_feature_tables import register_migration as register_002
from .versions.v003_performance_indexes import register_migration as register_003
from .versions.v004_add_folder_slug import register_migration as register_004
from .versions.v005_scalability_indexes import register_migration as register_005


def register_all_migrations():
    register_001(migration_manager)
    register_002(migration_manager)
    register_003(migration_manager)
    register_004(migration_manager)
    register_005(migration_manager)


def run_migrations(dry_run=False):
    register_all_migrations()
    return migration_manager.run_migrations(dry_run=dry_run)


__all__ = ['migration_manager', 'register_all_migrations', 'run_migrations']