# server/app/cache/invalidation.py

import logging
from app.cache.redis_layer import cache
from app.cache import keys as K

logger = logging.getLogger(__name__)


def on_link_change(user_id: str, link_id: int = None):
    """Call after any link create / update / delete / archive / restore / move."""
    targets = list(K.all_dashboard_keys(user_id)) + [
        K.TAG_COUNTS.format(user_id),
        K.USER_STATS.format(user_id),
    ]
    if link_id:
        targets.append(K.LINK_DETAIL.format(link_id))
    cache.drop_many(targets)


def on_folder_change(user_id: str):
    cache.drop(
        K.FOLDER_TREE.format(user_id),
        K.FOLDER_LIST.format(user_id),
        K.DASH_HOME.format(user_id),
        K.DASH_STATS.format(user_id),
        K.DASH_QUICK.format(user_id),
        K.DASH_OVERVIEW.format(user_id),
        K.USER_STATS.format(user_id),
    )


def on_tag_change(user_id: str):
    cache.drop(
        K.TAG_LIST.format(user_id),
        K.TAG_COUNTS.format(user_id),
        K.DASH_STATS.format(user_id),
        K.USER_STATS.format(user_id),
    )


def on_user_change(user_id: str):
    cache.drop(
        K.USER_PREFS.format(user_id),
        K.USER_STATS.format(user_id),
        K.USER_PROFILE.format(user_id),
    )


def on_bulk_change(user_id: str):
    """Nuclear option — wipe every key for a user."""
    cache.drop_many(K.all_user_keys(user_id))