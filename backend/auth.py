import json
import os
from functools import wraps

import firebase_admin
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials
from flask import g, jsonify, request

from extensions import db
from models.user import User


# =========================================================
# Firebase Admin initialization
# =========================================================

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
                "projectId": os.getenv(
                    "FIREBASE_PROJECT_ID",
                    "parampara-27428"
                ),
                "storageBucket": os.getenv(
                    "FIREBASE_STORAGE_BUCKET"
                )
            }
        )

    else:

        firebase_admin.initialize_app(
            options={
                "projectId": os.getenv(
                    "FIREBASE_PROJECT_ID",
                    "parampara-27428"
                ),
                "storageBucket": os.getenv(
                    "FIREBASE_STORAGE_BUCKET"
                )
            }
        )


# =========================================================
# Create / retrieve PARAMPARA PostgreSQL profile
# =========================================================

def get_or_create_parampara_user(decoded_token):

    firebase_uid = decoded_token.get("uid")
    email = decoded_token.get("email")
    name = (
        decoded_token.get("name")
        or decoded_token.get("email")
        or "PARAMPARA User"
    )

    if not firebase_uid:
        return None

    # -----------------------------------------------------
    # 1. Find by Firebase UID
    # -----------------------------------------------------

    user = User.query.filter_by(
        firebase_uid=firebase_uid
    ).first()

    if user:
        return user

    # -----------------------------------------------------
    # 2. If UID isn't linked, try matching email
    # -----------------------------------------------------

    if email:

        user = User.query.filter_by(
            email=email
        ).first()

        if user:

            user.firebase_uid = firebase_uid

            if not user.name:
                user.name = name

            if not user.status:
                user.status = "ACTIVE"

            db.session.commit()

            return user

    # -----------------------------------------------------
    # 3. Create new PostgreSQL PARAMPARA profile
    # -----------------------------------------------------

    user = User(
        firebase_uid=firebase_uid,
        name=name,
        email=email,
        role="CONTRIBUTOR",
        status="ACTIVE"
    )

    db.session.add(user)
    db.session.commit()

    return user


# =========================================================
# Authentication
# =========================================================

def require_auth(f):

    @wraps(f)
    def decorated(*args, **kwargs):

        # -------------------------------------------------
        # Authorization header
        # -------------------------------------------------

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

        # -------------------------------------------------
        # Bearer token
        # -------------------------------------------------

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

        # -------------------------------------------------
        # Verify Firebase ID token
        # -------------------------------------------------

        try:

            decoded_token = firebase_auth.verify_id_token(
                token
            )

        except firebase_auth.ExpiredIdTokenError:

            return jsonify({
                "success": False,
                "error": {
                    "code": "TOKEN_EXPIRED",
                    "message": "Authentication token has expired."
                }
            }), 401

        except firebase_auth.InvalidIdTokenError:

            return jsonify({
                "success": False,
                "error": {
                    "code": "INVALID_TOKEN",
                    "message": "Invalid Firebase authentication token."
                }
            }), 401

        except Exception as e:

            print(
                "Firebase token verification error:",
                repr(e)
            )

            return jsonify({
                "success": False,
                "error": {
                    "code": "AUTH_SERVICE_ERROR",
                    "message": "Authentication service error."
                }
            }), 500

        # -------------------------------------------------
        # Firebase UID
        # -------------------------------------------------

        firebase_uid = decoded_token.get("uid")

        if not firebase_uid:

            return jsonify({
                "success": False,
                "error": {
                    "code": "INVALID_TOKEN",
                    "message": "Firebase user ID is missing."
                }
            }), 401

        # -------------------------------------------------
        # Get or create PostgreSQL PARAMPARA profile
        # -------------------------------------------------

        try:

            user = get_or_create_parampara_user(
                decoded_token
            )

        except Exception as e:

            db.session.rollback()

            print(
                "PARAMPARA profile creation error:",
                repr(e)
            )

            return jsonify({
                "success": False,
                "error": {
                    "code": "PROFILE_CREATION_FAILED",
                    "message": (
                        "Could not create the PARAMPARA user profile."
                    )
                }
            }), 500

        if not user:

            return jsonify({
                "success": False,
                "error": {
                    "code": "USER_NOT_FOUND",
                    "message": "Could not create PARAMPARA profile."
                }
            }), 500

        # -------------------------------------------------
        # Account status
        # -------------------------------------------------

        if user.status != "ACTIVE":

            return jsonify({
                "success": False,
                "error": {
                    "code": "ACCOUNT_INACTIVE",
                    "message": "Your PARAMPARA account is not active."
                }
            }), 403

        # -------------------------------------------------
        # Store authenticated identity
        # -------------------------------------------------

        g.current_user = user
        g.firebase_user = decoded_token

        return f(*args, **kwargs)

    return decorated


# =========================================================
# Role authorization
# =========================================================

def require_role(*allowed_roles):

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