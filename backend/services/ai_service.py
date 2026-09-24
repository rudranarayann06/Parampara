import mimetypes
import os
import tempfile
from pathlib import Path


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
    client = speech_v2.SpeechClient()
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


def transcribe_local(file_path, language_code):
    """Transcribe a local prototype upload when Google credentials are configured.
    This keeps the free/local storage mode compatible with later cloud AI activation.
    """
    try:
        from google.cloud import speech_v1 as speech
    except ImportError as exc:
        raise RuntimeError("Google Cloud Speech client is not installed.") from exc
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError("Original audio file is unavailable.")
    data = path.read_bytes()
    if len(data) > 10 * 1024 * 1024:
        raise RuntimeError("Local speech fallback supports recordings up to 10 MB. Use GCS-backed transcription for longer audio.")
    suffix = path.suffix.lower()
    encoding_map = {
        ".webm": speech.RecognitionConfig.AudioEncoding.WEBM_OPUS,
        ".ogg": speech.RecognitionConfig.AudioEncoding.OGG_OPUS,
        ".wav": speech.RecognitionConfig.AudioEncoding.LINEAR16,
        ".flac": speech.RecognitionConfig.AudioEncoding.FLAC,
        ".mp3": speech.RecognitionConfig.AudioEncoding.MP3,
    }
    config_kwargs = {
        "language_code": _normalise_lang(language_code),
        "enable_automatic_punctuation": True,
        "model": os.getenv("SPEECH_V1_MODEL", "latest_long"),
    }
    if suffix in encoding_map:
        config_kwargs["encoding"] = encoding_map[suffix]
    audio = speech.RecognitionAudio(content=data)
    client = speech.SpeechClient()
    operation = client.long_running_recognize(config=speech.RecognitionConfig(**config_kwargs), audio=audio)
    response = operation.result(timeout=int(os.getenv("SPEECH_TIMEOUT_SECONDS", "600")))
    chunks, confidences = [], []
    for result in response.results:
        if not result.alternatives:
            continue
        alt = result.alternatives[0]
        chunks.append(alt.transcript)
        confidences.append(float(alt.confidence))
    text = " ".join(chunks).strip()
    return text, (sum(confidences) / len(confidences) if confidences else None), "Google Cloud Speech-to-Text (local upload)"


def transcribe_audio(audio_path, language_code):
    value = str(audio_path or "")
    if value.startswith("gs://"):
        return transcribe_gcs(value, language_code)

    if value.startswith("supabase://"):
        from services.audio_service import read_audio

        audio_file, _ = read_audio(value)
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
    client = translate_v3.TranslationServiceClient()
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
