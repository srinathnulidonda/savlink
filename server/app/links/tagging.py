# server/app/links/tagging.py
from typing import List, Optional
from app.extensions import db
from app.models import Link, Tag, LinkTag
import logging

logger = logging.getLogger(__name__)


def move_to_folder(user_id: str, link_id: int, folder_id: Optional[int]) -> bool:
    link = Link.query.filter_by(
        id=link_id,
        user_id=user_id,
        soft_deleted=False
    ).first()
    
    if not link:
        return False
    
    if folder_id is not None:
        from app.models import Folder
        folder = Folder.query.filter_by(
            id=folder_id,
            user_id=user_id,
            soft_deleted=False
        ).first()
        
        if not folder:
            return False
    
    link.folder_id = folder_id
    db.session.commit()
    return True


def add_tags_to_link(user_id: str, link_id: int, tag_ids: List[int]) -> bool:
    link = Link.query.filter_by(
        id=link_id,
        user_id=user_id,
        soft_deleted=False
    ).first()
    
    if not link:
        return False
    
    tags = Tag.query.filter(
        Tag.id.in_(tag_ids),
        Tag.user_id == user_id
    ).all()
    
    existing_tag_ids = db.session.query(LinkTag.tag_id).filter_by(
        link_id=link_id,
        user_id=user_id
    ).all()
    existing_tag_ids = {t[0] for t in existing_tag_ids}
    
    for tag in tags:
        if tag.id not in existing_tag_ids:
            link_tag = LinkTag(
                link_id=link_id,
                tag_id=tag.id,
                user_id=user_id
            )
            db.session.add(link_tag)
    
    db.session.commit()
    return True


def remove_tags_from_link(user_id: str, link_id: int, tag_ids: List[int]) -> bool:
    link = Link.query.filter_by(
        id=link_id,
        user_id=user_id,
        soft_deleted=False
    ).first()
    
    if not link:
        return False
    
    LinkTag.query.filter(
        LinkTag.link_id == link_id,
        LinkTag.tag_id.in_(tag_ids),
        LinkTag.user_id == user_id
    ).delete(synchronize_session='fetch')
    
    db.session.commit()
    return True


def get_link_tags(link_id: int, user_id: str) -> List[Tag]:
    return Tag.query.join(LinkTag).filter(
        LinkTag.link_id == link_id,
        LinkTag.user_id == user_id
    ).all()