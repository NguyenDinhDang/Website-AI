<div align="center">

# AI Learning Assistant

**FastAPI · PostgreSQL · OpenAI · JWT · Alembic**

*He thong ho tro hoc tap thong minh su dung AI tao sinh*

[![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o--mini-412991?style=flat-square&logo=openai&logoColor=white)](https://openai.com)

</div>

---

## Gioi thieu

Web app ho tro tu hoc bang AI — nguoi dung co the dat cau hoi, nhan giai thich, lam bai tap trac nghiem va upload tai lieu hoc tap. Giao dien thiet ke theo phong cach workspace, lay cam hung tu NotebookLM.

Day la phien ban production co day du backend: xac thuc JWT, quan ly tai lieu, lich su chat, he thong quiz va theo doi tien do hoc tap.

---

## User Flow

```
1. Nguoi dung dang ky / dang nhap
        |
2. (Tuy chon) Upload tai lieu hoc -- PDF, TXT, DOCX, MD, PPTX
        |
3. Nhap cau hoi --> Backend /ai/chat --> AI tra loi (co nguon tu tai lieu)
        |
4. Bam "Tao bai tap" --> Backend /ai/generate-quiz --> Hien thi cau hoi trac nghiem
        |
5. Chon dap an --> Bam "Nop bai" --> Backend /ai/grade --> Nhan feedback
        |
6. Xem tien do --> Backend /progress --> Thong ke chinh xac, tong quiz, tong chat
```

---

## Tinh nang

- **Hoi dap AI** — Nhap cau hoi tu do, nhan giai thich theo ngu canh tai lieu
- **Quiz tu dong** — Sinh cau hoi trac nghiem 4 dap an tu noi dung tai lieu
- **Cham bai & Feedback** — Nop bai, biet ngay dung/sai va tai sao
- **Tom tat tai lieu** — AI tom tat noi dung chinh, ket qua duoc cache
- **Giai thich doan van** — Dan vao doan bat ky, AI giai thich don gian
- **Upload tai lieu** — Ho tro PDF, TXT, MD, DOCX, PPTX, tu dong trich xuat text
- **Lich su chat** — Luu toan bo hoi thoai, co the xem lai theo tai lieu
- **Thong ke tien do** — Dem so tai lieu, cau hoi, quiz, do chinh xac (%)

---

## Kien truc tong the

```
+-------------------------------------------------------------+
|                     CLIENT (Browser)                        |
+---------------------------+---------------------------------+
                            | HTTP / JSON
                            v
+-------------------------------------------------------------+
|                   FastAPI Application                        |
|                                                              |
|  +----------+  +-----------+  +----------+  +-----------+  |
|  |  /auth   |  | /documents|  |   /ai    |  | /progress |  |
|  +----+-----+  +-----+-----+  +----+-----+  +-----+-----+  |
|       |               |            |               |         |
|  +----+---------------+------------+---------------+------+  |
|  |                  Services Layer                         |  |
|  |   auth . document . chat . quiz . summarize . progress  |  |
|  +---------------------------+-----------------------------+  |
|                              |                               |
|  +---------------------------+-----------------------------+  |
|  |            AI Service (ai_service.py)                   |  |
|  |   summarize . generate_quiz . chat_qa . explain         |  |
|  +---------------------------+-----------------------------+  |
+------------------------------+------------------------------+
                               |
          +--------------------+-------------------+
          v                                        v
+-----------------+                   +----------------------+
|  PostgreSQL DB  |                   |     OpenAI API       |
|                 |                   |   (gpt-4o-mini)      |
|  users          |                   |                      |
|  documents      |                   |  /chat/completions   |
|  chats          |                   +----------------------+
|  quizzes        |
|  progress       |
+-----------------+
```

---

## System Architecture (Chi tiet)

```
+------------------------------------------+
|           Browser (Frontend)             |
|                                          |
|  +---------+  +----------+  +--------+   |
|  | Sidebar |  |   Chat   |  | Tools  |   |
|  |  Docs   |  |   Panel  |  | Panel  |   |
|  +---------+  +------+---+  +----+---+   |
+-------------------------+--------+-------+
                          |  fetch() + JWT |
             +------------+----------------+
             |      FastAPI Backend        |
             |                             |
             |  POST  /api/v1/auth/login   |
             |  POST  /api/v1/ai/chat      |
             |  POST  /api/v1/ai/quiz      |
             |  POST  /api/v1/ai/grade     |
             |  POST  /api/v1/documents    |
             +------------+----------------+
                          |
               +----------+-----------+
               |     AI Service       |
               |   ai_service.py      |
               |   retry x3           |
               |   --> OpenAI API     |
               +----------------------+
```

---

## Cau truc thu muc

```
project/
|
+-- public/                        # Frontend tinh
|   +-- index.html                 # App shell -- layout 3 cot
|   +-- style.css                  # Dark theme, dev-style
|   +-- app.js                     # Logic: chat, upload, tools, stats
|
+-- backend/                       # FastAPI backend
|   +-- app/
|   |   +-- main.py                # Entry point -- app factory
|   |   +-- core/
|   |   |   +-- config.py          # Settings tu .env (pydantic-settings)
|   |   |   +-- security.py        # JWT + bcrypt
|   |   |   +-- logging.py         # Structured logging
|   |   |   +-- exceptions.py      # Custom exceptions + handlers
|   |   +-- routers/
|   |   |   +-- auth.py            # POST /register /login /refresh, GET /me
|   |   |   +-- documents.py       # CRUD + GET /content
|   |   |   +-- ai.py              # /summarize /quiz /chat /explain /grade
|   |   |   +-- progress.py        # GET / DELETE tien do
|   |   +-- services/
|   |   |   +-- ai_service.py      # <-- MOI loi goi LLM deu o day
|   |   |   +-- auth_service.py    # register, login, refresh
|   |   |   +-- document_service.py# upload, list, get, delete
|   |   |   +-- chat_service.py    # handle_chat, get_history
|   |   |   +-- quiz_service.py    # generate_quiz, grade_quiz
|   |   |   +-- summarize_service.py # summarize + cache
|   |   |   +-- progress_service.py # get, reset
|   |   +-- models/
|   |   |   +-- user.py            # SQLAlchemy ORM
|   |   |   +-- document.py
|   |   |   +-- chat.py
|   |   |   +-- quiz.py
|   |   |   +-- progress.py
|   |   +-- schemas/
|   |   |   +-- auth.py            # Pydantic v2 request/response
|   |   |   +-- document.py
|   |   |   +-- ai.py
|   |   |   +-- progress.py
|   |   +-- utils/
|   |   |   +-- file_handler.py    # validate, save, extract text
|   |   |   +-- text_splitter.py   # chunk_text, truncate
|   |   +-- database/
|   |   |   +-- session.py         # async engine + get_db()
|   |   +-- dependencies/
|   |       +-- auth.py            # get_current_user()
|   +-- migrations/
|   |   +-- env.py                 # Alembic async config
|   |   +-- versions/
|   |       +-- 0001_initial_schema.py
|   +-- tests/
|   |   +-- conftest.py            # fixtures: client, auth_headers
|   |   +-- test_auth.py
|   |   +-- test_progress.py
|   |   +-- test_health.py
|   +-- alembic.ini
|   +-- requirements.txt
|   +-- Dockerfile                 # Multi-stage build
|   +-- docker-compose.yml         # api + postgres
|   +-- run.py                     # python run.py shortcut
|   +-- .env.example
|
+-- .env.example                   # Mau bien moi truong
+-- requirements.txt               # Python dependencies
+-- README.md
```

---

## Tech Stack

| Layer         | Cong nghe                              | Version  |
|---------------|----------------------------------------|----------|
| Frontend      | HTML . CSS . Vanilla JavaScript        | --       |
| Framework     | FastAPI + Uvicorn                      | 0.115    |
| Database      | PostgreSQL + asyncpg                   | 16       |
| ORM           | SQLAlchemy async                       | 2.0      |
| Migration     | Alembic                                | 1.13     |
| Auth          | python-jose + passlib/bcrypt           | --       |
| AI            | OpenAI Python SDK                      | 1.51     |
| File parsing  | pdfplumber + python-docx               | --       |
| Validation    | Pydantic v2                            | --       |
| Container     | Docker + docker-compose                | --       |
| Testing       | pytest + httpx + aiosqlite             | --       |
| Package mgr   | pip / venv                             | --       |

---

## Cai dat & Chay

### Yeu cau

- Python >= 3.10
- pip
- PostgreSQL 14+ (hoac dung Docker)

### Option A -- Docker (khuyen dung)

```bash
git clone <repo> && cd backend
cp .env.example .env
# Dien OPENAI_API_KEY vao .env
docker-compose up --build
```

> API tu dong chay migration va khoi dong tai http://localhost:8000

### Option B -- Local

```bash
# 1. Moi truong
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# 2. Config
cp .env.example .env
# Sua DATABASE_URL, JWT_SECRET_KEY, OPENAI_API_KEY

# 3. Database
createdb ai_learning
alembic upgrade head

# 4. Chay backend (port 8000)
python run.py
# hoac: uvicorn app.main:app --reload --port 8000
```

**Truy cap frontend:**

Backend mount thu muc `public/` tai `/assets`, nhung de mo truc tiep
`public/index.html` tren trinh duyet ban co 2 cach:

```bash
# Cach A — mo file truc tiep (khong can server)
# Mo public/index.html bang trinh duyet (file://)
# CORS da duoc cau hinh cho origin "null"

# Cach B — Live Server (VS Code, khuyen dung khi dev)
# Cai extension "Live Server", click "Go Live" tren index.html
# Frontend se chay tai http://127.0.0.1:5500
```

API docs tu dong co tai: http://localhost:8000/docs

> **Luu y**: `API_BASE` trong `public/app.js` mac dinh la `http://localhost:8000/api/v1`.
> Thay doi gia tri nay neu backend chay tren host/port khac.

---

## API Endpoints

### Auth -- /api/v1/auth

| Method | Endpoint    | Body                          | Mo ta              |
|--------|-------------|-------------------------------|--------------------|
| POST   | /register   | {email, username, password}   | Dang ky            |
| POST   | /login      | {email, password}             | Dang nhap --> JWT  |
| POST   | /refresh    | {refresh_token}               | Lam moi token      |
| GET    | /me         | --                            | Thong tin user     |

### Documents -- /api/v1/documents

| Method | Endpoint        | Mo ta                        |
|--------|-----------------|------------------------------|
| POST   | /               | Upload file (pdf/txt/md/docx)|
| GET    | /               | Danh sach tai lieu           |
| GET    | /{id}           | Chi tiet tai lieu            |
| GET    | /{id}/content   | Raw text da extract          |
| DELETE | /{id}           | Xoa tai lieu + file          |

### AI -- /api/v1/ai

| Method | Endpoint        | Body                          | Mo ta                     |
|--------|-----------------|-------------------------------|---------------------------|
| POST   | /summarize      | {document_id}                 | Tom tat (cache lan 2+)    |
| POST   | /generate-quiz  | {document_id, num_questions}  | Sinh trac nghiem          |
| POST   | /chat           | {message, document_id?}       | Hoi dap AI                |
| POST   | /explain        | {text, document_id?}          | Giai thich doan van       |
| POST   | /grade          | {quiz_id, selected_index}     | Cham bai + feedback       |
| GET    | /chat/history   | ?document_id=                 | Lich su chat              |

### Progress -- /api/v1/progress

| Method | Endpoint | Mo ta            |
|--------|----------|------------------|
| GET    | /        | Thong ke hoc tap |
| DELETE | /        | Reset thong ke   |

---

## Vi du su dung

### Dang ky + Dang nhap

```bash
# Dang ky
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"student@edu.vn","username":"student01","password":"Pass1234"}'

# Dang nhap
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"student@edu.vn","password":"Pass1234"}'
```

Response:
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer"
}
```

### Hoi AI (cu the theo endpoint /ask cu)

```bash
# Hoi dap
curl -X POST http://localhost:8000/api/v1/ai/chat \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"message":"So nguyen to la gi?","document_id":1}'
```

Response:
```json
{
  "answer": "So nguyen to la so tu nhien lon hon 1, chi chia het cho 1 va chinh no...",
  "document_id": 1
}
```

### Tao bai tap trac nghiem (tuong duong /quiz cu)

```bash
curl -X POST http://localhost:8000/api/v1/ai/generate-quiz \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"document_id":1,"num_questions":1}'
```

Response:
```json
{
  "questions": [
    {
      "question": "So nao sau day la so nguyen to?",
      "options": ["A. 4", "B. 6", "C. 7", "D. 9"],
      "correct_index": 2,
      "explanation": "7 chi chia het cho 1 va 7, dung dinh nghia so nguyen to."
    }
  ]
}
```

### Cham bai (tuong duong /grade cu)

```bash
curl -X POST http://localhost:8000/api/v1/ai/grade \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"quiz_id":1,"selected_index":2}'
```

Response:
```json
{
  "is_correct": true,
  "explanation": "Dung! 7 la so nguyen to vi chi chia het cho 1 va chinh no.",
  "correct_index": 2
}
```

### Upload tai lieu

```bash
curl -X POST http://localhost:8000/api/v1/documents/ \
  -H "Authorization: Bearer <token>" \
  -F "file=@machine_learning.pdf"
```

Response:
```json
{
  "id": 1,
  "title": "machine_learning.pdf",
  "file_type": "pdf",
  "file_size": 204800,
  "created_at": "2025-01-01T00:00:00Z"
}
```

---

## Chay Tests

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

## Bien moi truong

| Key                          | Mac dinh                    | Mo ta                          |
|------------------------------|-----------------------------|--------------------------------|
| DATABASE_URL                 | postgresql+asyncpg://...    | PostgreSQL async URL           |
| JWT_SECRET_KEY               | (bat buoc)                  | openssl rand -hex 32           |
| OPENAI_API_KEY               | (bat buoc)                  | API key tu platform.openai.com |
| OPENAI_MODEL_NAME            | gpt-4o-mini                 | Model su dung                  |
| ACCESS_TOKEN_EXPIRE_MINUTES  | 1440                        | 24 gio                         |
| MAX_FILE_SIZE_MB              | 50                          | Gioi han upload                |
| ALLOWED_EXTENSIONS           | pdf,txt,md,docx,pptx        | Dinh dang cho phep             |
| ENV                          | development                 | development / production       |
| PORT                         | 8000                        | Cong chay server               |

---

## Commit Convention

```
feat(scope):   tinh nang moi
fix(scope):    sua bug
chore(scope):  config, deps, tooling
docs:          tai lieu
test:          tests
refactor:      cai thien code khong doi behavior
```

---

## Future Improvements

- [ ] RAG pipeline -- tim kiem ngu nghia tren tai lieu nguoi dung
- [ ] Streaming response -- hien thi cau tra loi AI theo tung token
- [ ] Export -- tai xuong ghi chu, ket qua bai tap dang PDF
- [ ] Responsive -- toi uu giao dien cho mobile
- [ ] Rate limiting -- gioi han so request theo user
- [ ] Anthropic Claude -- ho tro them provider AI

---

## Notes

- File upload duoc xu ly day du -- doc text, luu DB, dung lam context cho AI.
- Summary duoc cache sau lan goi dau, lan sau tra ve ngay khong goi AI.
- Moi loi goi LLM deu di qua ai_service.py, co retry x3 khi gap loi.
- JWT access token het han sau 24h, dung refresh token de gia han.

---

<div align="center">
MIT License . 2025
</div>
