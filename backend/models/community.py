from extensions import db


class Community(db.Model):
    __tablename__ = "communities"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    name = db.Column(
        db.String(255),
        nullable=False
    )

    region = db.Column(
        db.String(255)
    )

    state = db.Column(
        db.String(100)
    )

    district = db.Column(
        db.String(100)
    )

    primary_language = db.Column(
        db.String(100)
    )

    description = db.Column(
        db.Text
    )