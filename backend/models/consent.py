from datetime import datetime

from extensions import db


class Consent(db.Model):
    __tablename__ = "consents"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    recording_id = db.Column(
        db.Integer,
        db.ForeignKey("recordings.id"),
        nullable=False
    )

    archive_allowed = db.Column(
        db.Boolean,
        default=False
    )

    transcription_allowed = db.Column(
        db.Boolean,
        default=False
    )

    translation_allowed = db.Column(
        db.Boolean,
        default=False
    )

    research_allowed = db.Column(
        db.Boolean,
        default=False
    )

    public_access_allowed = db.Column(
        db.Boolean,
        default=False
    )

    commercial_use_allowed = db.Column(
        db.Boolean,
        default=False
    )

    ai_processing_allowed = db.Column(
        db.Boolean,
        default=False
    )

    ai_training_allowed = db.Column(
        db.Boolean,
        default=False
    )

    consent_method = db.Column(
        db.String(100)
    )

    consent_date = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )