# server/app/models/folder.py
from datetime import datetime
from app.extensions import db


class Folder(db.Model):
    __tablename__ = 'folders'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Text, db.ForeignKey('users.id'), nullable=False, index=True)
    parent_id = db.Column(db.Integer, db.ForeignKey('folders.id'), nullable=True, index=True)
    name = db.Column(db.String(255), nullable=False)
    color = db.Column(db.String(7), nullable=True)
    icon = db.Column(db.String(50), nullable=True)
    pinned = db.Column(db.Boolean, default=False, nullable=False, index=True)
    position = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    soft_deleted = db.Column(db.Boolean, default=False, nullable=False, index=True)

    user = db.relationship('User', backref=db.backref('folders', lazy='dynamic'))
    parent = db.relationship('Folder', remote_side=[id], backref='children')

    __table_args__ = (
        db.Index('ix_folders_user_active', 'user_id', 'soft_deleted'),
        db.Index('ix_folders_parent', 'parent_id', 'user_id', 'soft_deleted'),
        db.UniqueConstraint('user_id', 'name', 'soft_deleted', name='uq_user_folder_name'),
    )