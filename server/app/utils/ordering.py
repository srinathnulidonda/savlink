# server/app/utils/ordering.py
from typing import List
from app.extensions import db


def reorder_positions(model_class, user_id: str, positions: List[dict]):
    items = model_class.query.filter_by(
        user_id=user_id,
        soft_deleted=False
    ).all()
    
    item_map = {item.id: item for item in items}
    
    for pos_data in positions:
        item_id = pos_data.get('id')
        position = pos_data.get('position')
        
        if item_id in item_map and position is not None:
            item_map[item_id].position = position
    
    db.session.commit()
    return True


def get_next_position(model_class, user_id: str) -> int:
    max_pos = db.session.query(db.func.max(model_class.position)).filter_by(
        user_id=user_id,
        soft_deleted=False
    ).scalar()
    
    return (max_pos or 0) + 1