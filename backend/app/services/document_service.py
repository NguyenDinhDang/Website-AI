"""
Document Service — upload, list, retrieve, delete
"""

import logging
from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.document import Document
from app.models.progress import Progress
from app.utils.file_handler import save_upload, extract_text, delete_file
from app.core.exceptions import NotFoundError, ForbiddenError
from app.schemas.document import DocumentResponse, DocumentListResponse

logger = logging.getLogger(__name__)


async def upload_document(
    file: UploadFile,
    user_id: int,
    db: AsyncSession,
) -> DocumentResponse:
    file_path, size = await save_upload(file)
    ext = file.filename.rsplit(".", 1)[-1].lower()
    content = extract_text(file_path, ext)

    doc = Document(
        owner_id=user_id,
        title=file.filename,
        filename=file.filename,
        file_path=file_path,
        file_type=ext,
        file_size=size,
        content=content,
    )
    db.add(doc)

    # Increment user progress counter
    await _bump_progress(user_id, "total_documents", db)

    await db.commit()
    await db.refresh(doc)
    logger.info("Document uploaded: id=%d user=%d", doc.id, user_id)
    return DocumentResponse.model_validate(doc)


async def list_documents(user_id: int, db: AsyncSession) -> DocumentListResponse:
    result = await db.execute(
        select(Document).where(Document.owner_id == user_id).order_by(Document.created_at.desc())
    )
    docs = result.scalars().all()
    return DocumentListResponse(
        items=[DocumentResponse.model_validate(d) for d in docs],
        total=len(docs),
    )


async def get_document(doc_id: int, user_id: int, db: AsyncSession) -> Document:
    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalar_one_or_none()

    if not doc:
        raise NotFoundError("Document")
    if doc.owner_id != user_id:
        raise ForbiddenError()
    return doc


async def delete_document(doc_id: int, user_id: int, db: AsyncSession) -> None:
    doc = await get_document(doc_id, user_id, db)
    delete_file(doc.file_path)
    await db.delete(doc)
    await db.commit()
    logger.info("Document deleted: id=%d user=%d", doc_id, user_id)


# ── Internal ──────────────────────────────────────────────────────────────────

async def _bump_progress(user_id: int, field: str, db: AsyncSession) -> None:
    result = await db.execute(select(Progress).where(Progress.user_id == user_id))
    prog = result.scalar_one_or_none()
    if prog:
        setattr(prog, field, getattr(prog, field) + 1)
