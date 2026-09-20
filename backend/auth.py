import firebase_admin
from firebase_admin import auth as firebase_auth
from functools import wraps

from flask import request, jsonify, g

from models.user import User


# Initialize Firebase Admin only once
if not firebase_admin._apps:
    firebase_admin.initialize_app()


def require_auth(f):
    """
    Verify Firebase ID token and load the corresponding
    PARAMPARA user.
    """

    @wraps(f)
    def decorated(*args, **kwargs):

        auth_header = request.headers.get("Authorization", "")

        if not auth_header.startswith("Bearer "):
            return jsonify({
                "error": "Authorization token is required."
            }), 401

        token = auth_header.split(" ", 1)[1].strip()

        if not token:
            return jsonify({
                "error": "Authorization token is missing."
            }), 401

        try:
            decoded_token = firebase_auth.verify_id_token(token)

        except Exception:
            return jsonify({
                "error": "Invalid or expired authentication token."
            }), 401

        firebase_uid = decoded_token.get("uid")

        user = User.query.filter_by(
            firebase_uid=firebase_uid
        ).first()

        if not user:
            return jsonify({
                "error": "User profile not found."
            }), 403

        if user.status != "ACTIVE":
            return jsonify({
                "error": "User account is not active."
            }), 403

        # Store authenticated user for this request
        g.current_user = user
        g.firebase_user = decoded_token

        return f(*args, **kwargs)

    return decorated


def require_role(*allowed_roles):
    """
    Allow access only to users with one of the supplied roles.
    """

    def decorator(f):

        @wraps(f)
        def decorated(*args, **kwargs):

            user = getattr(g, "current_user", None)

            if not user:
                return jsonify({
                    "error": "Authentication required."
                }), 401

            if user.role not in allowed_roles:
                return jsonify({
                    "error": "You do not have permission to perform this action."
                }), 403

            return f(*args, **kwargs)

        return decorated

    return decorator