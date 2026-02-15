# server/app/models/tag.py
from datetime import datetime
from app.extensions import db

class Tag(db.Model):
    __tablename__ = 'tags'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Text, db.ForeignKey('users.id'), nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False)
    color = db.Column(db.String(7), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    
    user = db.relationship('User', backref=db.backref('tags', lazy='dynamic'))
    
    __table_args__ = (
        db.Index('ix_tags_user', 'user_id'),
        db.UniqueConstraint('user_id', 'name', name='uq_user_tag_name'),
    )