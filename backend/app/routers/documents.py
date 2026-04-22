"""
Documents router — /api/v1/documents
POST   /           upload
GET    /           list
GET    /{id}       detail
DELETE /{id}       delete
"""

from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.dependencies.auth import get_current_user
from app.schemas.document import DocumentResponse, DocumentListResponse
from app.services import document_service
from app.models.user import User

router = APIRouter()


@router.post("/", response_model=DocumentResponse, status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a PDF, TXT, MD, or DOCX file. Text is extracted automatically."""
    return await document_service.upload_document(file, current_user.id, db)


@router.get("/", response_model=DocumentListResponse)
async def list_documents(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all documents owned by the current user."""
    return await document_service.list_documents(current_user.id, db)


@router.get("/{doc_id}", response_model=DocumentResponse)
async def get_document(
    doc_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single document's metadata."""
    doc = await document_service.get_document(doc_id, current_user.id, db)
    return DocumentResponse.model_validate(doc)


@router.delete("/{doc_id}", status_code=204)
async def delete_document(
    doc_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a document and its file from disk."""
    await document_service.delete_document(doc_id, current_user.id, db)
