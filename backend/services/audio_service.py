import mimetypes
import os
import uuid
from io import BytesIO
from pathlib import Path
from werkzeug.utils import secure_filename
from services.firebase_service import get_storage_bucket

ALLOWED_EXTENSIONS = {"mp3", "wav", "webm", "m4a", "ogg"}
MAX_AUDIO_BYTES = int(os.getenv("MAX_AUDIO_BYTES", str(75 * 1024 * 1024)))


def allowed_file(filename):
    return bool(filename) and "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def save_audio(file, upload_folder):
    if not file or not file.filename: raise ValueError("No audio file provided")
    if not allowed_file(file.filename): raise ValueError("Unsupported audio format. Use MP3, WAV, M4A, WEBM, or OGG.")
    original_name = secure_filename(file.filename)
    extension = original_name.rsplit(".", 1)[1].lower()
    unique_name = f"{uuid.uuid4()}.{extension}"
    os.makedirs(upload_folder, exist_ok=True)
    file_path = os.path.join(upload_folder, unique_name)
    file.save(file_path)
    if os.path.getsize(file_path) > MAX_AUDIO_BYTES:
        os.remove(file_path)
        raise ValueError(f"Audio file exceeds the {MAX_AUDIO_BYTES // (1024*1024)} MB limit.")
    return unique_name, file_path


def upload_audio_to_storage(file_path, object_name):
    """
    Upload audio to Firebase Storage when available.

    If Firebase Storage is unavailable and
    ALLOW_LOCAL_STORAGE_FALLBACK=true, keep the already-saved
    local file instead.
    """

    allow_local_fallback = (
        os.getenv("ALLOW_LOCAL_STORAGE_FALLBACK", "true").lower()
        == "true"
    )

    has_credentials = bool(
        os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
        or os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON_BASE64")
    )

    # No Firebase credentials -> use local storage.
    if not has_credentials:
        if allow_local_fallback:
            return file_path

        raise RuntimeError(
            "Firebase Storage credentials are not configured."
        )

    # Firebase credentials exist, so try Firebase Storage.
    try:
        bucket = get_storage_bucket()

        blob = bucket.blob(object_name)

        content_type = (
            mimetypes.guess_type(file_path)[0]
            or "application/octet-stream"
        )

        blob.upload_from_filename(
            file_path,
            content_type=content_type
        )

        return f"gs://{bucket.name}/{object_name}"

    except Exception:
        # Firebase Storage is unavailable.
        # For the SIH prototype, keep the locally saved file.
        if allow_local_fallback:
            return file_path

        raise


def _storage_blob_from_uri(audio_path):
    if not audio_path or not audio_path.startswith("gs://"): return None
    value = audio_path[5:]
    if "/" not in value: return None
    bucket_name, object_name = value.split("/", 1)
    if not bucket_name or not object_name: return None
    bucket = get_storage_bucket()
    if bucket.name != bucket_name:
        from firebase_admin import storage
        bucket = storage.bucket(name=bucket_name)
    return bucket.blob(object_name)


def read_audio(audio_path):
    blob = _storage_blob_from_uri(audio_path) if audio_path and audio_path.startswith("gs://") else None
    if blob is not None:
        if not blob.exists(): return None, None
        return BytesIO(blob.download_as_bytes()), blob.content_type or "application/octet-stream"
    if audio_path and audio_path.startswith("gs://"): return None, None
    if os.getenv("ALLOW_LOCAL_STORAGE_FALLBACK", "true").lower() != "true": return None, None
    path = Path(audio_path or "")
    if not path.exists() or not path.is_file(): return None, None
    return open(path, "rb"), mimetypes.guess_type(str(path))[0] or "application/octet-stream"


def delete_audio(audio_path):
    if not audio_path: return
    if audio_path.startswith("gs://"):
        blob = _storage_blob_from_uri(audio_path)
        if blob is not None and blob.exists(): blob.delete()
        return
    if os.getenv("ALLOW_LOCAL_STORAGE_FALLBACK", "true").lower() == "true":
        path = Path(audio_path)
        if path.exists(): path.unlink()
