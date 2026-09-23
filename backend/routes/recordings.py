import os
from flask import (
    Blueprint,
    request,
    jsonify,
    current_app,
    send_file,
    g
)
import uuid
from extensions import db
from models.recording import Recording
from models.consent import Consent
from models.verification import Verification

from services.audio_service import (
    save_audio,
    upload_audio_to_storage,
    read_audio,
    delete_audio
)
from services.hash_service import calculate_sha256
from pathlib import Path
from auth import require_auth, require_role
from werkzeug.utils import secure_filename



recordings_bp = Blueprint(
    "recordings",
    __name__,
    url_prefix="/api/recordings"
)

@recordings_bp.route("", methods=["POST"])
@require_auth
def create_recording():

    try:

        audio = request.files.get("audio")

        if not audio:
            return jsonify({
                "error": "Audio file is required"
            }), 400
            
        if not audio.filename:
            return jsonify({
        "error": "Audio filename is missing."
    }), 400
        title = request.form.get("title")
        description = request.form.get("description")
        language = request.form.get("language")
        
        if not title or not title.strip():
            return jsonify({
                "error": "Title is required."
            }), 400

        if not language or not language.strip():
            return jsonify({
                "error": "Language is required."
            }), 400
            
        access_level = request.form.get(
            "access_level",
            "PRIVATE"
        )

        speaker_id = request.form.get("speaker_id")
        community_id = request.form.get("community_id")

        upload_folder = current_app.config["UPLOAD_FOLDER"]
        filename, file_path = save_audio(
            audio,
            upload_folder
            )

        file_hash = calculate_sha256(
            file_path
        )

        # Firebase Storage is the durable source of truth. Render's local
        # filesystem is ephemeral, so never store only the local path.
        storage_object = f"recordings/{filename}"
        try:
            durable_audio_path = upload_audio_to_storage(
                file_path,
                storage_object
            )
        except Exception:
            current_app.logger.exception(
                "Firebase Storage upload failed"
            )
            if os.path.exists(file_path):
                os.remove(file_path)
            return jsonify({
                "error": "Audio storage is not configured correctly on the backend."
            }), 503

        # Check whether this audio already exists
        existing_recording = Recording.query.filter_by(
            audio_hash=file_hash
        ).first()

        if existing_recording:

            # Delete the newly uploaded duplicate file
            if os.path.exists(file_path):
                os.remove(file_path)

            try:
                delete_audio(durable_audio_path)
            except Exception:
                current_app.logger.exception(
                    "Duplicate audio cleanup failed"
                )

            return jsonify({
                "error": "This audio recording has already been preserved.",
                "recording_id": existing_recording.id,
                "audio_hash": existing_recording.audio_hash
            }), 409

        # Create new recording
        recording = Recording(
            title=title,
            description=description,
            audio_filename=filename,
            audio_path=durable_audio_path,
            audio_hash=file_hash,
            language=language,
            speaker_id=speaker_id or None,
            community_id=community_id or None,
            access_level=access_level,
            created_by=g.current_user.id
        )

        db.session.add(recording)
        db.session.flush()
        verification = Verification(
            recording_id=recording.id,
            status="PENDING"
)
        db.session.add(verification)

        # Create consent record
        consent = Consent(
            recording_id=recording.id,

            archive_allowed=request.form.get(
                "archive_allowed"
            ) == "true",

            transcription_allowed=request.form.get(
                "transcription_allowed"
            ) == "true",

            translation_allowed=request.form.get(
                "translation_allowed"
            ) == "true",

            research_allowed=request.form.get(
                "research_allowed"
            ) == "true",

            public_access_allowed=request.form.get(
                "public_access_allowed"
            ) == "true",

            commercial_use_allowed=request.form.get(
                "commercial_use_allowed"
            ) == "true",

            ai_processing_allowed=request.form.get(
                "ai_processing_allowed"
            ) == "true",

            ai_training_allowed=request.form.get(
                "ai_training_allowed"
            ) == "true",

            consent_method="Digital Consent"
        )

        db.session.add(consent)

        db.session.commit()

        return jsonify({
            "message": "Recording preserved successfully",
            "recording_id": recording.id,
            "audio_hash": file_hash
        }), 201

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500
        
# ============================================================
# PROTECTED ORIGINAL AUDIO
# ============================================================

@recordings_bp.route(
    "/<int:recording_id>/audio",
    methods=["GET"]
)
@require_auth
def stream_original_audio(recording_id):

    try:

        # ----------------------------------------------------
        # 1. Find recording
        # ----------------------------------------------------

        recording = Recording.query.get(
            recording_id
        )

        if not recording:

            return jsonify({
                "error": "Recording not found."
            }), 404


        # ----------------------------------------------------
        # 2. Check that the source file exists
        # ----------------------------------------------------

        audio_path = recording.audio_path

        if not audio_path:
            return jsonify({
                "error": "Original audio file is unavailable."
            }), 404


        # ----------------------------------------------------
        # 3. Check consent
        # ----------------------------------------------------

        consent = Consent.query.filter_by(
            recording_id=recording.id
        ).first()

        if not consent:

            return jsonify({
                "error": "Consent record not found."
            }), 403


        # ----------------------------------------------------
        # 4. Archive permission is required
        # ----------------------------------------------------

        if not consent.archive_allowed:

            return jsonify({
                "error": (
                    "Audio playback is not permitted "
                    "under the recorded consent."
                )
            }), 403


        # ----------------------------------------------------
        # 5. Check verification record
        # ----------------------------------------------------

        verification = Verification.query.filter_by(
            recording_id=recording.id
        ).first()

        if not verification:

            return jsonify({
                "error": "Verification record not found."
            }), 404


        # ----------------------------------------------------
        # 6. Only verified archive sources can be played
        #
        # TEMPORARY PROTOTYPE RULE:
        # Allow PENDING recordings so reviewers can listen
        # before approval.
        #
        # Later this will be replaced by proper reviewer
        # authentication / RBAC.
        # ----------------------------------------------------

        allowed_statuses = [
            "PENDING",
            "APPROVED"
        ]

        if verification.status not in allowed_statuses:

            return jsonify({
                "error": (
                    "Audio playback is unavailable "
                    "for this verification state."
                )
            }), 403


        # ----------------------------------------------------
        # 7. Stream the original file
        # ----------------------------------------------------

        audio_file, mimetype = read_audio(audio_path)

        if audio_file is None:
            return jsonify({
                "error": "Original audio file is unavailable."
            }), 404

        return send_file(
            audio_file,
            mimetype=mimetype,
            conditional=False,
            max_age=0
        )


    except Exception as e:

        current_app.logger.exception(
            "Original audio streaming failed"
        )

        return jsonify({
            "error": str(e)
        }), 500
        
@recordings_bp.route("/public", methods=["GET"])
def public_recordings():

    try:

        recordings = (
            Recording.query
            .join(
                Verification,
                Verification.recording_id == Recording.id
            )
            .join(
                Consent,
                Consent.recording_id == Recording.id
            )
            .filter(
                Verification.status == "APPROVED",
                Consent.public_access_allowed.is_(True)
            )
            .order_by(
                Recording.created_at.desc()
            )
            .all()
            
        )
        

        results = []

        for recording in recordings:

            results.append({
                "id": recording.id,
                "title": recording.title,
                "description": recording.description,
                "language": recording.language,
                "speaker_id": recording.speaker_id,
                "community_id": recording.community_id,
                "access_level": recording.access_level,
                "audio_hash": recording.audio_hash,
                "created_at": (
                    recording.created_at.isoformat()
                    if recording.created_at
                    else None
                )
            })

        return jsonify({
            "count": len(results),
            "recordings": results
        }), 200

    except Exception as e:

        current_app.logger.exception(
            "Public archive retrieval failed"
        )

        return jsonify({
            "error": str(e)
        }), 500
        
@recordings_bp.route("/<int:recording_id>", methods=["DELETE"])
@require_auth
@require_role("ADMIN")
def delete_recording(recording_id):
    try:
        recording = Recording.query.get(recording_id)

        if not recording:
            return jsonify({
                "error": "Recording not found."
            }), 404

        # Delete durable audio from Firebase Storage (or legacy local file).
        if recording.audio_path:
            delete_audio(recording.audio_path)

        # Delete related verification
        verification = Verification.query.filter_by(
            recording_id=recording_id
        ).first()

        if verification:
            db.session.delete(verification)

        # Delete related consent
        consent = Consent.query.filter_by(
            recording_id=recording_id
        ).first()

        if consent:
            db.session.delete(consent)

        # Delete recording itself
        db.session.delete(recording)

        db.session.commit()

        return jsonify({
            "message": "Recording deleted successfully.",
            "recording_id": recording_id
        }), 200

    except Exception as e:
        db.session.rollback()

        current_app.logger.exception(
            "Recording deletion failed"
        )

        return jsonify({
            "error": str(e)
        }), 500

@recordings_bp.route(
    "/public/<int:recording_id>/audio",
    methods=["GET"]
)
def public_recording_audio(recording_id):

    try:
        recording = Recording.query.get(recording_id)

        if not recording:
            return jsonify({
                "error": "Recording not found."
            }), 404

        verification = Verification.query.filter_by(
            recording_id=recording_id
        ).first()

        if not verification:
            return jsonify({
                "error": "Verification record not found."
            }), 404

        if verification.status != "APPROVED":
            return jsonify({
                "error": "Recording has not been approved."
            }), 403

        consent = Consent.query.filter_by(
            recording_id=recording_id
        ).first()

        if not consent:
            return jsonify({
                "error": "Consent record not found."
            }), 404

        if not consent.public_access_allowed:
            return jsonify({
                "error": "Public access is not enabled."
            }), 403

        if not recording.audio_path:
            return jsonify({
                "error": "Audio file is unavailable."
            }), 404

        audio_file, mimetype = read_audio(
            recording.audio_path
        )

        if audio_file is None:
            return jsonify({
                "error": "Audio file is missing from storage."
            }), 404

        return send_file(
            audio_file,
            mimetype=mimetype or "audio/wav",
            conditional=False
        )

    except Exception as e:

        current_app.logger.exception(
            "Public audio retrieval failed"
        )

        return jsonify({
            "error": str(e)
        }), 500