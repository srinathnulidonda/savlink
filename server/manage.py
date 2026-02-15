# server/manage.py
import click
from flask.cli import with_appcontext
from app import create_app
from app.migrations import run_migrations, migration_manager, register_all_migrations

app = create_app()


@click.group()
def cli():
    """Savlink management commands"""
    pass


@cli.command()
@click.option('--dry-run', is_flag=True, help='Show what would be migrated without applying')
@with_appcontext
def migrate(dry_run):
    """Run database migrations"""
    register_all_migrations()
    result = migration_manager.run_migrations(dry_run=dry_run)

    if result['status'] == 'success':
        if dry_run:
            click.echo(f"Would apply {len(result['details'])} migrations")
        else:
            click.echo(f"Applied {result['migrations_run']} migrations successfully")

        for detail in result['details']:
            status_color = 'green' if detail['status'] == 'success' else 'red'
            click.echo(f"  {detail['version']}: ", nl=False)
            click.secho(detail['status'], fg=status_color)
    else:
        click.secho(f"Migration failed: {result['error']}", fg='red')


@cli.command()
@with_appcontext
def migration_status():
    """Show migration status"""
    register_all_migrations()
    applied = migration_manager._get_applied_migrations()

    click.echo("Migration Status:")
    for migration in migration_manager.migrations:
        status = "APPLIED" if migration.version in applied else "PENDING"
        status_color = 'green' if status == 'APPLIED' else 'yellow'
        click.echo(f"  {migration.version}: ", nl=False)
        click.secho(status, fg=status_color)
        click.echo(f"    {migration.description}")


@cli.command()
@with_appcontext
def db_status():
    """Show database status"""
    try:
        from app.extensions import db
        from sqlalchemy import text

        db.session.execute(text('SELECT 1'))
        click.secho("✅ Database connection: OK", fg='green')

        inspector = db.inspect(db.engine)
        tables = inspector.get_table_names()
        click.echo(f"📋 Tables: {', '.join(tables)}")

        # Check users table
        if 'users' in tables:
            result = db.session.execute(text('SELECT COUNT(*) FROM users')).scalar()
            click.echo(f"👥 User count: {result}")

            columns = inspector.get_columns('users')
            column_names = [col['name'] for col in columns]
            if 'emergency_enabled' in column_names:
                click.secho("✅ emergency_enabled column: EXISTS", fg='green')
            else:
                click.secho("❌ emergency_enabled column: MISSING", fg='red')
        else:
            click.secho("❌ users table: MISSING", fg='red')

        # Check links table
        if 'links' in tables:
            result = db.session.execute(text('SELECT COUNT(*) FROM links')).scalar()
            click.echo(f"🔗 Link count: {result}")

            columns = inspector.get_columns('links')
            column_names = [col['name'] for col in columns]

            if 'folder_id' in column_names:
                click.secho("✅ folder_id column: EXISTS", fg='green')
            else:
                click.secho("⚠️  folder_id column: MISSING", fg='yellow')

            saved = db.session.execute(
                text("SELECT COUNT(*) FROM links WHERE link_type = 'saved' AND soft_deleted = FALSE")
            ).scalar()
            shortened = db.session.execute(
                text("SELECT COUNT(*) FROM links WHERE link_type = 'shortened' AND soft_deleted = FALSE")
            ).scalar()
            archived = db.session.execute(
                text("SELECT COUNT(*) FROM links WHERE archived_at IS NOT NULL AND soft_deleted = FALSE")
            ).scalar()
            pinned = db.session.execute(
                text("SELECT COUNT(*) FROM links WHERE pinned = TRUE AND soft_deleted = FALSE")
            ).scalar()

            click.echo(f"    Saved: {saved} | Shortened: {shortened} | Archived: {archived} | Pinned: {pinned}")
        else:
            click.secho("❌ links table: MISSING", fg='red')

        # Check folders table
        if 'folders' in tables:
            result = db.session.execute(text('SELECT COUNT(*) FROM folders WHERE soft_deleted = FALSE')).scalar()
            click.echo(f"📁 Folder count: {result}")
        else:
            click.secho("⚠️  folders table: MISSING", fg='yellow')

        # Check tags table
        if 'tags' in tables:
            result = db.session.execute(text('SELECT COUNT(*) FROM tags')).scalar()
            click.echo(f"🏷️  Tag count: {result}")
        else:
            click.secho("⚠️  tags table: MISSING", fg='yellow')

        # Check link_tags table
        if 'link_tags' in tables:
            result = db.session.execute(text('SELECT COUNT(*) FROM link_tags')).scalar()
            click.echo(f"🔗 Link-Tag associations: {result}")
        else:
            click.secho("⚠️  link_tags table: MISSING", fg='yellow')

    except Exception as e:
        click.secho(f"❌ Database error: {e}", fg='red')


if __name__ == '__main__':
    with app.app_context():
        cli()