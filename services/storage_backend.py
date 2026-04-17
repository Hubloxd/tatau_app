"""
Upload storage: local filesystem (default) or Google Cloud Storage (STORAGE_MODE=gcs).
"""
import os
import shutil
import uuid
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

STORAGE_MODE = os.getenv("STORAGE_MODE", "local").lower().strip()
LOCAL_UPLOAD_DIR = Path(os.getenv("LOCAL_UPLOAD_DIR", "uploads")).resolve()
PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL", "http://localhost:8000").rstrip("/")
STATIC_URL_PREFIX = "/static"


def _safe_filename(name: str) -> str:
    base = Path(name or "file").name
    return base if base else "file"


def store_uploaded_file(source_path: str, original_filename: str) -> str:
    """
    Persists a file from a temp path and returns a public URL for clients.
    """
    if STORAGE_MODE == "gcs":
        from google_cloud.client import BUCKET_NAME, upload_cs_file

        dest = f"uploads/{uuid.uuid4().hex}_{_safe_filename(original_filename)}"
        return upload_cs_file(BUCKET_NAME, source_path, dest)

    LOCAL_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    stored_name = f"{uuid.uuid4().hex}_{_safe_filename(original_filename)}"
    dest_path = LOCAL_UPLOAD_DIR / stored_name
    shutil.copy2(source_path, dest_path)
    return f"{PUBLIC_BASE_URL}{STATIC_URL_PREFIX}/{stored_name}"


def delete_stored_file(public_url: str) -> None:
    """Best-effort removal when deleting an image (local mode only)."""
    if STORAGE_MODE != "local":
        return
    prefix = f"{PUBLIC_BASE_URL}{STATIC_URL_PREFIX}/"
    if not public_url.startswith(prefix):
        return
    fname = public_url[len(prefix) :].lstrip("/")
    if not fname or ".." in fname:
        return
    path = LOCAL_UPLOAD_DIR / fname
    if path.is_file():
        path.unlink()
