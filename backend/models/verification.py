from datetime import datetime
from extensions import db


class Verification(db.Model):
    __tablename__ = "verifications"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    recording_id = db.Column(
        db.Integer,
        db.ForeignKey("recordings.id"),
        nullable=False,
        unique=True
    )

    status = db.Column(
        db.String(30),
        nullable=False,
        default="PENDING"
    )

    reviewer_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=True
    )

    reviewer_notes = db.Column(
        db.Text,
        nullable=True
    )

    reviewed_at = db.Column(
        db.DateTime,
        nullable=True
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        nullable=False
    )