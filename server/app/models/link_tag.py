# server/app/models/link_tag.py

from datetime import datetime
from app.extensions import db
from sqlalchemy.orm import relationship  # ADD THIS

class LinkTag(db.Model):
    __tablename__ = 'link_tags'
    
    id = db.Column(db.Integer, primary_key=True)
    link_id = db.Column(db.Integer, db.ForeignKey('links.id'), nullable=False)
    tag_id = db.Column(db.Integer, db.ForeignKey('tags.id'), nullable=False)
    user_id = db.Column(db.Text, db.ForeignKey('users.id'), nullable=False, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    
    # ✅ ADD THESE RELATIONSHIPS
    link = db.relationship('Link', backref=db.backref('link_tags', lazy='dynamic', cascade='all, delete-orphan'))
    tag = db.relationship('Tag', backref=db.backref('link_tags', lazy='dynamic', cascade='all, delete-orphan'))
    user = db.relationship('User')
    
    __table_args__ = (
        db.Index('ix_link_tags_user', 'user_id'),
        db.Index('ix_link_tags_link', 'link_id'),
        db.Index('ix_link_tags_tag', 'tag_id'),
        db.UniqueConstraint('link_id', 'tag_id', name='uq_link_tag'),
    )