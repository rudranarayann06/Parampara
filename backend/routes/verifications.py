from datetime import datetime
from flask import Blueprint, request, jsonify, g
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
    rows = Recording.query.join(Verification, Verification.recording_id == Recording.id).filter(Verification.status == "PENDING").order_by(Recording.created_at.desc()).limit(100).all()
    result = []
    for r in rows:
        v = Verification.query.filter_by(recording_id=r.id).first()
        item = _serialize(r, include_private=True)
        item.update({"recording_id": r.id, "verification_id": v.id, "verification_status": v.status, "audio_filename": r.audio_filename})
        result.append(item)
    return jsonify({"verifications": result})




@verifications_bp.route("/<int:recording_id>/audio", methods=["GET"])
@require_auth
@require_role("REVIEWER", "ADMIN", "COMMUNITY_KEEPER")
def reviewer_audio(recording_id):
    """Protected audio endpoint for the reviewer workspace.

    Kept under /api/verifications/... for backward compatibility with the
    older reviewer frontend. The canonical authenticated audio endpoint is
    /api/recordings/<id>/audio.
    """
    from flask import current_app, send_file
    from services.audio_service import read_audio_candidates

    recording = Recording.query.get_or_404(recording_id)
    candidates = []
    if recording.audio_hash and recording.audio_filename:
        import os
        candidates.append(f"supabase://{os.getenv('SUPABASE_AUDIO_BUCKET', 'parampara-audio')}/recordings/{recording.audio_hash[:2]}/{recording.audio_hash}/{recording.audio_filename}")
        bucket = os.getenv('FIREBASE_STORAGE_BUCKET', os.getenv('DEFAULT_BUCKET', ''))
        if bucket:
            candidates.append(f"gs://{bucket}/recordings/{recording.audio_hash[:2]}/{recording.audio_hash}/{recording.audio_filename}")
    audio_file, mimetype, _ = read_audio_candidates(recording.audio_path, candidates)
    if audio_file is None:
        return jsonify({"error": "Original audio file is unavailable in durable storage.", "recording_id": recording.id}), 404

    response = send_file(
        audio_file,
        mimetype=mimetype,
        conditional=True,
        etag=recording.audio_hash,
        max_age=0,
        as_attachment=False,
        download_name=recording.audio_filename,
    )
    response.headers["Accept-Ranges"] = "bytes"
    response.headers["Cache-Control"] = "private, no-cache, must-revalidate"
    return response


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
