# server/app/utils/slug.py
import secrets
import string

ALPHABET = string.ascii_lowercase + string.digits
DEFAULT_LENGTH = 7
MAX_ATTEMPTS = 10


def generate_slug(length: int = DEFAULT_LENGTH) -> str:
    return ''.join(secrets.choice(ALPHABET) for _ in range(length))


def generate_unique_slug(length: int = DEFAULT_LENGTH) -> str:
    from app.models.link import Link
    from app.extensions import db

    for _ in range(MAX_ATTEMPTS):
        slug = generate_slug(length)
        if not db.session.query(db.session.query(Link).filter_by(slug=slug).exists()).scalar():
            return slug
    return generate_slug(length + 2)


def is_slug_available(slug: str) -> bool:
    from app.models.link import Link
    from app.extensions import db
    return not db.session.query(db.session.query(Link).filter_by(slug=slug).exists()).scalar()