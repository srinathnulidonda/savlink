# server/app/models/activity_log.py

from datetime import datetime
from app.extensions import db
from sqlalchemy.dialects.postgresql import JSONB


class ActivityLog(db.Model):
    __tablename__ = 'activity_logs'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Text, db.ForeignKey('users.id'), nullable=False, index=True)
    action = db.Column(db.String(50), nullable=False, index=True)
    entity_type = db.Column(db.String(20), nullable=False)       # link, folder, tag, user
    entity_id = db.Column(db.Integer, nullable=True)
    details = db.Column(JSONB, default=dict)
    ip_address = db.Column(db.String(45), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)

    user = db.relationship('User', backref=db.backref('activity_logs', lazy='dynamic'))

    __table_args__ = (
        db.Index('ix_activity_user_created', 'user_id', 'created_at'),
        db.Index('ix_activity_user_action', 'user_id', 'action'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'action': self.action,
            'entity_type': self.entity_type,
            'entity_id': self.entity_id,
            'details': self.details or {},
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }