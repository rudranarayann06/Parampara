import json
import os

import firebase_admin
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials
from flask import g, jsonify, request

from models.user import User


# ---------------------------------------------------------
# Initialize Firebase Admin SDK
# ---------------------------------------------------------

if not firebase_admin._apps:

    firebase_service_account = os.getenv(
        "FIREBASE_SERVICE_ACCOUNT_JSON"
    )

    if firebase_service_account:

        service_account_info = json.loads(
            firebase_service_account
        )

        cred = credentials.Certificate(
            service_account_info
        )

        firebase_admin.initialize_app(
            cred,
            {
                "projectId": "parampara-27428"
            }
        )

    else:

        firebase_admin.initialize_app(
            options={
                "projectId": "parampara-27428"
            }
        )
# ---------------------------------------------------------
# Authentication
# ---------------------------------------------------------

def require_auth(f):
    """
    Require a valid Firebase ID token.

    The authenticated PARAMPARA user is stored in:
        g.current_user

    The decoded Firebase user is stored in:
        g.firebase_user
    """

    @wraps(f)
    def decorated(*args, **kwargs):

        # ---------------------------------------------
        # Read Authorization header
        # ---------------------------------------------

        auth_header = request.headers.get(
            "Authorization",
            ""
        ).strip()

        if not auth_header:
            return jsonify({
                "success": False,
                "error": {
                    "code": "AUTH_REQUIRED",
                    "message": "Authorization token is required."
                }
            }), 401

        # ---------------------------------------------
        # Validate Bearer format
        # ---------------------------------------------

        if not auth_header.startswith("Bearer "):

            return jsonify({
                "success": False,
                "error": {
                    "code": "INVALID_AUTH_HEADER",
                    "message": (
                        "Authorization header must use "
                        "Bearer <token> format."
                    )
                }
            }), 401

        token = auth_header[7:].strip()

        if not token:

            return jsonify({
                "success": False,
                "error": {
                    "code": "TOKEN_MISSING",
                    "message": "Authentication token is missing."
                }
            }), 401

        # ---------------------------------------------
        # Verify Firebase token
        # ---------------------------------------------

        try:

            decoded_token = firebase_auth.verify_id_token(
                token
            )

        except Exception:

            return jsonify({
                "success": False,
                "error": {
                    "code": "INVALID_TOKEN",
                    "message": (
                        "Invalid or expired authentication token."
                    )
                }
            }), 401

        # ---------------------------------------------
        # Get Firebase UID
        # ---------------------------------------------

        firebase_uid = decoded_token.get("uid")

        if not firebase_uid:

            return jsonify({
                "success": False,
                "error": {
                    "code": "INVALID_TOKEN",
                    "message": "Firebase user ID is missing."
                }
            }), 401

        # ---------------------------------------------
        # Find PARAMPARA user
        # ---------------------------------------------

        user = User.query.filter_by(
            firebase_uid=firebase_uid
        ).first()

        if not user:

            return jsonify({
                "success": False,
                "error": {
                    "code": "USER_NOT_FOUND",
                    "message": (
                        "Authenticated Firebase user does not "
                        "have a PARAMPARA profile."
                    )
                }
            }), 403

        # ---------------------------------------------
        # Check account status
        # ---------------------------------------------

        if user.status != "ACTIVE":

            return jsonify({
                "success": False,
                "error": {
                    "code": "ACCOUNT_INACTIVE",
                    "message": "Your PARAMPARA account is not active."
                }
            }), 403

        # ---------------------------------------------
        # Store authenticated identity
        # ---------------------------------------------

        g.current_user = user
        g.firebase_user = decoded_token

        return f(*args, **kwargs)

    return decorated


# ---------------------------------------------------------
# Role authorization
# ---------------------------------------------------------

def require_role(*allowed_roles):
    """
    Restrict an endpoint to one or more PARAMPARA roles.

    Example:

        @require_auth
        @require_role("REVIEWER", "ADMIN")
        def approve_recording(...):
            ...
    """

    def decorator(f):

        @wraps(f)
        def decorated(*args, **kwargs):

            user = getattr(
                g,
                "current_user",
                None
            )

            if not user:

                return jsonify({
                    "success": False,
                    "error": {
                        "code": "AUTH_REQUIRED",
                        "message": "Authentication required."
                    }
                }), 401

            if user.role not in allowed_roles:

                return jsonify({
                    "success": False,
                    "error": {
                        "code": "FORBIDDEN",
                        "message": (
                            "You do not have permission "
                            "to perform this action."
                        )
                    }
                }), 403

            return f(*args, **kwargs)

        return decorated

    return decorator