import os
import uuid
from werkzeug.utils import secure_filename


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

    file_path = os.path.join(
        upload_folder,
        unique_name
    )

    file.save(file_path)

    return unique_name, file_path