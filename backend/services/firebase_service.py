import base64
import json
import os
from pathlib import Path

import firebase_admin
from firebase_admin import credentials, storage


DEFAULT_PROJECT_ID = "parampara-27428"
DEFAULT_BUCKET = "parampara-27428.firebasestorage.app"


def _load_service_account():
    raw = os.getenv(
        "FIREBASE_SERVICE_ACCOUNT_JSON",
        ""
    ).strip()

    if raw:
        try:
            value = json.loads(raw)

            # Handles JSON that has accidentally been
            # JSON-encoded one extra time.
            if isinstance(value, str):
                value = json.loads(value)

            if not isinstance(value, dict):
                raise ValueError(
                    "Service account JSON must be an object."
                )

            return value

        except Exception as exc:

            raise RuntimeError(
                "FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON."
            ) from exc


    encoded = os.getenv(
        "FIREBASE_SERVICE_ACCOUNT_JSON_BASE64",
        ""
    ).strip()

    if encoded:

        try:

            decoded = base64.b64decode(
                encoded
            ).decode("utf-8")

            value = json.loads(decoded)

            if not isinstance(value, dict):
                raise ValueError(
                    "Service account JSON must be an object."
                )

            return value

        except Exception as exc:

            raise RuntimeError(
                "FIREBASE_SERVICE_ACCOUNT_JSON_BASE64 is invalid."
            ) from exc


    credentials_path = os.getenv(
        "GOOGLE_APPLICATION_CREDENTIALS",
        ""
    ).strip()

    if (
        credentials_path
        and Path(credentials_path).exists()
    ):
        return None


    return None


def initialize_firebase():

    if firebase_admin._apps:

        return firebase_admin.get_app()


    project_id = os.getenv(
        "FIREBASE_PROJECT_ID",
        DEFAULT_PROJECT_ID
    ).strip()


    bucket_name = os.getenv(
        "FIREBASE_STORAGE_BUCKET",
        DEFAULT_BUCKET
    ).strip()


    service_account = (
        _load_service_account()
    )


    options = {
        "projectId": project_id,
        "storageBucket": bucket_name,
    }


    if service_account:

        return firebase_admin.initialize_app(
            credentials.Certificate(
                service_account
            ),
            options=options
        )


    return firebase_admin.initialize_app(
        options=options
    )


def get_storage_bucket():

    initialize_firebase()

    bucket_name = os.getenv(
        "FIREBASE_STORAGE_BUCKET",
        DEFAULT_BUCKET
    ).strip()

    return storage.bucket(
        name=bucket_name
    )