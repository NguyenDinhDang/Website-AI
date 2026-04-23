"""
HTMX-powered web UI routes.
These routes render HTML templates and use cookie-based auth for browser flows.
"""

from pathlib import Path

from fastapi import APIRouter, Cookie, Depends, File, Form, Request, Response, UploadFile
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppException, UnauthorizedError
from app.core.security import decode_token
from app.database.session import get_db
from app.models.quiz import Quiz
from app.models.user import User
from app.schemas.ai import ChatRequest, QuizRequest
from app.schemas.auth import RegisterRequest
from app.services import (
    auth_service,
    chat_service,
    document_service,
    progress_service,
    quiz_service,
    summarize_service,
)

router = APIRouter()
templates = Jinja2Templates(directory=str(Path(__file__).resolve().parents[1] / "templates"))


def _set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    cookie_kwargs = {"httponly": True, "samesite": "lax", "path": "/"}
    response.set_cookie("access_token", access_token, **cookie_kwargs)
    response.set_cookie("refresh_token", refresh_token, **cookie_kwargs)


def _clear_session_cookies(response: Response) -> None:
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    response.delete_cookie("active_document_id", path="/")


async def _get_user_from_access_token(token: str | None, db: AsyncSession) -> User | None:
    if not token:
        return None

    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        return None

    result = await db.execute(select(User).where(User.id == int(payload["sub"])))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        return None
    return user


async def get_web_user(
    access_token: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> User:
    user = await _get_user_from_access_token(access_token, db)
    if not user:
        raise UnauthorizedError("Please sign in to continue")
    return user


async def _build_page_context(
    request: Request,
    db: AsyncSession,
    user: User,
    active_document_id: int | None,
) -> dict:
    documents = await document_service.list_documents(user.id, db)
    progress = await progress_service.get_progress(user.id, db)
    history = await chat_service.get_chat_history(user.id, active_document_id, db)

    result = await db.execute(
        select(Quiz).where(Quiz.user_id == user.id).order_by(Quiz.created_at.desc()).limit(5)
    )
    recent_quizzes = result.scalars().all()
    active_document = next((doc for doc in documents.items if doc.id == active_document_id), None)

    return {
        "request": request,
        "user": user,
        "documents": documents.items,
        "documents_total": documents.total,
        "progress": progress,
        "chat_history": history,
        "active_document_id": active_document_id,
        "active_document": active_document,
        "recent_quizzes": recent_quizzes,
        "tool_title": None,
        "tool_body": None,
        "auth_error": None,
    }


@router.get("/", response_class=HTMLResponse)
async def index(
    request: Request,
    db: AsyncSession = Depends(get_db),
    access_token: str | None = Cookie(default=None),
    active_document_id: int | None = Cookie(default=None),
):
    user = await _get_user_from_access_token(access_token, db)
    if not user:
        return templates.TemplateResponse(
            "index.html",
            {"request": request, "user": None, "auth_error": None},
        )

    context = await _build_page_context(request, db, user, active_document_id)
    return templates.TemplateResponse("index.html", context)


@router.post("/web/auth/login", response_class=HTMLResponse)
async def web_login(
    request: Request,
    email: str = Form(...),
    password: str = Form(...),
    db: AsyncSession = Depends(get_db),
):
    try:
        tokens = await auth_service.login(email, password, db)
    except AppException as exc:
        return templates.TemplateResponse(
            "partials/auth_shell.html",
            {"request": request, "auth_error": exc.detail},
        )
    user = await _get_user_from_access_token(tokens.access_token, db)

    rendered = templates.TemplateResponse(
        "partials/app_shell.html",
        await _build_page_context(request, db, user, None),
    )
    rendered.headers["HX-Push-Url"] = "/"
    _set_auth_cookies(rendered, tokens.access_token, tokens.refresh_token)
    return rendered


@router.post("/web/auth/register", response_class=HTMLResponse)
async def web_register(
    request: Request,
    email: str = Form(...),
    username: str = Form(...),
    password: str = Form(...),
    full_name: str = Form(default=""),
    db: AsyncSession = Depends(get_db),
):
    try:
        await auth_service.register(
            RegisterRequest(email=email, username=username, password=password, full_name=full_name),
            db,
        )
        tokens = await auth_service.login(email, password, db)
    except AppException as exc:
        return templates.TemplateResponse(
            "partials/auth_shell.html",
            {"request": request, "auth_error": exc.detail},
        )
    user = await _get_user_from_access_token(tokens.access_token, db)

    rendered = templates.TemplateResponse(
        "partials/app_shell.html",
        await _build_page_context(request, db, user, None),
    )
    rendered.headers["HX-Push-Url"] = "/"
    _set_auth_cookies(rendered, tokens.access_token, tokens.refresh_token)
    return rendered


@router.post("/web/auth/logout")
async def web_logout():
    response = RedirectResponse("/", status_code=303)
    _clear_session_cookies(response)
    return response


@router.post("/web/documents/select/{doc_id}", response_class=HTMLResponse)
async def select_document(
    request: Request,
    doc_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_web_user),
):
    context = await _build_page_context(request, db, user, doc_id)
    rendered = templates.TemplateResponse("partials/workspace.html", context)
    rendered.set_cookie("active_document_id", str(doc_id), samesite="lax", path="/")
    return rendered


@router.post("/web/documents", response_class=HTMLResponse)
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_web_user),
):
    doc = await document_service.upload_document(file, user.id, db)
    context = await _build_page_context(request, db, user, doc.id)
    rendered = templates.TemplateResponse("partials/workspace.html", context)
    rendered.set_cookie("active_document_id", str(doc.id), samesite="lax", path="/")
    return rendered


@router.delete("/web/documents/{doc_id}", response_class=HTMLResponse)
async def delete_document(
    request: Request,
    doc_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_web_user),
    active_document_id: int | None = Cookie(default=None),
):
    await document_service.delete_document(doc_id, user.id, db)
    next_active = None if active_document_id == doc_id else active_document_id
    context = await _build_page_context(request, db, user, next_active)
    rendered = templates.TemplateResponse("partials/workspace.html", context)
    if next_active:
        rendered.set_cookie("active_document_id", str(next_active), samesite="lax", path="/")
    else:
        rendered.delete_cookie("active_document_id", path="/")
    return rendered


@router.post("/web/chat", response_class=HTMLResponse)
async def web_chat(
    request: Request,
    message: str = Form(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_web_user),
    active_document_id: int | None = Cookie(default=None),
):
    clean_message = message.strip()
    if not clean_message:
        context = await _build_page_context(request, db, user, active_document_id)
        context["tool_title"] = "Thong bao"
        context["tool_body"] = "Hay nhap cau hoi truoc khi gui."
        return templates.TemplateResponse("partials/workspace.html", context)

    await chat_service.handle_chat(
        ChatRequest(message=clean_message, document_id=active_document_id),
        user.id,
        db,
    )
    context = await _build_page_context(request, db, user, active_document_id)
    return templates.TemplateResponse("partials/workspace.html", context)


@router.post("/web/tools/summary", response_class=HTMLResponse)
async def summarize_document(
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_web_user),
    active_document_id: int | None = Cookie(default=None),
):
    context = await _build_page_context(request, db, user, active_document_id)
    if not active_document_id:
        context["tool_title"] = "Thong bao"
        context["tool_body"] = "Chon mot tai lieu truoc khi tom tat."
        return templates.TemplateResponse("partials/workspace.html", context)

    summary = await summarize_service.summarize_document(active_document_id, user.id, db)
    context["tool_title"] = "Tom tat tai lieu"
    context["tool_body"] = summary.summary
    return templates.TemplateResponse("partials/workspace.html", context)


@router.post("/web/tools/quiz", response_class=HTMLResponse)
async def generate_quiz(
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_web_user),
    active_document_id: int | None = Cookie(default=None),
):
    context = await _build_page_context(request, db, user, active_document_id)
    if not active_document_id:
        context["tool_title"] = "Thong bao"
        context["tool_body"] = "Chon mot tai lieu truoc khi tao quiz."
        return templates.TemplateResponse("partials/workspace.html", context)

    await quiz_service.generate_quiz(
        QuizRequest(document_id=active_document_id, num_questions=3),
        user.id,
        db,
    )
    context = await _build_page_context(request, db, user, active_document_id)
    context["tool_title"] = "Quiz moi"
    return templates.TemplateResponse("partials/workspace.html", context)


@router.get("/web/chat/panel", response_class=HTMLResponse)
async def chat_panel(
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_web_user),
    active_document_id: int | None = Cookie(default=None),
):
    context = await _build_page_context(request, db, user, active_document_id)
    return templates.TemplateResponse("partials/workspace.html", context)


@router.get("/web/right-panel", response_class=HTMLResponse)
async def right_panel(
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_web_user),
    active_document_id: int | None = Cookie(default=None),
):
    context = await _build_page_context(request, db, user, active_document_id)
    return templates.TemplateResponse("partials/workspace.html", context)
