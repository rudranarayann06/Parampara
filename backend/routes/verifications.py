from datetime import datetime
from flask import Blueprint, request, jsonify, g, current_app
from extensions import db
from models.recording import Recording
from models.verification import Verification
from models.consent import Consent
from models.enrichment import CommunityVerification
from services.audit_service import audit
from services.passport_service import ensure_passport
from routes.recordings import _serialize
from auth import require_auth, require_role

verifications_bp = Blueprint("verifications", __name__, url_prefix="/api/verifications")


@verifications_bp.route("/<int:recording_id>", methods=["GET"])
@require_auth
@require_role("REVIEWER", "ADMIN", "COMMUNITY_KEEPER")
def get_verification(recording_id):
    recording = Recording.query.get_or_404(recording_id)
    verification = Verification.query.filter_by(recording_id=recording.id).first()
    return jsonify({"recording": _serialize(recording, include_private=True), "verification": {
        "id": verification.id,
        "status": verification.status,
        "reviewer_id": verification.reviewer_id,
        "reviewer_notes": verification.reviewer_notes,
        "reviewed_at": verification.reviewed_at.isoformat() if verification.reviewed_at else None,
    }})


@verifications_bp.route("/<int:recording_id>", methods=["POST", "PATCH"])
@require_auth
@require_role("REVIEWER", "ADMIN")
def update_verification(recording_id):
    recording = Recording.query.get_or_404(recording_id)
    verification = Verification.query.filter_by(recording_id=recording.id).first()
    payload = request.get_json(silent=True) or {}
    status = (payload.get("status") or "").upper()
    if status not in {"APPROVED", "REJECTED", "PENDING", "NEEDS_REVIEW"}:
        return jsonify({"error": "Invalid verification status."}), 400
    verification.status = status
    verification.reviewer_id = g.current_user.id
    verification.reviewer_notes = payload.get("reviewer_notes")
    verification.reviewed_at = datetime.utcnow()
    if status == "APPROVED":
        consent = Consent.query.filter_by(recording_id=recording.id).first()
        if consent and consent.public_access_allowed:
            ensure_passport(recording.id, recording.state)
    audit(recording.id, f"VERIFICATION_{status}", g.current_user.id, {"notes": verification.reviewer_notes})
    db.session.commit()
    return jsonify({"message": f"Recording {status.lower()}.", "recording": _serialize(recording, include_private=True)}), 200
@verifications_bp.route("/pending", methods=["GET"])
@require_auth
@require_role("REVIEWER", "ADMIN", "COMMUNITY_KEEPER")
def pending_alias():
    rows = Recording.query.join(
        Verification,
        Verification.recording_id == Recording.id
    ).filter(
        Verification.status == "PENDING"
    ).order_by(
        Recording.created_at.desc()
    ).limit(100).all()

    result = []

    for r in rows:
        v = Verification.query.filter_by(
            recording_id=r.id
        ).first()

        # Keep the reviewer queue dependent only on the core
        # recording + verification + consent data.
        # Optional enrichment is loaded later when the reviewer
        # opens an individual recording.
        try:
            consent = Consent.query.filter_by(
                recording_id=r.id
            ).first()

            item = {
                "id": r.id,
                "recording_id": r.id,
                "verification_id": v.id if v else None,

                "title": r.title,
                "description": r.description,

                "language": r.language,
                "language_code": r.language_code,

                "category": r.category,
                "state": r.state,
                "district": r.district,
                "community": r.community_name,
                "location": r.location,

                "duration": r.duration,
                "access_level": r.access_level,

                "audio_hash": r.audio_hash,
                "audio_filename": r.audio_filename,
                "audio_uri": r.audio_path,

                "created_at": (
                    r.created_at.isoformat()
                    if r.created_at
                    else None
                ),

                "verification_status": (
                    v.status
                    if v
                    else "PENDING"
                ),

                "consent": {
                    "archive_allowed": (
                        bool(consent.archive_allowed)
                        if consent else False
                    ),
                    "transcription_allowed": (
                        bool(consent.transcription_allowed)
                        if consent else False
                    ),
                    "translation_allowed": (
                        bool(consent.translation_allowed)
                        if consent else False
                    ),
                    "research_allowed": (
                        bool(consent.research_allowed)
                        if consent else False
                    ),
                    "public_access_allowed": (
                        bool(consent.public_access_allowed)
                        if consent else False
                    ),
                    "commercial_use_allowed": (
                        bool(consent.commercial_use_allowed)
                        if consent else False
                    ),
                    "ai_processing_allowed": (
                        bool(consent.ai_processing_allowed)
                        if consent else False
                    ),
                    "ai_training_allowed": (
                        bool(consent.ai_training_allowed)
                        if consent else False
                    ),
                },

                # These are deliberately empty in the queue.
                # They are populated when the reviewer opens
                # the individual record.
                "transcript": None,
                "translations": [],
                "community_verification": None,
                "passport": None,
            }

            result.append(item)

        except Exception:
            db.session.rollback()

            current_app.logger.exception(
                "Failed to serialize reviewer queue item for recording %s",
                r.id
            )

            raise

    return jsonify({
        "verifications": result
    })

@verifications_bp.route("/<int:recording_id>/approve", methods=["POST"])
@require_auth
@require_role("REVIEWER", "ADMIN")
def approve_alias(recording_id):
    payload = request.get_json(silent=True) or {}
    recording = Recording.query.get_or_404(recording_id)
    v = Verification.query.filter_by(recording_id=recording.id).first()
    v.status = "APPROVED"
    v.reviewer_id = g.current_user.id
    v.reviewer_notes = payload.get("reviewer_notes")
    v.reviewed_at = datetime.utcnow()
    consent = Consent.query.filter_by(recording_id=recording.id).first()
    passport = None
    if consent and consent.public_access_allowed:
        passport = ensure_passport(recording.id, recording.state)
    audit(recording.id, "VERIFICATION_APPROVED", g.current_user.id, {"reviewer_notes": v.reviewer_notes})
    db.session.commit()
    return jsonify({"message": "Recording approved", "passport_id": passport.passport_id if passport else None, "recording": _serialize(recording, include_private=True)})


@verifications_bp.route("/<int:recording_id>/reject", methods=["POST"])
@require_auth
@require_role("REVIEWER", "ADMIN")
def reject_alias(recording_id):
    payload = request.get_json(silent=True) or {}
    recording = Recording.query.get_or_404(recording_id)
    v = Verification.query.filter_by(recording_id=recording.id).first()
    v.status = "REJECTED"
    v.reviewer_id = g.current_user.id
    v.reviewer_notes = payload.get("reviewer_notes")
    v.reviewed_at = datetime.utcnow()
    audit(recording.id, "VERIFICATION_REJECTED", g.current_user.id, {"reviewer_notes": v.reviewer_notes})
    db.session.commit()
    return jsonify({"message": "Recording rejected", "recording": _serialize(recording, include_private=True)})
