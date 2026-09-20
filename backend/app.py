import os

from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

from models.verification import Verification
from routes.recordings import recordings_bp
from routes.verifications import verifications_bp
from routes.auth import auth_bp

from extensions import db
import models


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
    "http://127.0.0.1:5500"
)

allowed_origins = [
    frontend_url,
    "http://127.0.0.1:5500",
    "http://localhost:5500"
]

# Remove duplicate origins
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
# Create database tables
# =========================================================

with app.app_context():

    db.create_all()


# =========================================================
# Start development server
# =========================================================

if __name__ == "__main__":

    app.run(
        debug=True,
        host="127.0.0.1",
        port=5000
    )