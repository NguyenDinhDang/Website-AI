"""
File upload utilities: validation, saving, and text extraction
Supports: pdf, txt, md, docx
"""

import uuid
import logging
from pathlib import Path, PurePosixPath
from fastapi import UploadFile

from app.core.config import settings
from app.core.exceptions import BadRequestError

logger = logging.getLogger(__name__)

# Map allowed extension → expected MIME types (magic-bytes based).
# A file whose content does not match any of these is rejected even if its
# filename extension looks valid (extension-spoofing defence).
_ALLOWED_MIMES: dict[str, set[str]] = {
    "pdf":  {"application/pdf"},
    "txt":  {"text/plain"},
    "md":   {"text/plain", "text/markdown", "text/x-markdown"},
    "docx": {
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/zip",  # python-magic sometimes reports OOXML as zip
    },
}


def _ensure_upload_dir() -> Path:
    path = Path(settings.UPLOAD_DIR)
    path.mkdir(parents=True, exist_ok=True)
    return path


def _safe_filename(raw: str) -> str:
    """Strip path components from an untrusted filename (prevent path traversal)."""
    return PurePosixPath(raw).name or "upload"


def _validate_extension(filename: str) -> str:
    """Return the lowercase extension or raise BadRequestError."""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise BadRequestError(
            f"File type '.{ext}' not allowed. "
            f"Accepted: {sorted(settings.ALLOWED_EXTENSIONS)}"
        )
    return ext


def _validate_mime(content: bytes, ext: str, filename: str) -> None:
    """
    Check the file's actual MIME type against the declared extension.
    Uses python-magic (libmagic) when available; skips check with a warning
    if the library is not installed so existing dev environments are not broken.
    """
    try:
        import magic  # python-magic; optional but strongly recommended in prod
        detected = magic.from_buffer(content[:4096], mime=True)
        allowed = _ALLOWED_MIMES.get(ext, set())
        if detected not in allowed:
            logger.warning(
                "MIME mismatch for '%s': declared ext=%s, detected=%s",
                filename, ext, detected,
            )
            raise BadRequestError(
                f"File content does not match its extension "
                f"(detected '{detected}', expected one of {sorted(allowed)}). "
                "Upload rejected."
            )
    except ImportError:
        # python-magic not installed — log once so operators notice
        logger.warning(
            "python-magic not installed; MIME-type validation is DISABLED. "
            "Install with: pip install python-magic"
        )


async def save_upload(file: UploadFile) -> tuple[str, int]:
    """
    Validate, size-check, MIME-check, then persist the upload to disk.
    Returns (file_path, size_bytes).

    Size is checked from Content-Length first (fast path) before reading
    the full body, preventing memory exhaustion from oversized uploads.
    """
    safe_name = _safe_filename(file.filename or "upload")
    ext = _validate_extension(safe_name)

    # Fast-path size check via Content-Length before reading body into RAM.
    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    if file.size is not None and file.size > max_bytes:
        raise BadRequestError(
            f"File exceeds the {settings.MAX_FILE_SIZE_MB} MB limit "
            f"({file.size / 1024 / 1024:.1f} MB received)."
        )

    content = await file.read()
    size = len(content)

    if size > max_bytes:
        raise BadRequestError(
            f"File exceeds the {settings.MAX_FILE_SIZE_MB} MB limit "
            f"({size / 1024 / 1024:.1f} MB received)."
        )

    # MIME-type validation (magic-bytes, not just extension)
    _validate_mime(content, ext, safe_name)

    upload_dir = _ensure_upload_dir()
    dest = upload_dir / f"{uuid.uuid4().hex}.{ext}"
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
