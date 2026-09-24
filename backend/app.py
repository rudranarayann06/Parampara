import os
from pathlib import Path
from flask import Flask, jsonify, current_app
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from dotenv import load_dotenv
from sqlalchemy import text

from extensions import db
from models.user import User
from models.community import Community
from models.speaker import Speaker
from models.recording import Recording
from models.consent import Consent
from models.verification import Verification
from models.enrichment import TranscriptVersion, Translation, AuditEvent, HeritagePassport, CommunityVerification
from routes.recordings import recordings_bp
from routes.verifications import verifications_bp
from routes.auth import auth_bp

load_dotenv()

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "change-me-in-production")

database_url = os.getenv("DATABASE_URL", "sqlite:///parampara.db")
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)
app.config["SQLALCHEMY_DATABASE_URI"] = database_url
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["MAX_CONTENT_LENGTH"] = int(os.getenv("MAX_CONTENT_LENGTH", str(75 * 1024 * 1024)))

frontend_url = os.getenv("FRONTEND_URL", "https://rudranarayann06.github.io").rstrip("/")
allowed_origins = [frontend_url, "http://127.0.0.1:5500", "http://localhost:5500", "http://127.0.0.1:8000", "http://localhost:8000"]
allowed_origins += [x.strip().rstrip("/") for x in os.getenv("CORS_ORIGINS", "").split(",") if x.strip()]
CORS(app, resources={r"/api/*": {"origins": list(dict.fromkeys(allowed_origins)) + [r"https://.*\.github\.io"], "supports_credentials": False}})

base_dir = Path(__file__).resolve().parent
upload_folder = Path(os.getenv("UPLOAD_FOLDER", base_dir / "uploads"))
upload_folder.mkdir(parents=True, exist_ok=True)
app.config["UPLOAD_FOLDER"] = str(upload_folder)

db.init_app(app)

limiter = Limiter(key_func=get_remote_address, app=app, default_limits=["300 per hour"], storage_uri=os.getenv("RATELIMIT_STORAGE_URI", "memory://"))
app.register_blueprint(recordings_bp)
app.register_blueprint(verifications_bp)
app.register_blueprint(auth_bp)


@app.route("/")
def home():
    return jsonify({"status": "online", "project": "PARAMPARA", "version": "2026.1", "message": "Provenance-aware cultural archive API"})


@app.route("/api/health")
def health():
    try:
        db.session.execute(text("SELECT 1"))
        storage_mode = "firebase" if (os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON") or os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON_BASE64")) else ("local" if os.getenv("ALLOW_LOCAL_STORAGE_FALLBACK", "true").lower() == "true" else "not_configured")
        return jsonify({"status": "ok", "database": "connected", "storage": storage_mode, "translation": os.getenv("TRANSLATION_PROVIDER", "auto")})
    except Exception as exc:
        current_app.logger.exception("Health check failed")
        return jsonify({"status": "error", "database": "unavailable", "detail": str(exc)}), 503


@app.errorhandler(413)
def too_large(_):
    return jsonify({"error": "Audio file is too large."}), 413


@app.errorhandler(400)
def bad_request(_): return jsonify({"error": "Bad request."}), 400
@app.errorhandler(401)
def unauthorized(_): return jsonify({"error": "Authentication required."}), 401
@app.errorhandler(403)
def forbidden(_): return jsonify({"error": "Access denied."}), 403
@app.errorhandler(404)
def not_found(_): return jsonify({"error": "Resource not found."}), 404


@app.errorhandler(500)
def internal_server_error(_):
    current_app.logger.exception("Unhandled server error")
    return jsonify({"error": "Internal server error."}), 500


def bootstrap():
    with app.app_context():
        # Import every model before create_all().
        # This is important because Recording references
        # communities, speakers and users through foreign keys.
        from models.user import User
        from models.community import Community
        from models.speaker import Speaker
        from models.recording import Recording
        from models.consent import Consent
        from models.verification import Verification
        from models.enrichment import (
            TranscriptVersion,
            Translation,
            AuditEvent,
            HeritagePassport,
            CommunityVerification,
        )

        # Create all missing tables without deleting existing data.
        db.create_all()

        from sqlalchemy import inspect

        inspector = inspect(db.engine)
        tables = set(inspector.get_table_names())

        current_app.logger.info(
            "PARAMPARA database tables: %s",
            sorted(tables)
        )

        # These are the tables required by the reviewer workflow.
        required_tables = {
            "users",
            "communities",
            "speakers",
            "recordings",
            "consents",
            "verifications",
            "transcript_versions",
            "translations",
            "audit_events",
            "heritage_passports",
            "community_verifications",
        }

        missing_tables = required_tables - tables

        if missing_tables:
            current_app.logger.warning(
                "PARAMPARA missing database tables: %s",
                sorted(missing_tables)
            )

            # Run create_all() once more after all model imports.
            db.create_all()

            inspector = inspect(db.engine)
            tables = set(inspector.get_table_names())

            still_missing = required_tables - tables

            if still_missing:
                raise RuntimeError(
                    "PARAMPARA database is missing required tables: "
                    + ", ".join(sorted(still_missing))
                )

        # Keep existing prototype/Render databases compatible
        # without destructive migrations.
        legacy = {
            "recordings": {
                "language_code": "VARCHAR(32)",
                "category": "VARCHAR(100)",
                "state": "VARCHAR(100)",
                "district": "VARCHAR(100)",
                "community_name": "VARCHAR(255)",
            },
        }

        for table, cols in legacy.items():
            if table not in tables:
                continue

            existing = {
                c["name"]
                for c in inspector.get_columns(table)
            }

            for col, typ in cols.items():
                if col not in existing:
                    current_app.logger.info(
                        "Adding legacy column %s.%s",
                        table,
                        col
                    )

                    db.session.execute(
                        text(
                            f"ALTER TABLE {table} "
                            f"ADD COLUMN {col} {typ}"
                        )
                    )

        db.session.commit()

        # Create the system user if it does not already exist.
        system_user = User.query.filter_by(id=1).first()

        if not system_user:
            db.session.add(
                User(
                    id=1,
                    firebase_uid="parampara-system-user",
                    name="PARAMPARA System",
                    email="system@parampara.local",
                    role="ADMIN",
                    status="ACTIVE",
                )
            )
            db.session.commit()

        current_app.logger.info(
            "PARAMPARA database bootstrap completed successfully."
        )

bootstrap()

if __name__ == "__main__":
    app.run(host=os.getenv("HOST", "127.0.0.1"), port=int(os.getenv("PORT", "5000")), debug=os.getenv("FLASK_DEBUG", "false").lower() == "true")
