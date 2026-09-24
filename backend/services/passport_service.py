import secrets
from models.enrichment import HeritagePassport


def ensure_passport(recording_id, state=None):
    existing = HeritagePassport.query.filter_by(recording_id=recording_id).first()
    if existing:
        return existing
    prefix = (state or "IN").upper().replace(" ", "")[:3] or "IN"
    passport_id = f"PRM-{prefix}-2026-{recording_id:06d}"
    passport = HeritagePassport(
        recording_id=recording_id,
        passport_id=passport_id,
        public_slug=secrets.token_urlsafe(12),
    )
    from extensions import db
    db.session.add(passport)
    db.session.flush()
    return passport
