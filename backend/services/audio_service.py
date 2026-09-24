import mimetypes
import os
import tempfile
import uuid
from io import BytesIO
from pathlib import Path
from urllib.parse import quote

import requests
from werkzeug.utils import secure_filename

from services.firebase_service import get_storage_bucket

ALLOWED_EXTENSIONS = {"mp3", "wav", "webm", "m4a", "ogg"}
MAX_AUDIO_BYTES = int(os.getenv("MAX_AUDIO_BYTES", str(75 * 1024 * 1024)))


def allowed_file(filename):
    return bool(filename) and "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def save_audio(file, upload_folder):
    if not file or not file.filename:
        raise ValueError("No audio file provided")
    if not allowed_file(file.filename):
        raise ValueError("Unsupported audio format. Use MP3, WAV, M4A, WEBM, or OGG.")
    original_name = secure_filename(file.filename)
    extension = original_name.rsplit(".", 1)[1].lower()
    unique_name = f"{uuid.uuid4()}.{extension}"
    os.makedirs(upload_folder, exist_ok=True)
    file_path = os.path.join(upload_folder, unique_name)
    file.save(file_path)
    if os.path.getsize(file_path) > MAX_AUDIO_BYTES:
        os.remove(file_path)
        raise ValueError(f"Audio file exceeds the {MAX_AUDIO_BYTES // (1024 * 1024)} MB limit.")
    return unique_name, file_path


def _supabase_configured():
    return bool(os.getenv("SUPABASE_URL", "").strip() and os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip())


def _supabase_base_url():
    return os.getenv("SUPABASE_URL", "").strip().rstrip("/")


def _supabase_bucket():
    return os.getenv("SUPABASE_AUDIO_BUCKET", "parampara-audio").strip()


def _supabase_headers(content_type=None):
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    headers = {
        "Authorization": f"Bearer {key}",
        "apikey": key,
    }
    if content_type:
        headers["Content-Type"] = content_type
    return headers


def _supabase_object_url(bucket, object_name):
    return f"{_supabase_base_url()}/storage/v1/object/{quote(bucket, safe='')}/{quote(object_name, safe='/')}"


def _parse_supabase_uri(audio_path):
    if not audio_path or not audio_path.startswith("supabase://"):
        return None, None
    value = audio_path[len("supabase://"):]
    if "/" not in value:
        return None, None
    bucket, object_name = value.split("/", 1)
    return bucket, object_name


def _upload_supabase(file_path, object_name):
    bucket = _supabase_bucket()
    url = _supabase_object_url(bucket, object_name)
    content_type = mimetypes.guess_type(file_path)[0] or "application/octet-stream"
    headers = _supabase_headers(content_type)
    headers["Content-Length"] = str(os.path.getsize(file_path))
    headers["x-upsert"] = "false"

    with open(file_path, "rb") as source:
        response = requests.post(url, headers=headers, data=source, timeout=(20, 180))
    if response.status_code not in {200, 201}:
        detail = response.text[:500].strip()
        raise RuntimeError(f"Supabase Storage upload failed ({response.status_code}): {detail or 'unknown error'}")
    return f"supabase://{bucket}/{object_name}"


def upload_audio_to_storage(file_path, object_name):
    # Supabase is the durable production backend. Firebase remains supported
    # for existing records and as a migration fallback.
    if _supabase_configured():
        return _upload_supabase(file_path, object_name)

    has_credentials = bool(
        os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
        or os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON_BASE64")
    )
    if has_credentials:
        bucket = get_storage_bucket()
        blob = bucket.blob(object_name)
        content_type = mimetypes.guess_type(file_path)[0] or "application/octet-stream"
        blob.upload_from_filename(file_path, content_type=content_type)
        return f"gs://{bucket.name}/{object_name}"

    if os.getenv("ALLOW_LOCAL_STORAGE_FALLBACK", "false").lower() == "true":
        return file_path
    raise RuntimeError(
        "Durable audio storage is not configured. Set SUPABASE_URL and "
        "SUPABASE_SERVICE_ROLE_KEY on Render."
    )


def _storage_blob_from_uri(audio_path):
    if not audio_path or not audio_path.startswith("gs://"):
        return None
    value = audio_path[5:]
    if "/" not in value:
        return None
    bucket_name, object_name = value.split("/", 1)
    if not bucket_name or not object_name:
        return None
    bucket = get_storage_bucket()
    if bucket.name != bucket_name:
        from firebase_admin import storage
        bucket = storage.bucket(name=bucket_name)
    return bucket.blob(object_name)

def _read_supabase(audio_path):
    bucket, object_name = _parse_supabase_uri(audio_path)

    print(f"[SUPABASE AUDIO] bucket={bucket}")
    print(f"[SUPABASE AUDIO] object={object_name}")
    print(f"[SUPABASE AUDIO] configured={_supabase_configured()}")

    if not bucket or not object_name or not _supabase_configured():
        print("[SUPABASE AUDIO] Configuration/path missing")
        return None, None

    url = _supabase_object_url(bucket, object_name)
    print(f"[SUPABASE AUDIO] URL={url}")

    try:
        response = requests.get(
            url,
            headers=_supabase_headers(),
            stream=True,
            timeout=(20, 180),
        )

        print(f"[SUPABASE AUDIO] status={response.status_code}")

        if response.status_code != 200:
            print(f"[SUPABASE AUDIO] error={response.text[:1000]}")
            response.close()
            return None, None

        stream = tempfile.SpooledTemporaryFile(
            max_size=8 * 1024 * 1024,
            mode="w+b",
        )

        for chunk in response.iter_content(chunk_size=1024 * 1024):
            if chunk:
                stream.write(chunk)

        mimetype = (
            response.headers.get("Content-Type")
            or mimetypes.guess_type(object_name)[0]
            or "application/octet-stream"
        )

        response.close()
        stream.seek(0)

        print(f"[SUPABASE AUDIO] SUCCESS mimetype={mimetype}")

        return stream, mimetype

    except Exception as exc:
        print(f"[SUPABASE AUDIO] EXCEPTION: {type(exc).__name__}: {exc}")
        return None, None
def read_audio(audio_path):
    if audio_path and audio_path.startswith("supabase://"):
        return _read_supabase(audio_path)

    blob = _storage_blob_from_uri(audio_path) if audio_path and audio_path.startswith("gs://") else None
    if blob is not None:
        if not blob.exists():
            return None, None
        return BytesIO(blob.download_as_bytes()), blob.content_type or "application/octet-stream"
    if audio_path and audio_path.startswith("gs://"):
        return None, None
    if os.getenv("ALLOW_LOCAL_STORAGE_FALLBACK", "false").lower() != "true":
        return None, None
    path = Path(audio_path or "")
    if not path.exists() or not path.is_file():
        return None, None
    return open(path, "rb"), mimetypes.guess_type(str(path))[0] or "application/octet-stream"


def delete_audio(audio_path):
    if not audio_path:
        return

    if audio_path.startswith("supabase://"):
        bucket, object_name = _parse_supabase_uri(audio_path)
        if not bucket or not object_name or not _supabase_configured():
            return
        url = f"{_supabase_base_url()}/storage/v1/object/{quote(bucket, safe='')}/{quote(object_name, safe='/')}"
        response = requests.delete(url, headers=_supabase_headers(), timeout=30)
        if response.status_code not in {200, 204}:
            raise RuntimeError(f"Supabase Storage delete failed ({response.status_code}): {response.text[:300]}")
        return

    if audio_path.startswith("gs://"):
        blob = _storage_blob_from_uri(audio_path)
        if blob is not None and blob.exists():
            blob.delete()
        return

    if os.getenv("ALLOW_LOCAL_STORAGE_FALLBACK", "false").lower() == "true":
        path = Path(audio_path)
        if path.exists():
            path.unlink()
