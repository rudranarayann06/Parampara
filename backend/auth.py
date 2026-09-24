from functools import wraps
from firebase_admin import auth as firebase_auth
from flask import g, jsonify, request
from extensions import db
from models.user import User
from services.firebase_service import initialize_firebase


def get_or_create_parampara_user(decoded_token):
    firebase_uid = decoded_token.get("uid")
    email = (decoded_token.get("email") or "").strip().lower() or None
    name = decoded_token.get("name") or email or "PARAMPARA User"
    if not firebase_uid:
        return None
    user = User.query.filter_by(firebase_uid=firebase_uid).first()
    claims = decoded_token.get("role") or decoded_token.get("parampara_role")
    if user:
        if claims in {"ADMIN", "REVIEWER", "COMMUNITY_KEEPER", "CONTRIBUTOR"} and user.role != claims:
            user.role = claims
            db.session.commit()
        return user
    if email:
        user = User.query.filter_by(email=email).first()
        if user:
            user.firebase_uid = firebase_uid
            user.name = user.name or name
            user.role = claims if claims in {"ADMIN", "REVIEWER", "COMMUNITY_KEEPER", "CONTRIBUTOR"} else (user.role or "CONTRIBUTOR")
            user.status = user.status or "ACTIVE"
            db.session.commit()
            return user
    user = User(firebase_uid=firebase_uid, name=name, email=email, role=claims if claims in {"ADMIN", "REVIEWER", "COMMUNITY_KEEPER", "CONTRIBUTOR"} else "CONTRIBUTOR", status="ACTIVE")
    db.session.add(user)
    db.session.commit()
    return user


def _verify_request_token():
    header = request.headers.get("Authorization", "").strip()
    if not header:
        return None
    if not header.startswith("Bearer "):
        raise ValueError("Authorization header must use Bearer <token> format.")
    token = header[7:].strip()
    if not token:
        raise ValueError("Authentication token is missing.")
    initialize_firebase()
    return firebase_auth.verify_id_token(token)


def _auth_error(exc):
    if isinstance(exc, firebase_auth.ExpiredIdTokenError):
        return jsonify({"success": False, "error": {"code": "TOKEN_EXPIRED", "message": "Authentication token has expired."}}), 401
    if isinstance(exc, firebase_auth.InvalidIdTokenError):
        return jsonify({"success": False, "error": {"code": "INVALID_TOKEN", "message": "Invalid Firebase authentication token."}}), 401
    if isinstance(exc, ValueError):
        return jsonify({"success": False, "error": {"code": "INVALID_AUTH_HEADER", "message": str(exc)}}), 401
    return jsonify({"success": False, "error": {"code": "AUTH_SERVICE_ERROR", "message": "Authentication service error."}}), 500


def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        try:
            decoded = _verify_request_token()
            if decoded is None:
                return jsonify({"success": False, "error": {"code": "AUTH_REQUIRED", "message": "Authorization token is required."}}), 401
            user = get_or_create_parampara_user(decoded)
            if not user or user.status != "ACTIVE":
                return jsonify({"success": False, "error": {"code": "ACCOUNT_INACTIVE", "message": "Your PARAMPARA account is not active."}}), 403
            g.current_user, g.firebase_user = user, decoded
            return f(*args, **kwargs)
        except Exception as exc:
            db.session.rollback()
            return _auth_error(exc)
    return decorated


def optional_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        try:
            decoded = _verify_request_token()
            if decoded:
                user = get_or_create_parampara_user(decoded)
                if not user or user.status != "ACTIVE":
                    return jsonify({"success": False, "error": {"code": "ACCOUNT_INACTIVE", "message": "Your PARAMPARA account is not active."}}), 403
                g.current_user, g.firebase_user = user, decoded
            else:
                import uuid
                guest = User(firebase_uid=None, name="Community Contributor", email=f"guest-{uuid.uuid4().hex}@parampara.local", role="CONTRIBUTOR", status="ACTIVE")
                db.session.add(guest)
                db.session.commit()
                g.current_user, g.firebase_user = guest, None
            return f(*args, **kwargs)
        except Exception as exc:
            db.session.rollback()
            return _auth_error(exc)
    return decorated


def require_role(*allowed_roles):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            user = getattr(g, "current_user", None)
            if not user:
                return jsonify({"success": False, "error": {"code": "AUTH_REQUIRED", "message": "Authentication required."}}), 401
            if user.role not in allowed_roles:
                return jsonify({"success": False, "error": {"code": "FORBIDDEN", "message": "You do not have permission to perform this action."}}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator
