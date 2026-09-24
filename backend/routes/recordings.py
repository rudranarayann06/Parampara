import os
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app, send_file, g
from flask_limiter.util import get_remote_address
from sqlalchemy import or_, func

from extensions import db
from models.recording import Recording
from models.consent import Consent
from models.verification import Verification
from models.enrichment import TranscriptVersion, Translation, AuditEvent, HeritagePassport, CommunityVerification
from services.audio_service import save_audio, upload_audio_to_storage, read_audio, delete_audio
from services.hash_service import calculate_sha256
from services.audit_service import audit
from services.passport_service import ensure_passport
from auth import require_auth, optional_auth, require_role

recordings_bp = Blueprint("recordings", __name__, url_prefix="/api/recordings")


def _bool(name, default=False):
    value = request.form.get(name)
    if value is None:
        value = request.args.get(name)
    if value is None:
        return default
    return str(value).lower() in {"1", "true", "yes", "on"}


def _language_code(language):
    mapping = {
        "odia": "or-IN", "ଓଡ଼ିଆ": "or-IN", "hindi": "hi-IN", "हिन्दी": "hi-IN",
        "bengali": "bn-IN", "বাংলা": "bn-IN", "telugu": "te-IN", "tamil": "ta-IN",
        "kannada": "kn-IN", "malayalam": "ml-IN", "marathi": "mr-IN", "gujarati": "gu-IN",
        "punjabi": "pa-IN", "english": "en-IN", "assamese": "as-IN", "santali": "sat-IN",
    }
    key = (language or "").strip().lower()
    return mapping.get(key, language or "en-IN")


def _serialize(recording, include_private=False):
    verification = Verification.query.filter_by(recording_id=recording.id).first()
    consent = Consent.query.filter_by(recording_id=recording.id).first()
    passport = HeritagePassport.query.filter_by(recording_id=recording.id).first()
    latest_transcript = TranscriptVersion.query.filter_by(recording_id=recording.id).order_by(TranscriptVersion.version.desc()).first()
    translations = Translation.query.filter_by(recording_id=recording.id).order_by(Translation.created_at.desc()).all()
    community = CommunityVerification.query.filter_by(recording_id=recording.id).order_by(CommunityVerification.created_at.desc()).first()
    data = {
        "id": recording.id,
        "title": recording.title,
        "description": recording.description,
        "language": recording.language,
        "language_code": recording.language_code,
        "category": recording.category,
        "state": recording.state,
        "district": recording.district,
        "community": recording.community_name,
        "location": recording.location,
        "duration": recording.duration,
        "access_level": recording.access_level,
        "audio_hash": recording.audio_hash,
        "created_at": recording.created_at.isoformat() if recording.created_at else None,
        "verification_status": verification.status if verification else "PENDING",
        "consent": {
            "archive_allowed": bool(consent.archive_allowed) if consent else False,
            "transcription_allowed": bool(consent.transcription_allowed) if consent else False,
            "translation_allowed": bool(consent.translation_allowed) if consent else False,
            "research_allowed": bool(consent.research_allowed) if consent else False,
            "public_access_allowed": bool(consent.public_access_allowed) if consent else False,
            "commercial_use_allowed": bool(consent.commercial_use_allowed) if consent else False,
            "ai_processing_allowed": bool(consent.ai_processing_allowed) if consent else False,
            "ai_training_allowed": bool(consent.ai_training_allowed) if consent else False,
        },
        "transcript": ({
            "id": latest_transcript.id,
            "version": latest_transcript.version,
            "language": latest_transcript.language,
            "text": latest_transcript.text,
            "source": latest_transcript.source,
            "model": latest_transcript.model,
            "confidence": latest_transcript.confidence,
            "created_at": latest_transcript.created_at.isoformat(),
        } if latest_transcript else None),
        "translations": [{
            "id": t.id, "language": t.language, "text": t.translated_text,
            "source": t.source, "model": t.model, "version": t.version,
            "created_at": t.created_at.isoformat(),
        } for t in translations],
        "community_verification": ({
            "status": community.status,
            "language_valid": community.language_valid,
            "community_valid": community.community_valid,
            "location_valid": community.location_valid,
            "tradition_valid": community.tradition_valid,
            "cultural_context": community.cultural_context,
        } if community else None),
        "passport": ({
            "passport_id": passport.passport_id,
            "public_slug": passport.public_slug,
            "issued_at": passport.issued_at.isoformat(),
        } if passport else None),
    }
    if include_private:
        data["audio_uri"] = recording.audio_path
        data["created_by"] = recording.created_by
    return data


@recordings_bp.route("", methods=["POST"])
@optional_auth
def create_recording():
    audio = request.files.get("audio")
    if not audio or not audio.filename:
        return jsonify({"error": "Audio file is required."}), 400
    title = (request.form.get("title") or "").strip()
    language = (request.form.get("language") or "").strip()
    if not title or not language:
        return jsonify({"error": "Title and language are required."}), 400

    upload_folder = current_app.config["UPLOAD_FOLDER"]
    filename = file_path = durable_audio_path = None
    try:
        filename, file_path = save_audio(audio, upload_folder)
        file_hash = calculate_sha256(file_path)
        existing = Recording.query.filter_by(audio_hash=file_hash).first()
        if existing:
            return jsonify({"error": "Duplicate audio: this source is already preserved.", "recording_id": existing.id, "audio_hash": existing.audio_hash}), 409

        storage_object = f"recordings/{file_hash[:2]}/{file_hash}/{filename}"
        durable_audio_path = upload_audio_to_storage(file_path, storage_object)
        access_level = request.form.get("access_level", "PRIVATE")
        public_allowed = _bool("public_access_allowed") and access_level == "PUBLIC"
        recording = Recording(
            title=title,
            description=(request.form.get("description") or "").strip(),
            audio_filename=filename,
            audio_path=durable_audio_path,
            audio_hash=file_hash,
            language=language,
            language_code=request.form.get("language_code") or _language_code(language),
            category=request.form.get("category"),
            state=request.form.get("state"),
            district=request.form.get("district"),
            community_name=request.form.get("community"),
            speaker_id=request.form.get("speaker_id") or None,
            community_id=request.form.get("community_id") or None,
            location=request.form.get("location"),
            access_level=access_level,
            created_by=g.current_user.id,
        )
        db.session.add(recording)
        db.session.flush()
        verification = Verification(recording_id=recording.id, status="PENDING")
        consent = Consent(
            recording_id=recording.id,
            archive_allowed=_bool("archive_allowed"),
            transcription_allowed=_bool("transcription_allowed"),
            translation_allowed=_bool("translation_allowed"),
            research_allowed=_bool("research_allowed"),
            public_access_allowed=public_allowed,
            commercial_use_allowed=_bool("commercial_use_allowed"),
            ai_processing_allowed=_bool("ai_processing_allowed"),
            ai_training_allowed=_bool("ai_training_allowed"),
            consent_method=request.form.get("consent_method", "Digital Consent"),
        )
        db.session.add_all([verification, consent])
        audit(recording.id, "CONTRIBUTION_CREATED", g.current_user.id, {"source": "web", "audio_hash": file_hash})
        db.session.commit()
        return jsonify({"message": "Recording preserved successfully", "recording": _serialize(recording, include_private=True)}), 201
    except Exception as exc:
        db.session.rollback()
        if durable_audio_path:
            try: delete_audio(durable_audio_path)
            except Exception: current_app.logger.exception("Orphaned storage cleanup failed")
        if file_path and os.path.exists(file_path):
            try: os.remove(file_path)
            except OSError: pass
        current_app.logger.exception("Recording creation failed")
        return jsonify({"error": str(exc)}), 500


@recordings_bp.route("/<int:recording_id>", methods=["GET"])
@optional_auth
def get_recording(recording_id):
    recording = Recording.query.get_or_404(recording_id)
    verification = Verification.query.filter_by(recording_id=recording.id).first()
    consent = Consent.query.filter_by(recording_id=recording.id).first()
    if not (verification and verification.status == "APPROVED" and consent and consent.public_access_allowed):
        # Authenticated reviewers can still inspect it.
        if not getattr(g, "current_user", None):
            return jsonify({"error": "This record is not public."}), 403
    return jsonify({"recording": _serialize(recording, include_private=False)})


@recordings_bp.route("/<int:recording_id>/audio", methods=["GET"])
@require_auth
def stream_original_audio(recording_id):
    recording = Recording.query.get_or_404(recording_id)
    consent = Consent.query.filter_by(recording_id=recording.id).first()
    verification = Verification.query.filter_by(recording_id=recording.id).first()
    user = g.current_user
    reviewer = user.role in {"REVIEWER", "ADMIN"}
    public_ok = verification and verification.status == "APPROVED" and consent and consent.public_access_allowed
    if not reviewer and not public_ok:
        return jsonify({"error": "Audio playback is restricted."}), 403
    audio_file, mimetype = read_audio(recording.audio_path)
    if audio_file is None:
        return jsonify({"error": "Original audio file is unavailable."}), 404
    download = _bool("download")
    response = send_file(
        audio_file,
        mimetype=mimetype,
        conditional=True,
        etag=recording.audio_hash,
        max_age=0,
        as_attachment=download,
        download_name=recording.audio_filename,
    )
    response.headers["Accept-Ranges"] = "bytes"
    response.headers["Cache-Control"] = "private, no-cache, must-revalidate" if not public_ok else "public, max-age=0, must-revalidate"
    return response


@recordings_bp.route("/public", methods=["GET"])
def public_recordings():
    q = (request.args.get("q") or "").strip()
    state = (request.args.get("state") or "").strip()
    language = (request.args.get("language") or "").strip()
    category = (request.args.get("category") or "").strip()
    district = (request.args.get("district") or "").strip()
    query = Recording.query.join(Verification, Verification.recording_id == Recording.id).join(Consent, Consent.recording_id == Recording.id)
    query = query.filter(Verification.status == "APPROVED", Consent.public_access_allowed.is_(True))
    if q:
        like = f"%{q}%"
        query = query.filter(or_(Recording.title.ilike(like), Recording.description.ilike(like), Recording.language.ilike(like), Recording.community_name.ilike(like), Recording.category.ilike(like)))
    if state: query = query.filter(func.lower(Recording.state) == state.lower())
    if language: query = query.filter(func.lower(Recording.language) == language.lower())
    if category: query = query.filter(func.lower(Recording.category) == category.lower())
    if district: query = query.filter(func.lower(Recording.district) == district.lower())
    records = query.order_by(Recording.created_at.desc()).limit(200).all()
    return jsonify({"recordings": [_serialize(r) for r in records], "count": len(records)})


@recordings_bp.route("/public/<int:recording_id>/audio", methods=["GET"])
def public_audio(recording_id):
    recording = Recording.query.get_or_404(recording_id)
    verification = Verification.query.filter_by(recording_id=recording.id).first()
    consent = Consent.query.filter_by(recording_id=recording.id).first()
    if not (verification and verification.status == "APPROVED" and consent and consent.public_access_allowed):
        return jsonify({"error": "Audio is not public."}), 403
    audio_file, mimetype = read_audio(recording.audio_path)
    if audio_file is None:
        return jsonify({"error": "Audio unavailable."}), 404
    download = _bool("download")
    response = send_file(
        audio_file,
        mimetype=mimetype,
        conditional=True,
        etag=recording.audio_hash,
        max_age=0,
        as_attachment=download,
        download_name=recording.audio_filename,
    )
    response.headers["Accept-Ranges"] = "bytes"
    response.headers["Cache-Control"] = "public, max-age=0, must-revalidate"
    return response


@recordings_bp.route("/<int:recording_id>/transcribe", methods=["POST"])
@require_auth
def transcribe(recording_id):
    recording = Recording.query.get_or_404(recording_id)
    consent = Consent.query.filter_by(recording_id=recording.id).first()
    if not consent or not consent.transcription_allowed or not consent.ai_processing_allowed:
        return jsonify({"error": "Transcription is not allowed by consent."}), 403
    try:
        from services.ai_service import transcribe_audio
        text_value, confidence, model = transcribe_audio(recording.audio_path, recording.language_code or _language_code(recording.language))
        latest = TranscriptVersion.query.filter_by(recording_id=recording.id).order_by(TranscriptVersion.version.desc()).first()
        version = (latest.version + 1) if latest else 1
        row = TranscriptVersion(recording_id=recording.id, version=version, language=recording.language_code or recording.language, text=text_value, source="AI", model=model, confidence=confidence)
        db.session.add(row)
        audit(recording.id, "TRANSCRIPT_GENERATED", g.current_user.id, {"version": version, "model": model})
        db.session.commit()
        return jsonify({"transcript": _serialize(recording)["transcript"]}), 201
    except Exception as exc:
        current_app.logger.exception("Transcription failed")
        return jsonify({"error": str(exc)}), 503


@recordings_bp.route("/<int:recording_id>/transcript", methods=["POST"])
@require_auth
def save_transcript(recording_id):
    recording = Recording.query.get_or_404(recording_id)
    text_value = (request.json or {}).get("text", "").strip()
    source = (request.json or {}).get("source", "HUMAN")
    if not text_value: return jsonify({"error": "Transcript text is required."}), 400
    latest = TranscriptVersion.query.filter_by(recording_id=recording.id).order_by(TranscriptVersion.version.desc()).first()
    version = (latest.version + 1) if latest else 1
    row = TranscriptVersion(recording_id=recording.id, version=version, language=recording.language_code or recording.language, text=text_value, source=source, model=(request.json or {}).get("model"), created_by=g.current_user.id)
    db.session.add(row)
    audit(recording.id, "TRANSCRIPT_VERSION_CREATED", g.current_user.id, {"version": version, "source": source})
    db.session.commit()
    return jsonify({"transcript": _serialize(recording)["transcript"]}), 201


@recordings_bp.route("/<int:recording_id>/translate", methods=["POST"])
@require_auth
def translate(recording_id):
    recording = Recording.query.get_or_404(recording_id)
    consent = Consent.query.filter_by(recording_id=recording.id).first()
    if not consent or not consent.translation_allowed or not consent.ai_processing_allowed:
        return jsonify({"error": "Translation is not allowed by consent."}), 403
    payload = request.get_json(silent=True) or {}
    target = (payload.get("target_language") or "en").strip()
    latest = TranscriptVersion.query.filter_by(recording_id=recording.id).order_by(TranscriptVersion.version.desc()).first()
    text_value = latest.text if latest else (payload.get("text") or "").strip()
    if not text_value: return jsonify({"error": "A transcript is required before translation."}), 400
    source = latest.language if latest else (recording.language_code or "en")
    try:
        from services.ai_service import translate_text
        translated, model = translate_text(text_value, source, target)
        latest_translation = Translation.query.filter_by(recording_id=recording.id, language=target).order_by(Translation.version.desc()).first()
        version = (latest_translation.version + 1) if latest_translation else 1
        row = Translation(recording_id=recording.id, transcript_version_id=latest.id if latest else None, language=target, translated_text=translated, source="AI", model=model, version=version, created_by=g.current_user.id)
        db.session.add(row)
        audit(recording.id, "TRANSLATION_GENERATED", g.current_user.id, {"target_language": target, "version": version, "model": model})
        db.session.commit()
        return jsonify({"translation": {"language": target, "text": translated, "source": "AI", "model": model, "version": version}}), 201
    except Exception as exc:
        current_app.logger.exception("Translation failed")
        return jsonify({"error": str(exc)}), 503


@recordings_bp.route("/<int:recording_id>/passport", methods=["GET"])
def passport(recording_id):
    recording = Recording.query.get_or_404(recording_id)
    verification = Verification.query.filter_by(recording_id=recording.id).first()
    consent = Consent.query.filter_by(recording_id=recording.id).first()
    if not (verification and verification.status == "APPROVED" and consent and consent.public_access_allowed):
        return jsonify({"error": "Heritage passport is not public."}), 403
    p = ensure_passport(recording.id, recording.state)
    db.session.commit()
    return jsonify({"passport": {"passport_id": p.passport_id, "public_slug": p.public_slug, "recording": _serialize(recording)}})


@recordings_bp.route("/passport/<slug>", methods=["GET"])
def passport_by_slug(slug):
    p = HeritagePassport.query.filter_by(public_slug=slug).first_or_404()
    recording = Recording.query.get_or_404(p.recording_id)
    verification = Verification.query.filter_by(recording_id=recording.id).first()
    consent = Consent.query.filter_by(recording_id=recording.id).first()
    if not (verification and verification.status == "APPROVED" and consent and consent.public_access_allowed):
        return jsonify({"error": "This passport is not public."}), 403
    return jsonify({"passport": {"passport_id": p.passport_id, "public_slug": p.public_slug, "issued_at": p.issued_at.isoformat(), "recording": _serialize(recording)}})


@recordings_bp.route("/<int:recording_id>/provenance", methods=["GET"])
def provenance(recording_id):
    recording = Recording.query.get_or_404(recording_id)
    verification = Verification.query.filter_by(recording_id=recording.id).first()
    consent = Consent.query.filter_by(recording_id=recording.id).first()
    if not (verification and verification.status == "APPROVED" and consent and consent.public_access_allowed):
        return jsonify({"error": "Provenance is not public."}), 403
    events = AuditEvent.query.filter_by(recording_id=recording.id).order_by(AuditEvent.created_at.asc()).all()
    return jsonify({"recording": _serialize(recording), "events": [{"type": e.event_type, "data": e.event_data, "created_at": e.created_at.isoformat()} for e in events]})


@recordings_bp.route("/<int:recording_id>/community-verification", methods=["POST"])
@require_auth
def community_verification(recording_id):
    if g.current_user.role not in {"COMMUNITY_KEEPER", "REVIEWER", "ADMIN"}:
        return jsonify({"error": "Community verification role required."}), 403
    recording = Recording.query.get_or_404(recording_id)
    payload = request.get_json(silent=True) or {}
    row = CommunityVerification(recording_id=recording.id, verifier_id=g.current_user.id, language_valid=bool(payload.get("language_valid")), community_valid=bool(payload.get("community_valid")), location_valid=bool(payload.get("location_valid")), tradition_valid=bool(payload.get("tradition_valid")), cultural_context=payload.get("cultural_context"), status="APPROVED" if all(bool(payload.get(k)) for k in ["language_valid","community_valid","location_valid","tradition_valid"]) else "NEEDS_REVIEW", reviewed_at=datetime.utcnow())
    db.session.add(row)
    audit(recording.id, "COMMUNITY_VERIFIED", g.current_user.id, {"status": row.status})
    db.session.commit()
    return jsonify({"message": "Community verification recorded", "status": row.status}), 201


@recordings_bp.route("/stats", methods=["GET"])
def stats():
    total = Recording.query.count()
    verified = Recording.query.join(Verification, Verification.recording_id == Recording.id).filter(Verification.status == "APPROVED").count()
    consented = Recording.query.join(Consent, Consent.recording_id == Recording.id).filter(Consent.archive_allowed.is_(True)).count()
    public = Recording.query.join(Consent, Consent.recording_id == Recording.id).filter(Consent.public_access_allowed.is_(True)).count()
    languages = db.session.query(func.count(func.distinct(Recording.language))).scalar() or 0
    communities = db.session.query(func.count(func.distinct(Recording.community_name))).filter(Recording.community_name.isnot(None)).scalar() or 0
    states = db.session.query(func.count(func.distinct(Recording.state))).filter(Recording.state.isnot(None)).scalar() or 0
    return jsonify({"stories": total, "verified": verified, "consented": consented, "public": public, "languages": languages, "communities": communities, "states": states})


@recordings_bp.route("/review/queue", methods=["GET"])
@require_auth
@require_role("REVIEWER", "ADMIN", "COMMUNITY_KEEPER")
def review_queue():
    status = request.args.get("status", "PENDING")
    rows = Recording.query.join(Verification, Verification.recording_id == Recording.id).filter(Verification.status == status).order_by(Recording.created_at.desc()).limit(100).all()
    return jsonify({"recordings": [_serialize(r, include_private=True) for r in rows]})
