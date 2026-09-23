from flask import Blueprint, jsonify, g

from auth import require_auth


auth_bp = Blueprint(
    "auth",
    __name__,
    url_prefix="/api/auth"
)


@auth_bp.route("/me", methods=["GET"])
@require_auth
def get_current_user():

    user = g.current_user

    return jsonify({
        "id": user.id,
        "firebase_uid": user.firebase_uid,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "status": user.status
    }), 200