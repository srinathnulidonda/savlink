# server/app/models/link.py
from datetime import datetime
from app.extensions import db
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
import logging

logger = logging.getLogger(__name__)

class Link(db.Model):
    __tablename__ = 'links'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Text, db.ForeignKey('users.id'), nullable=False, index=True)
    folder_id = db.Column(db.Integer, db.ForeignKey('folders.id'), nullable=True, index=True)
    original_url = db.Column(db.Text, nullable=False)
    link_type = db.Column(db.String(20), nullable=False, default='saved', index=True)
    slug = db.Column(db.String(255), unique=True, nullable=True, index=True)
    title = db.Column(db.String(500))
    notes = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    pinned = db.Column(db.Boolean, default=False, nullable=False, index=True)
    starred = db.Column(db.Boolean, default=False, nullable=False, index=True)
    frequently_used = db.Column(db.Boolean, default=False, nullable=False, index=True)
    pinned_at = db.Column(db.DateTime, nullable=True)
    archived_at = db.Column(db.DateTime, nullable=True, index=True)
    expires_at = db.Column(db.DateTime, nullable=True, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    soft_deleted = db.Column(db.Boolean, default=False, nullable=False, index=True)
    click_count = db.Column(db.Integer, default=0, nullable=False)
    metadata_ = db.Column('metadata', JSONB, default=dict)
    
    # ✅ ADD THIS COLUMN
    password_hash = db.Column(db.String(255), nullable=True)

    # Relationships
    user = db.relationship('User', backref=db.backref('links', lazy='dynamic'))
    folder = db.relationship('Folder', backref=db.backref('links', lazy='dynamic'))
    
    tags = relationship(
        'Tag',
        secondary='link_tags',
        lazy='selectin',
        viewonly=True
    )
    
    __table_args__ = (
        db.Index('ix_links_user_active', 'user_id', 'soft_deleted', 'archived_at'),
        db.Index('ix_links_user_pinned', 'user_id', 'pinned', 'soft_deleted'),
        db.Index('ix_links_user_starred', 'user_id', 'starred', 'soft_deleted'),
        db.Index('ix_links_slug_active', 'slug', 'is_active', 'soft_deleted'),
        db.Index('ix_links_user_created', 'user_id', 'created_at', 'soft_deleted'),
        db.Index('ix_links_user_folder', 'user_id', 'folder_id', 'soft_deleted'),
        db.Index('ix_links_expires', 'expires_at', 'link_type', 'is_active'),
    )

    def __repr__(self):
        return f'<Link {self.id} [{self.link_type}] {self.original_url[:50]}>'