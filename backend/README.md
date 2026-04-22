<div align="center">

# AI Learning Assistant — Backend

**FastAPI · PostgreSQL · OpenAI · JWT · Alembic**

*Hệ thống backend hỗ trợ học tập thông minh sử dụng AI tạo sinh*

[![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o--mini-412991?style=flat-square&logo=openai&logoColor=white)](https://openai.com)

</div>

---

## Kiến trúc tổng thể

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                      │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP / JSON
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    FastAPI Application                        │
│                                                               │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌───────────┐  │
│  │  /auth   │  │/documents │  │   /ai    │  │ /progress │  │
│  └────┬─────┘  └─────┬─────┘  └────┬─────┘  └─────┬─────┘  │
│       │               │             │               │         │
│  ┌────▼───────────────▼─────────────▼───────────────▼─────┐  │
│  │              Services Layer                              │  │
│  │  auth · document · chat · quiz · summarize · progress   │  │
│  └────────────────────────┬─────────────────────────────┘  │
│                           │                                   │
│  ┌────────────────────────▼─────────────────────────────┐   │
│  │                 AI Service (ai_service.py)            │   │
│  │     summarize · generate_quiz · chat_qa · explain     │   │
│  └────────────────────────┬─────────────────────────────┘   │
└──────────────────────────┬┼────────────────────────────────┘
                           ││
          ┌────────────────┘└─────────────────┐
          ▼                                    ▼
┌─────────────────┐                ┌──────────────────────┐
│   PostgreSQL DB  │                │    OpenAI API        │
│                  │                │  (gpt-4o-mini)       │
│  users           │                │                      │
│  documents       │                │  /chat/completions   │
│  chats           │                └──────────────────────┘
│  quizzes         │
│  progress        │
└─────────────────┘
```

---

## Cấu trúc thư mục

```
backend/
├── app/
│   ├── main.py                      # Entry point — app factory
│   ├── core/
│   │   ├── config.py                # Settings từ .env (pydantic-settings)
│   │   ├── security.py              # JWT + bcrypt
│   │   ├── logging.py               # Structured logging
│   │   └── exceptions.py            # Custom exceptions + handlers
│   ├── routers/
│   │   ├── auth.py                  # POST /register /login /refresh, GET /me
│   │   ├── documents.py             # CRUD + GET /content
│   │   ├── ai.py                    # /summarize /quiz /chat /explain /grade
│   │   └── progress.py              # GET / DELETE tiến độ
│   ├── services/
│   │   ├── ai_service.py            # ← MỌI lời gọi LLM đều ở đây
│   │   ├── auth_service.py          # register, login, refresh
│   │   ├── document_service.py      # upload, list, get, delete
│   │   ├── chat_service.py          # handle_chat, get_history
│   │   ├── quiz_service.py          # generate_quiz, grade_quiz
│   │   ├── summarize_service.py     # summarize + cache
│   │   └── progress_service.py      # get, reset
│   ├── models/
│   │   ├── user.py                  # SQLAlchemy ORM
│   │   ├── document.py
│   │   ├── chat.py
│   │   ├── quiz.py
│   │   └── progress.py
│   ├── schemas/
│   │   ├── auth.py                  # Pydantic v2 request/response
│   │   ├── document.py
│   │   ├── ai.py
│   │   └── progress.py
│   ├── utils/
│   │   ├── file_handler.py          # validate, save, extract text
│   │   └── text_splitter.py         # chunk_text, truncate
│   ├── database/
│   │   └── session.py               # async engine + get_db()
│   └── dependencies/
│       └── auth.py                  # get_current_user()
├── migrations/
│   ├── env.py                       # Alembic async config
│   ├── script.py.mako
│   └── versions/
│       └── 0001_initial_schema.py   # Create 5 tables
├── tests/
│   ├── conftest.py                  # fixtures: client, auth_headers
│   ├── test_auth.py
│   ├── test_progress.py
│   └── test_health.py
├── alembic.ini
├── requirements.txt
├── Dockerfile                       # Multi-stage build
├── docker-compose.yml               # api + postgres
├── run.py                           # python run.py shortcut
└── .env.example
```

---

## ⚡ Cài đặt nhanh

### Option A — Docker (khuyên dùng)

```bash
git clone <repo> && cd backend
cp .env.example .env
# Điền OPENAI_API_KEY vào .env
docker-compose up --build
```

> API tự động chạy migration và khởi động tại **http://localhost:8000**

### Option B — Local

```bash
# 1. Môi trường
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# 2. Config
cp .env.example .env
# Sửa DATABASE_URL, JWT_SECRET_KEY, OPENAI_API_KEY

# 3. Database
createdb ai_learning
alembic upgrade head

# 4. Chạy
python run.py
# hoặc: uvicorn app.main:app --reload --port 8000
```

---

## API Endpoints

### Auth — `/api/v1/auth`

| Method | Endpoint | Body | Mô tả |
|--------|----------|------|-------|
| `POST` | `/register` | `{email, username, password}` | Đăng ký |
| `POST` | `/login` | `{email, password}` | Đăng nhập → JWT |
| `POST` | `/refresh` | `{refresh_token}` | Làm mới token |
| `GET`  | `/me` | — | Thông tin user |

### Documents — `/api/v1/documents`

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `POST`   | `/` | Upload file (pdf/txt/md/docx/pptx) |
| `GET`    | `/` | Danh sách tài liệu |
| `GET`    | `/{id}` | Chi tiết tài liệu |
| `GET`    | `/{id}/content` | Raw text đã extract |
| `DELETE` | `/{id}` | Xóa tài liệu + file |

### AI — `/api/v1/ai`

| Method | Endpoint | Body | Mô tả |
|--------|----------|------|-------|
| `POST` | `/summarize` | `{document_id}` | Tóm tắt (cache lần 2+) |
| `POST` | `/generate-quiz` | `{document_id, num_questions}` | Sinh trắc nghiệm |
| `POST` | `/chat` | `{message, document_id?}` | Hỏi đáp AI |
| `POST` | `/explain` | `{text, document_id?}` | Giải thích đoạn văn |
| `POST` | `/grade` | `{quiz_id, selected_index}` | Chấm bài + feedback |
| `GET`  | `/chat/history` | `?document_id=` | Lịch sử chat |

### Progress — `/api/v1/progress`

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET`    | `/` | Thống kê học tập |
| `DELETE` | `/` | Reset thống kê |

---

## Ví dụ sử dụng

### 1. Đăng ký + Đăng nhập

```bash
# Đăng ký
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"student@edu.vn","username":"student01","password":"Pass1234"}'

# Đăng nhập
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"student@edu.vn","password":"Pass1234"}'
# → {"access_token":"eyJ...","refresh_token":"eyJ...","token_type":"bearer"}
```

### 2. Upload tài liệu

```bash
curl -X POST http://localhost:8000/api/v1/documents/ \
  -H "Authorization: Bearer <token>" \
  -F "file=@machine_learning.pdf"
# → {"id":1,"title":"machine_learning.pdf","file_type":"pdf",...}
```

### 3. Chat hỏi đáp

```bash
curl -X POST http://localhost:8000/api/v1/ai/chat \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"message":"Gradient descent hoạt động như thế nào?","document_id":1}'
# → {"answer":"Gradient descent là thuật toán tối ưu...","document_id":1}
```

### 4. Sinh quiz

```bash
curl -X POST http://localhost:8000/api/v1/ai/generate-quiz \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"document_id":1,"num_questions":3}'
# → {"questions":[{"question":"...","options":["A","B","C","D"],"correct_index":1,...}]}
```

### 5. Chấm bài

```bash
curl -X POST http://localhost:8000/api/v1/ai/grade \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"quiz_id":1,"selected_index":1}'
# → {"is_correct":true,"explanation":"Đúng! Vì...","correct_index":1}
```

---

## Chạy Tests

```bash
pip install pytest pytest-asyncio httpx aiosqlite
pytest -v
```

```
tests/test_health.py::test_health                    PASSED
tests/test_auth.py::test_register_success            PASSED
tests/test_auth.py::test_login_success               PASSED
tests/test_auth.py::test_login_wrong_password        PASSED
tests/test_auth.py::test_me_authenticated            PASSED
tests/test_progress.py::test_get_progress            PASSED
tests/test_progress.py::test_reset_progress          PASSED
```

---

## Biến môi trường

| Key | Mặc định | Mô tả |
|-----|----------|-------|
| `DATABASE_URL` | `postgresql+asyncpg://...` | PostgreSQL async URL |
| `JWT_SECRET_KEY` | *(bắt buộc)* | `openssl rand -hex 32` |
| `OPENAI_API_KEY` | *(bắt buộc)* | API key từ platform.openai.com |
| `OPENAI_MODEL_NAME` | `gpt-4o-mini` | Model sử dụng |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | 24 giờ |
| `MAX_FILE_SIZE_MB` | `50` | Giới hạn upload |
| `ALLOWED_EXTENSIONS` | `pdf,txt,md,docx,pptx` | Định dạng cho phép |
| `ENV` | `development` | `development` / `production` |

---

## Tech Stack

| Layer | Công nghệ | Version |
|-------|-----------|---------|
| Framework | FastAPI + Uvicorn | 0.115 |
| Database | PostgreSQL + asyncpg | 16 |
| ORM | SQLAlchemy async | 2.0 |
| Migration | Alembic | 1.13 |
| Auth | python-jose + passlib/bcrypt | — |
| AI | OpenAI Python SDK | 1.51 |
| File parsing | pdfplumber + python-docx | — |
| Validation | Pydantic v2 | — |
| Container | Docker + docker-compose | — |
| Testing | pytest + httpx + aiosqlite | — |

---

## Commit Convention

```
feat(scope):   tính năng mới
fix(scope):    sửa bug
chore(scope):  config, deps, tooling
docs:          tài liệu
test:          tests
refactor:      cải thiện code không đổi behavior
```

---

<div align="center">
MIT License · 2025
</div>
