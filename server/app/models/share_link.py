# server/app/models/share_link.py

from datetime import datetime
from app.extensions import db


class ShareLink(db.Model):
    __tablename__ = 'share_links'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Text, db.ForeignKey('users.id'), nullable=False, index=True)
    link_id = db.Column(db.Integer, db.ForeignKey('links.id'), nullable=True, index=True)
    folder_id = db.Column(db.Integer, db.ForeignKey('folders.id'), nullable=True, index=True)
    share_token = db.Column(db.String(64), unique=True, nullable=False, index=True)
    share_type = db.Column(db.String(20), nullable=False, default='link')  # link, folder
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=True)
    expires_at = db.Column(db.DateTime, nullable=True)
    view_count = db.Column(db.Integer, default=0, nullable=False)
    max_views = db.Column(db.Integer, nullable=True)
    allow_copy = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('share_links', lazy='dynamic'))
    link = db.relationship('Link', backref=db.backref('shares', lazy='dynamic'))
    folder = db.relationship('Folder', backref=db.backref('shares', lazy='dynamic'))

    def to_dict(self):
        return {
            'id': self.id,
            'share_token': self.share_token,
            'share_type': self.share_type,
            'link_id': self.link_id,
            'folder_id': self.folder_id,
            'is_active': self.is_active,
            'is_password_protected': bool(self.password_hash),
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'view_count': self.view_count,
            'max_views': self.max_views,
            'allow_copy': self.allow_copy,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }