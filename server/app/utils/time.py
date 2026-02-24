# server/app/utils/time.py
from datetime import datetime, timezone


def relative_time(dt: datetime) -> str:
    if not dt:
        return ''
    now = datetime.utcnow()
    if dt.tzinfo:
        now = now.replace(tzinfo=timezone.utc)
    seconds = int((now - dt).total_seconds())
    if seconds < 60:
        return 'Just now'
    minutes = seconds // 60
    if minutes < 60:
        return f'{minutes}m ago'
    hours = minutes // 60
    if hours < 24:
        return f'{hours}h ago'
    days = hours // 24
    if days == 1:
        return 'Yesterday'
    if days < 7:
        return f'{days}d ago'
    weeks = days // 7
    if weeks < 5:
        return f'{weeks}w ago'
    months = days // 30
    if months < 12:
        return f'{months}mo ago'
    return f'{days // 365}y ago'