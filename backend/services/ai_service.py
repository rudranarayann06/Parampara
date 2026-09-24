import mimetypes
import os
import tempfile
from pathlib import Path




def _google_credentials():
    """Build Google credentials from the same Render service-account secret used by Firebase.

    Google client libraries otherwise fall back to Application Default Credentials, which
    do not exist on a normal Render service unless GOOGLE_APPLICATION_CREDENTIALS is set.
    """
    try:
        from google.oauth2 import service_account
    except ImportError as exc:
        raise RuntimeError("Google authentication dependencies are not installed.") from exc

    raw = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON", "").strip()
    if raw:
        import json
        try:
            value = json.loads(raw)
            if isinstance(value, str):
                value = json.loads(value)
            if isinstance(value, dict) and value.get("client_email") and value.get("private_key"):
                return service_account.Credentials.from_service_account_info(value)
        except Exception as exc:
            raise RuntimeError("FIREBASE_SERVICE_ACCOUNT_JSON is configured but is not valid service-account JSON.") from exc

    encoded = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON_BASE64", "").strip()
    if encoded:
        import base64, json
        try:
            value = json.loads(base64.b64decode(encoded).decode("utf-8"))
            if isinstance(value, dict) and value.get("client_email") and value.get("private_key"):
                return service_account.Credentials.from_service_account_info(value)
        except Exception as exc:
            raise RuntimeError("FIREBASE_SERVICE_ACCOUNT_JSON_BASE64 is configured but is invalid.") from exc

    credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "").strip()
    if credentials_path:
        return service_account.Credentials.from_service_account_file(credentials_path)

    # Preserve normal ADC behaviour if the deployment explicitly provides ADC.
    return None


def _google_client_credentials():
    creds = _google_credentials()
    return {"credentials": creds} if creds is not None else {}


def _normalise_lang(code):
    value = (code or "en-IN").strip().replace("_", "-")
    aliases = {"odia": "or-IN", "ଓଡ଼ିଆ": "or-IN", "hindi": "hi-IN", "हिन्दी": "hi-IN", "english": "en-IN", "bengali": "bn-IN", "বাংলা": "bn-IN"}
    value = aliases.get(value.lower(), value)
    return value


def _translate_lang(code):
    value = _normalise_lang(code)
    return value.split("-")[0].lower()


def transcribe_gcs(gcs_uri, language_code):
    try:
        from google.cloud import speech_v2
    except ImportError as exc:
        raise RuntimeError("Google Cloud Speech client is not installed.") from exc
    if not gcs_uri.startswith("gs://"):
        raise ValueError("GCS transcription requires a gs:// source.")
    project_id = os.getenv("GOOGLE_CLOUD_PROJECT") or os.getenv("FIREBASE_PROJECT_ID")
    if not project_id:
        raise RuntimeError("GOOGLE_CLOUD_PROJECT is not configured.")
    client = speech_v2.SpeechClient(**_google_client_credentials())
    recognizer = f"projects/{project_id}/locations/global/recognizers/_"
    config = speech_v2.RecognitionConfig(
        auto_decoding_config=speech_v2.AutoDetectDecodingConfig(),
        language_codes=[_normalise_lang(language_code)],
        model=os.getenv("SPEECH_MODEL", "long"),
    )
    request = speech_v2.BatchRecognizeRequest(
        recognizer=recognizer,
        config=config,
        files=[speech_v2.BatchRecognizeFileMetadata(uri=gcs_uri)],
        recognition_output_config=speech_v2.RecognitionOutputConfig(inline_response_config=speech_v2.InlineOutputConfig()),
    )
    operation = client.batch_recognize(request=request)
    response = operation.result(timeout=int(os.getenv("SPEECH_TIMEOUT_SECONDS", "600")))
    file_result = response.results.get(gcs_uri) or next(iter(response.results.values()), None)
    if not file_result:
        raise RuntimeError("Speech-to-text returned no result.")
    chunks, confidences = [], []
    for result in file_result.transcript.results:
        if not result.alternatives:
            continue
        alt = result.alternatives[0]
        chunks.append(alt.transcript)
        confidences.append(float(alt.confidence))
    text = " ".join(chunks).strip()
    return text, (sum(confidences) / len(confidences) if confidences else None), "Google Cloud Speech-to-Text"


def _transcribe_file_via_gcs(file_path, language_code, filename=None, mimetype=None):
    """Upload a local recording to GCS and use Speech-to-Text V2 BatchRecognize.

    Speech-to-Text rejects sufficiently long inline audio with:
    "Inline audio exceeds duration limit. Please use a GCS URI."
    The Preserve flow can receive an upload as a local file, so stage that file
    temporarily in the configured Firebase/GCS bucket and submit a gs:// URI.
    The object is deleted after transcription completes.
    """
    # Do NOT assume FIREBASE_STORAGE_BUCKET is a valid GCS bucket.
    # Firebase web config can contain a *.firebasestorage.app name that is not
    # the actual GCS bucket available to the service account. Use the Google
    # Cloud Storage client and select the first bucket that actually exists.
    try:
        from google.cloud import storage as gcs_storage
    except ImportError as exc:
        raise RuntimeError("Google Cloud Storage client is not installed.") from exc

    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError("Original audio file is unavailable.")

    credentials = _google_credentials()
    project_id = (
        os.getenv("GOOGLE_CLOUD_PROJECT")
        or os.getenv("FIREBASE_PROJECT_ID")
        or "parampara-27428"
    ).strip()

    client_kwargs = {"project": project_id}
    if credentials is not None:
        client_kwargs["credentials"] = credentials
    client = gcs_storage.Client(**client_kwargs)

    configured = [
        os.getenv("SPEECH_GCS_BUCKET", "").strip(),
        os.getenv("GOOGLE_CLOUD_STORAGE_BUCKET", "").strip(),
        os.getenv("GCS_BUCKET", "").strip(),
        os.getenv("FIREBASE_STORAGE_BUCKET", "").strip(),
    ]

    # Common Firebase/GCS bucket names. The *.firebasestorage.app value is
    # intentionally not trusted; the *.appspot.com form is also checked.
    configured.extend([
        f"{project_id}.appspot.com",
        f"{project_id}.firebasestorage.app",
        project_id,
    ])

    bucket = None
    checked = []
    seen = set()
    for name in configured:
        if not name or name in seen:
            continue
        seen.add(name)
        checked.append(name)
        try:
            candidate = client.bucket(name)
            if candidate.exists(client=client):
                bucket = candidate
                break
        except Exception:
            continue

    if bucket is None:
        raise RuntimeError(
            "No usable Google Cloud Storage bucket was found for long-audio transcription. "
            "Set SPEECH_GCS_BUCKET to an existing GCS bucket in the same project. "
            f"Checked: {', '.join(checked)}"
        )

    safe_name = Path(filename or path.name).name or "recording.webm"
    import uuid
    object_name = f"speech-tmp/{uuid.uuid4().hex}-{safe_name}"
    blob = bucket.blob(object_name)

    try:
        blob.upload_from_filename(
            str(path),
            content_type=mimetype or mimetypes.guess_type(safe_name)[0] or "application/octet-stream",
        )
        return transcribe_gcs(f"gs://{bucket.name}/{object_name}", language_code)
    finally:
        try:
            blob.delete()
        except Exception:
            # Cleanup failure must not hide a successful transcription.
            pass


def transcribe_local(file_path, language_code, filename=None, mimetype=None):
    """Transcribe a local upload through a temporary GCS object.

    Do not send long recordings inline to Speech-to-Text V1; Google rejects
    them once they exceed the inline-duration limit.
    """
    return _transcribe_file_via_gcs(
        file_path,
        language_code,
        filename=filename,
        mimetype=mimetype,
    )


def transcribe_recording(recording, language_code):
    """Transcribe a DB recording after resolving its durable audio object."""
    from services.audio_service import read_audio_for_recording

    # GCS-native objects can be passed directly to Speech-to-Text.
    stored = str(getattr(recording, "audio_path", "") or "")
    if stored.startswith("gs://"):
        try:
            return transcribe_gcs(stored, language_code)
        except Exception:
            # Fall through to the durable resolver; older records may point to
            # a stale Firebase object path.
            pass

    audio_file, mimetype, resolved = read_audio_for_recording(recording)
    if audio_file is None:
        raise FileNotFoundError("Original audio file is unavailable in durable storage.")

    filename = getattr(recording, "audio_filename", "") or "recording.webm"
    suffix = Path(filename).suffix or ".webm"
    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp:
            temp_path = temp.name
            while True:
                chunk = audio_file.read(1024 * 1024)
                if not chunk:
                    break
                temp.write(chunk)
        return transcribe_local(temp_path, language_code, filename=filename, mimetype=mimetype)
    finally:
        try:
            audio_file.close()
        except Exception:
            pass
        if temp_path:
            try:
                os.remove(temp_path)
            except OSError:
                pass

def transcribe_audio(audio_path, language_code):
    value = str(audio_path or "")
    if value.startswith("gs://"):
        return transcribe_gcs(value, language_code)

    if value.startswith("supabase://"):
        from services.audio_service import read_audio_candidates

        bucket = os.getenv("SUPABASE_AUDIO_BUCKET", "parampara-audio")
        candidates = []
        name = value.split("/", 3)[-1] if value.startswith("supabase://") else ""
        # The caller's stored URI is tried first; this branch primarily handles
        # migrated records whose URI points at an older object key.
        audio_file, _, _ = read_audio_candidates(value, candidates)
        if audio_file is None:
            raise FileNotFoundError("Original audio file is unavailable in durable storage.")

        suffix = Path(value.split("/", 1)[-1]).suffix or ".webm"
        temp_path = None
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp:
                temp_path = temp.name
                while True:
                    chunk = audio_file.read(1024 * 1024)
                    if not chunk:
                        break
                    temp.write(chunk)
            return transcribe_local(temp_path, language_code)
        finally:
            try:
                audio_file.close()
            except Exception:
                pass
            if temp_path:
                try:
                    os.remove(temp_path)
                except OSError:
                    pass

    return transcribe_local(value, language_code)


def _translate_google(text, source_language, target_language):
    try:
        from google.cloud import translate_v3
    except ImportError as exc:
        raise RuntimeError("Google Cloud Translation client is not installed.") from exc
    project_id = os.getenv("GOOGLE_CLOUD_PROJECT") or os.getenv("FIREBASE_PROJECT_ID")
    if not project_id:
        raise RuntimeError("GOOGLE_CLOUD_PROJECT is not configured.")
    client = translate_v3.TranslationServiceClient(**_google_client_credentials())
    parent = f"projects/{project_id}/locations/global"
    response = client.translate_text(request={"parent": parent, "source_language_code": _translate_lang(source_language), "target_language_code": _translate_lang(target_language), "mime_type": "text/plain", "contents": [text]})
    translated = "\n".join(t.translated_text for t in response.translations).strip()
    return translated, "Google Cloud Translation"


def _translate_mymemory(text, source_language, target_language):
    import requests
    source = _translate_lang(source_language)
    target = _translate_lang(target_language)
    if source == target:
        return text, "Identity translation (same language)"
    params = {"q": text[:5000], "langpair": f"{source}|{target}"}
    email = os.getenv("MYMEMORY_EMAIL", "").strip()
    if email:
        params["de"] = email
    response = requests.get("https://api.mymemory.translated.net/get", params=params, timeout=20, headers={"User-Agent": "PARAMPARA/2026"})
    response.raise_for_status()
    data = response.json()
    translated = ((data.get("responseData") or {}).get("translatedText") or "").strip()
    if not translated:
        raise RuntimeError("Free translation provider returned no translation.")
    return translated, "MyMemory free translation fallback"


def translate_text(text, source_language, target_language):
    if not text.strip():
        raise ValueError("Transcript is empty.")
    provider = os.getenv("TRANSLATION_PROVIDER", "auto").lower()
    has_google = bool(os.getenv("GOOGLE_CLOUD_PROJECT") and (os.getenv("GOOGLE_APPLICATION_CREDENTIALS") or os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON") or os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON_BASE64")))
    if provider in {"google", "auto"} and has_google:
        return _translate_google(text, source_language, target_language)
    if provider in {"mymemory", "auto", "free"}:
        return _translate_mymemory(text, source_language, target_language)
    raise RuntimeError("No translation provider is configured. Set TRANSLATION_PROVIDER=mymemory for the free fallback or configure Google Cloud Translation.")
