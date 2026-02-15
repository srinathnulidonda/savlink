# server/app/models/emergency_token.py
from datetime import datetime
from app.extensions import db

class EmergencyToken(db.Model):
    __tablename__ = 'emergency_tokens'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Text, db.ForeignKey('users.id'), nullable=False, index=True)
    token_hash = db.Column(db.String(255), unique=True, nullable=False, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)
    used_at = db.Column(db.DateTime)
    ip_address = db.Column(db.String(45))
    
    user = db.relationship('User', backref='emergency_tokens')