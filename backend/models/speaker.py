from datetime import datetime

from extensions import db
from models.user import User
from models.community import Community
from models.speaker import Speaker


class Recording(db.Model):
    __tablename__ = "recordings"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    title = db.Column(
        db.String(255),
        nullable=False
    )

    description = db.Column(
        db.Text
    )

    audio_filename = db.Column(
        db.String(255),
        nullable=False
    )

    audio_path = db.Column(
        db.String(500),
        nullable=False
    )

    audio_hash = db.Column(
        db.String(64),
        nullable=False,
        unique=True
    )

    language = db.Column(
        db.String(100),
        nullable=False
    )

    language_code = db.Column(
        db.String(32)
    )

    category = db.Column(
        db.String(100)
    )

    state = db.Column(
        db.String(100)
    )

    district = db.Column(
        db.String(100)
    )

    community_name = db.Column(
        db.String(255)
    )

    # Use actual model columns instead of unresolved string
    # foreign-key targets. This guarantees that SQLAlchemy
    # has the referenced tables in its metadata.
    speaker_id = db.Column(
        db.Integer,
        db.ForeignKey(Speaker.id),
        nullable=True
    )

    community_id = db.Column(
        db.Integer,
        db.ForeignKey(Community.id),
        nullable=True
    )

    location = db.Column(
        db.String(255)
    )

    recorded_at = db.Column(
        db.DateTime
    )

    duration = db.Column(
        db.Float
    )

    access_level = db.Column(
        db.String(50),
        default="PRIVATE",
        nullable=False
    )

    created_by = db.Column(
        db.Integer,
        db.ForeignKey(User.id),
        nullable=False
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )