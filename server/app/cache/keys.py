# server/app/cache/keys.py

# Dashboard
DASH_HOME     = "sl:dash:{}:home"
DASH_STATS    = "sl:dash:{}:stats"
DASH_RECENT   = "sl:dash:{}:recent"
DASH_PINNED   = "sl:dash:{}:pinned"
DASH_STARRED  = "sl:dash:{}:starred"
DASH_QUICK    = "sl:dash:{}:quick"
DASH_OVERVIEW = "sl:dash:{}:overview"
DASH_ACTIVITY = "sl:dash:{}:activity"

# Links
LINK_DETAIL   = "sl:link:{}"              # by link_id
LINK_VIEW     = "sl:links:{}:{}:{}:{}"    # user:view:sort:cursor

# Folders
FOLDER_TREE   = "sl:folders:{}:tree"
FOLDER_LIST   = "sl:folders:{}:list"

# Tags
TAG_LIST      = "sl:tags:{}:list"
TAG_COUNTS    = "sl:tags:{}:counts"

# User
USER_PREFS    = "sl:prefs:{}"
USER_STATS    = "sl:ustats:{}"
USER_PROFILE  = "sl:uprofile:{}"

# TTLs (seconds)
TTL_DASHBOARD = 60
TTL_STATS     = 120
TTL_LIST      = 90
TTL_FOLDERS   = 300
TTL_TAGS      = 300
TTL_USER      = 600
TTL_LINK      = 300
TTL_ACTIVITY  = 45


def all_dashboard_keys(user_id: str) -> list:
    return [
        DASH_HOME.format(user_id),
        DASH_STATS.format(user_id),
        DASH_RECENT.format(user_id),
        DASH_PINNED.format(user_id),
        DASH_STARRED.format(user_id),
        DASH_QUICK.format(user_id),
        DASH_OVERVIEW.format(user_id),
        DASH_ACTIVITY.format(user_id),
    ]


def all_user_keys(user_id: str) -> list:
    return (
        all_dashboard_keys(user_id)
        + [
            FOLDER_TREE.format(user_id),
            FOLDER_LIST.format(user_id),
            TAG_LIST.format(user_id),
            TAG_COUNTS.format(user_id),
            USER_PREFS.format(user_id),
            USER_STATS.format(user_id),
            USER_PROFILE.format(user_id),
        ]
    )