from .manager import migration_manager
from .versions.v001_add_emergency_enabled import register_migration as register_001
from .versions.v002_create_links_table import register_migration as register_002
from .versions.v003_create_folders_table import register_migration as register_003
from .versions.v004_create_tags_tables import register_migration as register_004
from .versions.v005_add_folder_to_links import register_migration as register_005
from .versions.v006_add_link_enhancements import register_migration as register_006
from .versions.v007_add_folder_enhancements import register_migration as register_007

def register_all_migrations():
    """Register all migrations"""
    register_001(migration_manager)
    register_002(migration_manager)
    register_003(migration_manager)
    register_004(migration_manager)
    register_005(migration_manager)
    register_006(migration_manager)  # NEW
    register_007(migration_manager)  # NEW

def run_migrations(dry_run=False):
    """Run all pending migrations"""
    register_all_migrations()
    return migration_manager.run_migrations(dry_run=dry_run)

__all__ = ['migration_manager', 'register_all_migrations', 'run_migrations']