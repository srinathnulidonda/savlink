# server/app/models/user_preferences.py

from datetime import datetime
from app.extensions import db


class UserPreferences(db.Model):
    __tablename__ = 'user_preferences'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Text, db.ForeignKey('users.id'), unique=True, nullable=False, index=True)

    # Appearance
    theme = db.Column(db.String(20), nullable=False, default='system')           # light, dark, system
    compact_mode = db.Column(db.Boolean, default=False, nullable=False)
    show_previews = db.Column(db.Boolean, default=True, nullable=False)
    show_favicons = db.Column(db.Boolean, default=True, nullable=False)

    # Defaults
    default_view = db.Column(db.String(20), nullable=False, default='all')       # all, recent, starred, pinned
    links_per_page = db.Column(db.Integer, nullable=False, default=20)
    default_link_type = db.Column(db.String(20), nullable=False, default='saved')
    auto_fetch_metadata = db.Column(db.Boolean, default=True, nullable=False)

    # Regional
    timezone = db.Column(db.String(50), nullable=False, default='UTC')
    date_format = db.Column(db.String(20), nullable=False, default='relative')   # relative, absolute, iso

    # Notifications
    email_notifications = db.Column(db.Boolean, default=False, nullable=False)
    expiry_reminders = db.Column(db.Boolean, default=True, nullable=False)

    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('preferences', uselist=False))

    EDITABLE_FIELDS = {
        'theme', 'compact_mode', 'show_previews', 'show_favicons',
        'default_view', 'links_per_page', 'default_link_type',
        'auto_fetch_metadata', 'timezone', 'date_format',
        'email_notifications', 'expiry_reminders',
    }

    BOOL_FIELDS = {
        'compact_mode', 'show_previews', 'show_favicons',
        'auto_fetch_metadata', 'email_notifications', 'expiry_reminders',
    }

    def to_dict(self):
        return {
            'theme': self.theme,
            'compact_mode': self.compact_mode,
            'show_previews': self.show_previews,
            'show_favicons': self.show_favicons,
            'default_view': self.default_view,
            'links_per_page': self.links_per_page,
            'default_link_type': self.default_link_type,
            'auto_fetch_metadata': self.auto_fetch_metadata,
            'timezone': self.timezone,
            'date_format': self.date_format,
            'email_notifications': self.email_notifications,
            'expiry_reminders': self.expiry_reminders,
        }