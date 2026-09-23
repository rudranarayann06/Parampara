import mimetypes
import os
import uuid
from io import BytesIO
from pathlib import Path

from werkzeug.utils import secure_filename
from firebase_admin import storage


ALLOWED_EXTENSIONS = {
    "mp3",
    "wav",
    "webm",
    "m4a",
    "ogg"
}


def allowed_file(filename):
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower()
        in ALLOWED_EXTENSIONS
    )


def save_audio(file, upload_folder):
    if not file or not file.filename:
        raise ValueError("No audio file provided")

    if not allowed_file(file.filename):
        raise ValueError("Unsupported audio format")

    original_name = secure_filename(file.filename)
    extension = original_name.rsplit(".", 1)[1].lower()
    unique_name = f"{uuid.uuid4()}.{extension}"

    os.makedirs(upload_folder, exist_ok=True)
    file_path = os.path.join(upload_folder, unique_name)
    file.save(file_path)

    return unique_name, file_path


def upload_audio_to_storage(file_path, object_name):
    """Upload audio to Firebase Storage and return a durable gs:// URI."""
    bucket = storage.bucket()
    blob = bucket.blob(object_name)
    content_type = mimetypes.guess_type(file_path)[0] or "application/octet-stream"
    blob.upload_from_filename(file_path, content_type=content_type)
    return f"gs://{bucket.name}/{object_name}"


def _storage_blob_from_uri(audio_path):
    if not audio_path.startswith("gs://"):
        return None

    value = audio_path[5:]
    bucket_name, object_name = value.split("/", 1)
    bucket = storage.bucket(bucket_name)
    return bucket.blob(object_name)


def read_audio(audio_path):
    """Return (BytesIO, mimetype) for either Firebase Storage or legacy local files."""
    blob = _storage_blob_from_uri(audio_path)

    if blob is not None:
        if not blob.exists():
            return None, None
        data = blob.download_as_bytes()
        mimetype = blob.content_type or "application/octet-stream"
        return BytesIO(data), mimetype

    path = Path(audio_path)
    if not path.exists():
        return None, None

    mimetype = mimetypes.guess_type(str(path))[0] or "application/octet-stream"
    return open(path, "rb"), mimetype


def delete_audio(audio_path):
    """Delete a Firebase Storage object or legacy local file."""
    if not audio_path:
        return

    blob = _storage_blob_from_uri(audio_path)
    if blob is not None:
        if blob.exists():
            blob.delete()
        return

    path = Path(audio_path)
    if path.exists():
        path.unlink()
