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
from sqlalchemy import text, inspect


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
# Create database tables and keep older Render PostgreSQL schemas
# compatible with the current models.
# =========================================================
def ensure_legacy_columns():
    inspector = inspect(db.engine)
    definitions = {
        "users": {
            "firebase_uid": "VARCHAR(255)",
            "name": "VARCHAR(255)",
            "email": "VARCHAR(255)",
            "role": "VARCHAR(50)",
            "status": "VARCHAR(50)",
        },
        "recordings": {
            "description": "TEXT",
            "audio_filename": "VARCHAR(255)",
            "audio_path": "VARCHAR(500)",
            "audio_hash": "VARCHAR(64)",
            "language": "VARCHAR(100)",
            "speaker_id": "INTEGER",
            "community_id": "INTEGER",
            "location": "VARCHAR(255)",
            "recorded_at": "TIMESTAMP",
            "duration": "DOUBLE PRECISION",
            "access_level": "VARCHAR(50)",
            "created_by": "INTEGER",
            "created_at": "TIMESTAMP",
        },
        "consents": {
            "archive_allowed": "BOOLEAN",
            "transcription_allowed": "BOOLEAN",
            "translation_allowed": "BOOLEAN",
            "research_allowed": "BOOLEAN",
            "public_access_allowed": "BOOLEAN",
            "commercial_use_allowed": "BOOLEAN",
            "ai_processing_allowed": "BOOLEAN",
            "ai_training_allowed": "BOOLEAN",
            "consent_method": "VARCHAR(100)",
            "consent_date": "TIMESTAMP",
        },
        "verifications": {
            "reviewer_id": "INTEGER",
            "reviewer_notes": "TEXT",
            "reviewed_at": "TIMESTAMP",
            "created_at": "TIMESTAMP",
        },
    }
    dialect = db.engine.dialect.name
    tables = set(inspector.get_table_names())
    for table, columns in definitions.items():
        if table not in tables:
            continue
        existing = {column["name"] for column in inspector.get_columns(table)}
        for column, sql_type in columns.items():
            if column not in existing:
                db.session.execute(text(
                    f"ALTER TABLE {table} ADD COLUMN {column} {sql_type}"
                ))
    if "users" in tables and dialect == "postgresql":
        db.session.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_users_firebase_uid "
            "ON users (firebase_uid) WHERE firebase_uid IS NOT NULL"
        ))
    db.session.commit()


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
    ensure_legacy_columns()

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
