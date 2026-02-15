# server/app/models/user.py
from datetime import datetime
from app.extensions import db
from sqlalchemy.exc import OperationalError
import logging

logger = logging.getLogger(__name__)

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Text, primary_key=True)  # Firebase UID
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    name = db.Column(db.String(255))
    avatar_url = db.Column(db.Text)
    auth_provider = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    last_login_at = db.Column(db.DateTime)
    emergency_enabled = db.Column(db.Boolean, default=False, nullable=False)
    
    def to_dict(self):
        """Convert user object to dictionary with safe column access"""
        try:
            # Core user data that should always exist
            data = {
                'id': self.id,
                'email': self.email,
                'name': self.name,
                'avatar_url': self.avatar_url,
                'auth_provider': self.auth_provider or 'password',
                'created_at': self.created_at.isoformat() if self.created_at else None,
                'last_login_at': self.last_login_at.isoformat() if self.last_login_at else None,
            }
            
            # Safely handle emergency_enabled column (might not exist during migration)
            try:
                data['emergency_enabled'] = bool(self.emergency_enabled)
            except (AttributeError, OperationalError) as e:
                # Column doesn't exist yet or other DB issue
                data['emergency_enabled'] = False
                logger.debug(f"emergency_enabled column not accessible for user {self.id}: {e}")
            
            return data
            
        except Exception as e:
            logger.error(f"Error in User.to_dict() for user {getattr(self, 'id', 'unknown')}: {e}")
            # Return minimal safe data to prevent complete failure
            return {
                'id': getattr(self, 'id', None),
                'email': getattr(self, 'email', None),
                'name': getattr(self, 'name', None),
                'avatar_url': getattr(self, 'avatar_url', None),
                'auth_provider': getattr(self, 'auth_provider', 'password'),
                'created_at': None,
                'last_login_at': None,
                'emergency_enabled': False
            }
    
    def __repr__(self):
        return f'<User {self.email}>'