import os

from flask import Flask, jsonify, current_app
from flask_cors import CORS
from dotenv import load_dotenv

from models.verification import Verification
from models.user import User
from routes.recordings import recordings_bp
from routes.verifications import verifications_bp
from routes.auth import auth_bp

from extensions import db
import models
from sqlalchemy import text


# =========================================================
# Load environment variables
# =========================================================

load_dotenv()


# =========================================================
# Create Flask application
# =========================================================

app = Flask(__name__)

# =========================================================
# Configuration
# =========================================================

app.config["SECRET_KEY"] = os.getenv(
    "SECRET_KEY",
    "parampara-development-secret"
)


# Database
database_url = os.getenv(
    "DATABASE_URL",
    "sqlite:///parampara.db"
)

# Render/PostgreSQL may provide the older postgres:// scheme.
if database_url.startswith("postgres://"):
    database_url = database_url.replace(
        "postgres://",
        "postgresql://",
        1
    )

app.config["SQLALCHEMY_DATABASE_URI"] = database_url

app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False


# =========================================================
# CORS
# =========================================================

frontend_url = os.getenv(
    "FRONTEND_URL",
    "https://rudranarayann06.github.io"
).rstrip("/")

allowed_origins = [
    frontend_url,
    "https://rudranarayann06.github.io",
    "http://127.0.0.1:5500",
    "http://localhost:5500"
]

# Optional comma-separated extra origins for future deployments.
extra_origins = os.getenv("CORS_ORIGINS", "")
allowed_origins.extend(
    origin.strip().rstrip("/")
    for origin in extra_origins.split(",")
    if origin.strip()
)

allowed_origins = list(dict.fromkeys(allowed_origins))

CORS(
    app,
    resources={
        r"/api/*": {
            "origins": allowed_origins
        }
    }
)


# =========================================================
# Audio upload folder
# =========================================================

BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

UPLOAD_FOLDER = os.getenv(
    "UPLOAD_FOLDER",
    os.path.join(BASE_DIR, "uploads")
)

os.makedirs(
    UPLOAD_FOLDER,
    exist_ok=True
)

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER


# =========================================================
# Initialize database
# =========================================================

db.init_app(app)


# =========================================================
# Register API routes
# =========================================================

app.register_blueprint(recordings_bp)
app.register_blueprint(verifications_bp)
app.register_blueprint(auth_bp)

# =========================================================
# Health check
# =========================================================

@app.route("/")
def home():

    return jsonify({
        "status": "online",
        "project": "PARAMPARA",
        "message": "Cultural Archive Backend is running"
    })
    # =========================================================
# Health check
# =========================================================

@app.route("/api/health", methods=["GET"])
def health():

    try:
        db.session.execute(text("SELECT 1"))

        return jsonify({
            "status": "ok",
            "database": "connected"
        }), 200

    except Exception:
        current_app.logger.exception(
            "Health check failed"
        )

        return jsonify({
            "status": "error",
            "database": "unavailable"
        }), 503
# =========================================================
# Create database tables and seed system user
# =========================================================
@app.errorhandler(400)
def bad_request(error):
    return jsonify({
        "error": "Bad request."
    }), 400


@app.errorhandler(401)
def unauthorized(error):
    return jsonify({
        "error": "Authentication required."
    }), 401


@app.errorhandler(403)
def forbidden(error):
    return jsonify({
        "error": "Access denied."
    }), 403


@app.errorhandler(404)
def not_found(error):
    return jsonify({
        "error": "Resource not found."
    }), 404


@app.errorhandler(500)
def internal_server_error(error):
    current_app.logger.exception(
        "Unhandled server error"
    )

    return jsonify({
        "error": "Internal server error."
    }), 500
with app.app_context():

    db.create_all()

    # PARAMPARA demo/system contributor.
    # This provides the initial creator referenced by
    # the current contribution workflow.
    system_user = User.query.filter_by(id=1).first()

    if not system_user:

        system_user = User(
            id=1,
            firebase_uid="parampara-system-user",
            name="PARAMPARA System Contributor",
            email="system@parampara.local",
            role="CONTRIBUTOR",
            status="ACTIVE"
        )

        db.session.add(system_user)
        db.session.commit()


# =========================================================
# Start development server
# =========================================================

if __name__ == "__main__":

    app.run(
        debug=True,
        host="127.0.0.1",
        port=5000
    )
