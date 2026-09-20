from extensions import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    firebase_uid = db.Column(
        db.String(255),
        unique=True,
        nullable=True
    )

    name = db.Column(
        db.String(255)
    )

    email = db.Column(
        db.String(255),
        unique=True
    )

    role = db.Column(
        db.String(50),
        default="CONTRIBUTOR"
    )

    status = db.Column(
        db.String(50),
        default="ACTIVE"
    )