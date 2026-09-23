from functools import wraps

from firebase_admin import auth as firebase_auth
from flask import g, jsonify, request

from extensions import db
from models.user import User
from services.firebase_service import initialize_firebase


# Initialize Firebase Admin once. Storage and Auth use the same app.
initialize_firebase()


def get_or_create_parampara_user(decoded_token):
    """Map a verified Firebase identity to the Render PostgreSQL user."""
    firebase_uid = decoded_token.get("uid")
    email = (decoded_token.get("email") or "").strip().lower() or None
    name = (
        decoded_token.get("name")
        or email
        or "PARAMPARA User"
    )

    if not firebase_uid:
        return None

    user = User.query.filter_by(firebase_uid=firebase_uid).first()
    if user:
        if user.status is None:
            user.status = "ACTIVE"
            db.session.commit()
        return user

    if email:
        user = User.query.filter_by(email=email).first()
        if user:
            user.firebase_uid = firebase_uid
            user.name = user.name or name
            user.role = user.role or "CONTRIBUTOR"
            user.status = user.status or "ACTIVE"
            db.session.commit()
            return user

    user = User(
        firebase_uid=firebase_uid,
        name=name,
        email=email,
        role="CONTRIBUTOR",
        status="ACTIVE",
    )
    db.session.add(user)
    db.session.commit()
    return user


def _verify_request_token():
    """Return decoded Firebase token or None when no Authorization header exists."""
    auth_header = request.headers.get("Authorization", "").strip()
    if not auth_header:
        return None

    if not auth_header.startswith("Bearer "):
        raise ValueError("Authorization header must use Bearer <token> format.")

    token = auth_header[7:].strip()
    if not token:
        raise ValueError("Authentication token is missing.")

    return firebase_auth.verify_id_token(token)


def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        try:
            decoded_token = _verify_request_token()
            if decoded_token is None:
                return jsonify({
                    "success": False,
                    "error": {
                        "code": "AUTH_REQUIRED",
                        "message": "Authorization token is required.",
                    },
                }), 401

            user = get_or_create_parampara_user(decoded_token)
            if not user:
                return jsonify({
                    "success": False,
                    "error": {
                        "code": "USER_NOT_FOUND",
                        "message": "Could not create PARAMPARA profile.",
                    },
                }), 500

            if user.status != "ACTIVE":
                return jsonify({
                    "success": False,
                    "error": {
                        "code": "ACCOUNT_INACTIVE",
                        "message": "Your PARAMPARA account is not active.",
                    },
                }), 403

            g.current_user = user
            g.firebase_user = decoded_token
            return f(*args, **kwargs)

        except firebase_auth.ExpiredIdTokenError:
            return jsonify({
                "success": False,
                "error": {
                    "code": "TOKEN_EXPIRED",
                    "message": "Authentication token has expired.",
                },
            }), 401
        except firebase_auth.InvalidIdTokenError:
            return jsonify({
                "success": False,
                "error": {
                    "code": "INVALID_TOKEN",
                    "message": "Invalid Firebase authentication token.",
                },
            }), 401
        except ValueError as exc:
            return jsonify({
                "success": False,
                "error": {
                    "code": "INVALID_AUTH_HEADER",
                    "message": str(exc),
                },
            }), 401
        except Exception as exc:
            db.session.rollback()
            print("Authentication error:", repr(exc))
            return jsonify({
                "success": False,
                "error": {
                    "code": "AUTH_SERVICE_ERROR",
                    "message": "Authentication service error.",
                },
            }), 500

    return decorated


def optional_auth(f):
    """Authenticate when a token is supplied; otherwise create an anonymous contributor."""
    @wraps(f)
    def decorated(*args, **kwargs):
        try:
            decoded_token = _verify_request_token()
            if decoded_token is not None:
                user = get_or_create_parampara_user(decoded_token)
                if not user:
                    return jsonify({
                        "success": False,
                        "error": {
                            "code": "USER_NOT_FOUND",
                            "message": "Could not create PARAMPARA profile.",
                        },
                    }), 500
                if user.status != "ACTIVE":
                    return jsonify({
                        "success": False,
                        "error": {
                            "code": "ACCOUNT_INACTIVE",
                            "message": "Your PARAMPARA account is not active.",
                        },
                    }), 403
                g.current_user = user
                g.firebase_user = decoded_token
            else:
                # The Preserve page is intentionally usable without login for the prototype.
                # A dedicated PostgreSQL contributor row preserves the FK requirement.
                import uuid
                guest_id = uuid.uuid4().hex
                guest = User(
                    firebase_uid=None,
                    name="Community Contributor",
                    email=f"guest-{guest_id}@parampara.local",
                    role="CONTRIBUTOR",
                    status="ACTIVE",
                )
                db.session.add(guest)
                db.session.flush()
                g.current_user = guest
                g.firebase_user = None

            return f(*args, **kwargs)

        except firebase_auth.ExpiredIdTokenError:
            return jsonify({
                "success": False,
                "error": {
                    "code": "TOKEN_EXPIRED",
                    "message": "Authentication token has expired.",
                },
            }), 401
        except firebase_auth.InvalidIdTokenError:
            return jsonify({
                "success": False,
                "error": {
                    "code": "INVALID_TOKEN",
                    "message": "Invalid Firebase authentication token.",
                },
            }), 401
        except ValueError as exc:
            return jsonify({
                "success": False,
                "error": {
                    "code": "INVALID_AUTH_HEADER",
                    "message": str(exc),
                },
            }), 401
        except Exception as exc:
            db.session.rollback()
            print("Optional authentication error:", repr(exc))
            return jsonify({
                "success": False,
                "error": {
                    "code": "PROFILE_CREATION_FAILED",
                    "message": "Could not create the PARAMPARA user profile.",
                    "detail": str(exc),
                },
            }), 500

    return decorated


def require_role(*allowed_roles):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            user = getattr(g, "current_user", None)
            if not user:
                return jsonify({
                    "success": False,
                    "error": {
                        "code": "AUTH_REQUIRED",
                        "message": "Authentication required.",
                    },
                }), 401

            if user.role not in allowed_roles:
                return jsonify({
                    "success": False,
                    "error": {
                        "code": "FORBIDDEN",
                        "message": "You do not have permission to perform this action.",
                    },
                }), 403

            return f(*args, **kwargs)
        return decorated
    return decorator
