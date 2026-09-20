from datetime import datetime
from pathlib import Path
import mimetypes

from flask import (
    Blueprint,
    jsonify,
    request,
    send_file
)

from extensions import db
from models.recording import Recording
from models.verification import Verification
   
verifications_bp = Blueprint(
    "verifications",
    __name__,
    url_prefix="/api/verifications"
)


# =========================================================
# GET PENDING VERIFICATIONS
# =========================================================

@verifications_bp.route("/pending", methods=["GET"])
def get_pending_verifications():

    try:

        verifications = Verification.query.filter_by(
            status="PENDING"
        ).order_by(
            Verification.created_at.asc()
        ).all()

        results = []

        for verification in verifications:

            recording = Recording.query.get(
                verification.recording_id
            )

            if not recording:
                continue

            results.append({
                "verification_id": verification.id,
                "recording_id": recording.id,
                "title": recording.title,
                "description": recording.description,
                "language": recording.language,
                "audio_filename": recording.audio_filename,
                "audio_hash": recording.audio_hash,
                "access_level": recording.access_level,
                "status": verification.status,
                "created_at": verification.created_at.isoformat()
                    if verification.created_at
                    else None
            })

        return jsonify({
            "count": len(results),
            "verifications": results
        }), 200

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500

# =========================================================
# REVIEWER AUDIO PLAYBACK
# =========================================================

@verifications_bp.route(
    "/<int:recording_id>/audio",
    methods=["GET"]
)
def reviewer_audio(recording_id):

    try:

        verification = Verification.query.filter_by(
            recording_id=recording_id
        ).first()

        if not verification:

            return jsonify({
                "error": "Verification record not found."
            }), 404


        # Reviewers should be able to listen to
        # recordings that are currently pending review.
        if verification.status not in [
            "PENDING",
            "APPROVED"
        ]:

            return jsonify({
                "error": (
                    "This recording is not available "
                    "for reviewer playback."
                )
            }), 403


        recording = Recording.query.get(
            recording_id
        )

        if not recording:

            return jsonify({
                "error": "Recording not found."
            }), 404


        if not recording.audio_path:

            return jsonify({
                "error": "Audio path is not available."
            }), 404


        file_path = Path(
            recording.audio_path
        )


        if not file_path.exists():

            return jsonify({
                "error": "Original audio file is unavailable."
            }), 404


        mimetype, _ = mimetypes.guess_type(
            str(file_path)
        )


        return send_file(
            str(file_path),
            mimetype=mimetype or "application/octet-stream",
            conditional=True
        )


    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500
# =========================================================
# APPROVE RECORDING
# =========================================================

@verifications_bp.route(
    "/<int:recording_id>/approve",
    methods=["POST"]
)
def approve_recording(recording_id):

    try:

        verification = Verification.query.filter_by(
            recording_id=recording_id
        ).first()

        if not verification:

            return jsonify({
                "error": "Verification record not found."
            }), 404

        if verification.status != "PENDING":

            return jsonify({
                "error": (
                    f"Recording is already "
                    f"{verification.status.lower()}."
                )
            }), 409

        data = request.get_json(silent=True) or {}

        reviewer_notes = data.get(
            "reviewer_notes",
            ""
        )

        verification.status = "APPROVED"
        verification.reviewer_notes = reviewer_notes
        verification.reviewed_at = datetime.utcnow()

        # Temporary reviewer until authentication/RBAC
        # is connected to the reviewer dashboard.
        verification.reviewer_id = 1

        db.session.commit()

        return jsonify({
            "message": "Recording approved successfully.",
            "recording_id": recording_id,
            "status": verification.status
        }), 200

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500


# =========================================================
# REJECT RECORDING
# =========================================================

@verifications_bp.route(
    "/<int:recording_id>/reject",
    methods=["POST"]
)
def reject_recording(recording_id):

    try:

        verification = Verification.query.filter_by(
            recording_id=recording_id
        ).first()

        if not verification:

            return jsonify({
                "error": "Verification record not found."
            }), 404

        if verification.status != "PENDING":

            return jsonify({
                "error": (
                    f"Recording is already "
                    f"{verification.status.lower()}."
                )
            }), 409

        data = request.get_json(silent=True) or {}

        reviewer_notes = data.get(
            "reviewer_notes",
            ""
        )

        if not reviewer_notes.strip():

            return jsonify({
                "error": "Rejection reason is required."
            }), 400

        verification.status = "REJECTED"
        verification.reviewer_notes = reviewer_notes
        verification.reviewed_at = datetime.utcnow()

        # Temporary reviewer until authentication/RBAC
        # is connected to the reviewer dashboard.
        verification.reviewer_id = 1

        db.session.commit()

        return jsonify({
            "message": "Recording rejected.",
            "recording_id": recording_id,
            "status": verification.status,
            "reviewer_notes": reviewer_notes
        }), 200

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500
        