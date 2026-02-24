# server/app/cache/warmup.py

import logging
import threading
from app.cache.redis_layer import cache
from app.cache import keys as K

logger = logging.getLogger(__name__)


def warm_user_cache(user_id: str, background: bool = True):
    """Pre-load hot data right after authentication succeeds."""
    if not cache.available():
        return
    # skip if already warm
    if cache.exists(K.DASH_HOME.format(user_id)):
        return
    if background:
        threading.Thread(target=_warm, args=(user_id,), daemon=True).start()
    else:
        _warm(user_id)


def _warm(user_id: str):
    try:
        from flask import current_app
        with current_app._get_current_object().app_context():
            _do_warm(user_id)
    except RuntimeError:
        _do_warm(user_id)


def _do_warm(user_id: str):
    try:
        from app.dashboard.views import get_home_data, get_stats, get_quick_access
        from app.folders.service import get_folder_tree
        from app.tags.service import get_tags_with_counts

        home = get_home_data(user_id)
        cache.put(K.DASH_HOME.format(user_id), home, K.TTL_DASHBOARD)

        stats = get_stats(user_id)
        cache.put(K.DASH_STATS.format(user_id), stats, K.TTL_STATS)

        qa = get_quick_access(user_id)
        cache.put(K.DASH_QUICK.format(user_id), qa, K.TTL_DASHBOARD)

        tree = get_folder_tree(user_id)
        cache.put(K.FOLDER_TREE.format(user_id), tree, K.TTL_FOLDERS)

        tags = get_tags_with_counts(user_id)
        cache.put(K.TAG_COUNTS.format(user_id), tags, K.TTL_TAGS)

        logger.info("Cache warmed for user %s", user_id[:8])
    except Exception as e:
        logger.warning("Cache warmup failed for %s: %s", user_id[:8], e)