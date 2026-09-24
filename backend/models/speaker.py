from extensions import db
from models.community import Community


class Speaker(db.Model):
    __tablename__ = "speakers"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    name = db.Column(
        db.String(255),
        nullable=False
    )

    age_group = db.Column(
        db.String(50)
    )

    gender = db.Column(
        db.String(50)
    )

    language = db.Column(
        db.String(100)
    )

    community_id = db.Column(
        db.Integer,
        db.ForeignKey(Community.id),
        nullable=True
    )

    consent_status = db.Column(
        db.String(50),
        default="PENDING"
    )