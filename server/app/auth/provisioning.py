# server/app/auth/provisioning.py
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy.exc import IntegrityError
from app.extensions import db
from app.models import User
import logging

logger = logging.getLogger(__name__)

def provision_user(user_info: Dict[str, Any]) -> User:
    """Provision or update a user from authentication info with enhanced conflict resolution"""
    uid = user_info.get('uid')
    email = user_info.get('email')
    
    logger.info(f"Provisioning user: uid={uid}, email={email}")
    
    if not uid:
        raise ValueError("Missing uid in user info")
    
    # Email might be None for some providers
    if not email:
        logger.warning(f"No email provided for user {uid}")
        email = f"{uid}@savlink.local"  # Fallback email
    
    try:
        # First, check if user exists by Firebase UID
        user = User.query.filter_by(id=uid).first()
        
        if user:
            # User exists with this UID - update their info
            user.last_login_at = datetime.utcnow()
            
            # Update fields if they're provided and user doesn't have them
            if user_info.get('name') and not user.name:
                user.name = user_info.get('name')
            if user_info.get('picture') and not user.avatar_url:
                user.avatar_url = user_info.get('picture')
            
            # Update email if it's different (but handle conflicts)
            if email != user.email:
                # Check if another user has this email
                existing_email_user = User.query.filter_by(email=email).first()
                if existing_email_user and existing_email_user.id != uid:
                    logger.warning(f"Email {email} belongs to different user {existing_email_user.id}. Keeping original email {user.email}")
                else:
                    user.email = email
                    
            logger.info(f"Updated existing user: {uid}")
        else:
            # User doesn't exist with this UID - check if email exists
            existing_email_user = User.query.filter_by(email=email).first()
            
            if existing_email_user:
                # Email exists with different UID - this is a conflict
                logger.warning(f"User with email {email} exists with different UID {existing_email_user.id}. Updating UID to {uid}")
                
                # Update the existing user's UID to the new Firebase UID
                existing_email_user.id = uid
                existing_email_user.last_login_at = datetime.utcnow()
                
                # Update other fields if they're better in the new auth
                if user_info.get('name') and not existing_email_user.name:
                    existing_email_user.name = user_info.get('name')
                if user_info.get('picture') and not existing_email_user.avatar_url:
                    existing_email_user.avatar_url = user_info.get('picture')
                    
                user = existing_email_user
                logger.info(f"Merged existing user {email} with new UID: {uid}")
            else:
                # Completely new user
                user = User(
                    id=uid,
                    email=email,
                    name=user_info.get('name'),
                    avatar_url=user_info.get('picture'),
                    auth_provider=user_info.get('auth_provider', 'password'),
                    created_at=datetime.utcnow(),
                    last_login_at=datetime.utcnow(),
                    emergency_enabled=False
                )
                db.session.add(user)
                logger.info(f"Created new user: {uid}")
        
        # Commit the changes
        db.session.commit()
        return user
        
    except IntegrityError as e:
        # Handle any remaining integrity constraint violations
        db.session.rollback()
        logger.error(f"Integrity error provisioning user {uid}: {e}")
        
        # Try to find the user again after rollback
        user = User.query.filter_by(id=uid).first()
        if not user:
            # Try by email
            user = User.query.filter_by(email=email).first()
            if user:
                # Found by email - update the UID
                try:
                    user.id = uid
                    user.last_login_at = datetime.utcnow()
                    db.session.commit()
                    logger.info(f"Recovered user by email and updated UID: {uid}")
                    return user
                except Exception as recovery_error:
                    db.session.rollback()
                    logger.error(f"Failed to recover user: {recovery_error}")
                    raise ValueError(f"User provisioning failed: {recovery_error}")
        
        if not user:
            raise ValueError(f"User provisioning failed after integrity error: {e}")
        
        return user
        
    except Exception as e:
        logger.error(f"Error provisioning user {uid}: {e}", exc_info=True)
        db.session.rollback()
        raise