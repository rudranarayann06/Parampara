from datetime import datetime
from extensions import db


class TranscriptVersion(db.Model):
    __tablename__ = "transcript_versions"
    id = db.Column(db.Integer, primary_key=True)
    recording_id = db.Column(db.Integer, db.ForeignKey("recordings.id"), nullable=False)
    version = db.Column(db.Integer, nullable=False, default=1)
    language = db.Column(db.String(32), nullable=False)
    text = db.Column(db.Text, nullable=False)
    source = db.Column(db.String(50), nullable=False, default="AI")
    model = db.Column(db.String(255))
    confidence = db.Column(db.Float)
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


class Translation(db.Model):
    __tablename__ = "translations"
    id = db.Column(db.Integer, primary_key=True)
    recording_id = db.Column(db.Integer, db.ForeignKey("recordings.id"), nullable=False)
    transcript_version_id = db.Column(db.Integer, db.ForeignKey("transcript_versions.id"), nullable=True)
    language = db.Column(db.String(32), nullable=False)
    translated_text = db.Column(db.Text, nullable=False)
    source = db.Column(db.String(50), nullable=False, default="AI")
    model = db.Column(db.String(255))
    version = db.Column(db.Integer, nullable=False, default=1)
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


class AuditEvent(db.Model):
    __tablename__ = "audit_events"
    id = db.Column(db.Integer, primary_key=True)
    recording_id = db.Column(db.Integer, db.ForeignKey("recordings.id"), nullable=False)
    event_type = db.Column(db.String(100), nullable=False)
    actor_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    event_data = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


class HeritagePassport(db.Model):
    __tablename__ = "heritage_passports"
    id = db.Column(db.Integer, primary_key=True)
    recording_id = db.Column(db.Integer, db.ForeignKey("recordings.id"), unique=True, nullable=False)
    passport_id = db.Column(db.String(64), unique=True, nullable=False)
    public_slug = db.Column(db.String(128), unique=True, nullable=False)
    issued_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


class CommunityVerification(db.Model):
    __tablename__ = "community_verifications"
    id = db.Column(db.Integer, primary_key=True)
    recording_id = db.Column(db.Integer, db.ForeignKey("recordings.id"), nullable=False)
    verifier_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    language_valid = db.Column(db.Boolean, default=False)
    community_valid = db.Column(db.Boolean, default=False)
    location_valid = db.Column(db.Boolean, default=False)
    tradition_valid = db.Column(db.Boolean, default=False)
    cultural_context = db.Column(db.Text)
    status = db.Column(db.String(30), default="PENDING", nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    reviewed_at = db.Column(db.DateTime)
