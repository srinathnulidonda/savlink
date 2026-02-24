# server/app/tags/service.py
from typing import Optional, List, Dict, Any
from app.extensions import db
from app.models import Tag, LinkTag


def serialize_tag(tag: Tag) -> Dict[str, Any]:
    return {'id': tag.id, 'name': tag.name, 'color': tag.color}


def create_tag(user_id: str, data: Dict[str, Any]) -> Optional[Tag]:
    name = data.get('name', '').strip().lower()
    if not name:
        return None
    if Tag.query.filter_by(user_id=user_id, name=name).first():
        return None
    tag = Tag(user_id=user_id, name=name, color=data.get('color'))
    db.session.add(tag)
    db.session.commit()
    return tag


def get_user_tags(user_id: str) -> List[Tag]:
    return Tag.query.filter_by(user_id=user_id).order_by(Tag.name).all()


def get_tags_with_counts(user_id: str) -> List[Dict[str, Any]]:
    rows = db.session.query(Tag, db.func.count(LinkTag.id).label('cnt')).outerjoin(
        LinkTag, db.and_(LinkTag.tag_id == Tag.id, LinkTag.user_id == user_id)
    ).filter(Tag.user_id == user_id).group_by(Tag.id).order_by(Tag.name).all()
    return [{'id': t.id, 'name': t.name, 'color': t.color, 'link_count': c} for t, c in rows]


def update_tag(user_id: str, tag_id: int, data: Dict[str, Any]) -> Optional[Tag]:
    tag = Tag.query.filter_by(id=tag_id, user_id=user_id).first()
    if not tag:
        return None
    if 'name' in data:
        name = data['name'].strip().lower()
        if not name:
            return None
        if Tag.query.filter(Tag.user_id == user_id, Tag.name == name, Tag.id != tag_id).first():
            return None
        tag.name = name
    if 'color' in data:
        tag.color = data['color']
    db.session.commit()
    return tag


def delete_tag(user_id: str, tag_id: int) -> bool:
    tag = Tag.query.filter_by(id=tag_id, user_id=user_id).first()
    if not tag:
        return False
    LinkTag.query.filter_by(tag_id=tag_id, user_id=user_id).delete()
    db.session.delete(tag)
    db.session.commit()
    return True