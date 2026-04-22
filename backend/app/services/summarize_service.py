"""
Summarize Service — generate and cache document summaries
"""

import logging
from sqlalchemy.ext.asyncio import AsyncSession

from app.services import ai_service
from app.services.document_service import get_document
from app.utils.text_splitter import truncate
from app.schemas.ai import SummarizeResponse

logger = logging.getLogger(__name__)


async def summarize_document(doc_id: int, user_id: int, db: AsyncSession) -> SummarizeResponse:
    doc = await get_document(doc_id, user_id, db)

    # Return cached summary if available
    if doc.summary:
        logger.info("Returning cached summary for doc id=%d", doc_id)
        return SummarizeResponse(document_id=doc_id, summary=doc.summary)

    text = truncate(doc.content or "", max_chars=6000)
    if not text:
        return SummarizeResponse(document_id=doc_id, summary="Tài liệu không có nội dung để tóm tắt.")

    summary = await ai_service.summarize(text)

    # Cache it
    doc.summary = summary
    await db.commit()

    return SummarizeResponse(document_id=doc_id, summary=summary)
