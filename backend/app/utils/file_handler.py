"""
File upload utilities: validation, saving, and text extraction
Supports: pdf, txt, md, docx
"""

import os
import uuid
import logging
from pathlib import Path
from fastapi import UploadFile

from app.core.config import settings
from app.core.exceptions import BadRequestError

logger = logging.getLogger(__name__)


def _ensure_upload_dir() -> Path:
    path = Path(settings.UPLOAD_DIR)
    path.mkdir(parents=True, exist_ok=True)
    return path


def validate_file(file: UploadFile) -> str:
    """Returns file extension or raises BadRequestError."""
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise BadRequestError(f"File type '.{ext}' not allowed. Accepted: {settings.ALLOWED_EXTENSIONS}")
    return ext


async def save_upload(file: UploadFile) -> tuple[str, int]:
    """Save file to disk. Returns (file_path, size_bytes)."""
    ext = validate_file(file)
    upload_dir = _ensure_upload_dir()

    unique_name = f"{uuid.uuid4().hex}.{ext}"
    dest = upload_dir / unique_name

    content = await file.read()
    size = len(content)

    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    if size > max_bytes:
        raise BadRequestError(f"File exceeds {settings.MAX_FILE_SIZE_MB} MB limit")

    dest.write_bytes(content)
    logger.info("Saved upload: %s (%d bytes)", dest, size)
    return str(dest), size


def extract_text(file_path: str, file_type: str) -> str:
    """Extract plain text from a saved file."""
    path = Path(file_path)
    if not path.exists():
        logger.warning("File not found for extraction: %s", file_path)
        return ""

    try:
        if file_type in ("txt", "md"):
            return path.read_text(encoding="utf-8", errors="ignore")

        if file_type == "pdf":
            return _extract_pdf(path)

        if file_type == "docx":
            return _extract_docx(path)

    except Exception as exc:
        logger.error("Text extraction failed for %s: %s", file_path, exc)

    return ""


def _extract_pdf(path: Path) -> str:
    import pdfplumber
    texts = []
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            t = page.extract_text()
            if t:
                texts.append(t)
    return "\n".join(texts)


def _extract_docx(path: Path) -> str:
    import docx
    doc = docx.Document(str(path))
    return "\n".join(p.text for p in doc.paragraphs if p.text.strip())


def delete_file(file_path: str) -> None:
    """Remove file from disk (best-effort)."""
    try:
        Path(file_path).unlink(missing_ok=True)
    except Exception as exc:
        logger.warning("Could not delete file %s: %s", file_path, exc)
