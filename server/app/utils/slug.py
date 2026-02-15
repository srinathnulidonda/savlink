# server/app/utils/slug.py
import secrets
import string
from app.extensions import db


SLUG_ALPHABET = string.ascii_lowercase + string.digits
SLUG_LENGTH = 7
MAX_GENERATION_ATTEMPTS = 10


def generate_slug(length: int = SLUG_LENGTH) -> str:
    return ''.join(secrets.choice(SLUG_ALPHABET) for _ in range(length))


def generate_unique_slug(length: int = SLUG_LENGTH) -> str:
    from app.models.link import Link

    for _ in range(MAX_GENERATION_ATTEMPTS):
        slug = generate_slug(length)
        exists = db.session.query(
            db.session.query(Link).filter_by(slug=slug).exists()
        ).scalar()

        if not exists:
            return slug

    return generate_slug(length + 2)


def is_slug_available(slug: str) -> bool:
    from app.models.link import Link

    return not db.session.query(
        db.session.query(Link).filter_by(slug=slug).exists()
    ).scalar()