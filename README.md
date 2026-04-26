# LearnOS - Nền Tảng Học Tập Tích Hợp AI

LearnOS là nền tảng quản lý học tập toàn diện (Full-stack) được xây dựng nhằm hỗ trợ người dùng tối ưu hóa luồng công việc học tập cá nhân. Bằng việc tích hợp các mô hình ngôn ngữ lớn (LLM như Google Gemini / OpenAI), hệ thống cho phép sinh viên, nghiên cứu sinh tải lên các tài liệu học tập của họ và tương tác trực tiếp: tự động trích xuất tóm tắt, tạo câu hỏi trắc nghiệm (quiz), giải đáp ngữ cảnh và theo dõi sự tiến bộ một cách trực quan trên một Workspace chuyên nghiệp. Bạn sẽ không cần chuyển đổi liên tục giữa nhiều công cụ rời rạc.

## 🌟 Tính Năng Nổi Bật

- **Hệ Thống Phân Tích Thông Minh:** Tương tác AI theo ngữ cảnh thực tế của riêng tài liệu mà bạn tải lên.
- **Xử Lý Đa Định Dạng (Multi-format Parsing):** Hỗ trợ khai thác dữ liệu từ các tệp PDF, Word (`.docx`), Markdown và Text tiêu chuẩn.
- **Tự Động Tạo Đề Trắc Nghiệm:** Thuật toán AI phân giải các kiến thức nòng cốt thành bộ đề kiểm tra, giúp củng cố bộ nhớ.
- **Bảng Thống Kê Tiến Độ:** Tracking số lượng tài liệu đã học, bài test hoàn thành và độ chính xác của lộ trình học.
- **Thiết Kế Tối Ưu UI/UX:** Kiến trúc Client (Frontend) được thiết kế hiện đại, responsive hoàn toàn bằng hệ thống Design Token cấp thấp (Vanilla CSS).
- **Hệ Thống Bền Bỉ, Chống Lỗi (Resilient Architecture):** Tích hợp Error Boundary ở tầng Frontend; kết hợp với Rest API có Data Validation mạnh mẽ ở Backend.

---

## 🛠 Nền Tảng Công Nghệ (Tech Stack)

### Backend (Lõi Hệ Thống & Trí Tuệ Nhân Tạo)
- **Framework:** FastAPI (Python) - Tốc độ cao, hỗ trợ Async xử lý I/O mượt mà.
- **Cơ Sở Dữ Liệu:** SQLite / PostgreSQL (Quản lý qua SQLAlchemy & asyncpg). Thao tác thay đổi schema được version control bởi **Alembic**.
- **Xác Thực (Authentication):** JSON Web Tokens (JWT) kết hợp hashing mật khẩu bằng `Passlib (bcrypt)`.
- **Tích hợp AI & Dữ Liệu:** Module LLM (OpenAI / Gemini), xử lý phân tích file bằng `pdfplumber` và `python-docx`.
- **Triển Khai:** Hỗ trợ Docker & Docker-Compose linh hoạt.

### Frontend (Giao Diện & Tương Tác)
- **Framework:** React.js + TypeScript (Khởi chạy siêu tốc độ với Vite toolchain).
- **Style Ecosystem:** Vanilla CSS Module chuẩn hóa dựa trên mô hình Design Token và Root Variable.
- **Workflow:** Các thành phần mở rộng tái sử dụng (Button, Input, Form Card) và phân tán Semantic HTML tiêu chuẩn.

---

## 📂 Tổ Chức Dự Án (Project Structure)

```text
WebsiteAI/
├── backend/                  # Mã nguồn lõi API & Hệ thống truy vấn
│   ├── app/                  # Logic chính (Routers, Schemas, Models, AI Utils)
│   ├── migrations/           # Lịch sử các phiên bản Database (Alembic)
│   ├── tests/                # Unit Tests (PyTest)
│   ├── uploads/              # Thư mục lưu trữ tài liệu đã tải lên
│   ├── alembic.ini           # Cấu hình di trú DB
│   ├── Dockerfile            # Cấu hình đóng gói Container cho API
│   ├── requirements.txt      # Thư viện phụ thuộc Python
│   └── run.py                # Điểm khởi chạy của uvicorn
├── frontend/                 # Nhánh chứa mã nguồn giao diện React
│   ├── src/
│   │   ├── components/       # Các module nhỏ được tái sử dụng (vd: ErrorBoundary)
│   │   ├── pages/            # Layout màn hình tĩnh (Auth, Workspace)
│   │   ├── styles/           # Standard CSS Variables hệ thống (#variables.css)
│   │   ├── App.tsx           # Entry file quản lý routing/session người dùng
│   │   └── main.tsx          # Virtual DOM
│   ├── package.json          # Thư viện phụ thuộc JS
│   └── vite.config.ts        # Thiết lập môi trường biên dịch
├── docker-compose.yml        # Điều phối cụm Container tổng thể
└── README.md                 # Tài liệu mô tả dự án
```

---

## 🚀 Hướng Dẫn Cài Đặt (Local Server)

Đảm bảo bạn đã cài đặt Python 3.10+ và Node.js 18.x+.

### Bước 1: Khởi tạo Backend

1. Di chuyển vào thư mục backend và tạo môi trường ảo (Virtual Environment):
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # (Dành cho Windows: venv\Scripts\activate)
   ```
2. Cài đặt các thư viện Python cần thiết:
   ```bash
   pip install -r requirements.txt
   ```
3. Cấu hình Env: Sao chép tệp `backend/.env.example` thành `backend/.env` và điền Database URI cùng API Keys AI của bạn (OpenAI / Gemini Key).
4. Thực thi việc tạo bảng cơ sở dữ liệu:
   ```bash
   alembic upgrade head
   ```
5. Khởi động Web Server tại cổng 8000:
   ```bash
   python run.py
   ```

### Bước 2: Khởi tạo Frontend

1. Khởi động Terminal mới và di chuyển vô nhánh Frontend:
   ```bash
   cd frontend
   ```
2. Thiết lập Env (Nối Frontend với API bằng biến môi trường tại `.env` ở frontend):
   ```env
   VITE_API_BASE_URL=http://localhost:8000/api/v1
   ```
3. Cài đặt thư viện Node:
   ```bash
   npm install
   ```
4. Khởi chạy UI tại cổng 5173:
   ```bash
   npm run dev
   ```

*(Ghi chú: Bạn có thể kích hoạt toàn bộ cụm Server và Database lập tức thông qua giao thức `docker-compose up -d` ngay tại Root tư liệu dự án nếu máy đã có Engine Docker).*

---

## 📖 Sơ Đồ Sử Dụng Mạch Tương Tác

1. **Giai đoạn Đăng Ký/Đăng Nhập:** Xác thực cấp phép danh tính qua JWT.
2. **Khởi tạo dữ liệu học (Upload Flow):** Sử dụng nút "Thêm tài liệu" trên hệ trục Workspace trái. File được gửi xuống FastAPI, chia nhỏ text và bảo lưu vị trí context.
3. **Thao Tác Với AI (Chat Flow):** Nhấp chọn Document mong muốn xử lý. Cửa sổ dòng lệnh AI sẽ khóa Context vào Document này, cho phép chất vấn các định lý phức tạp liên quan mật thiết.
4. **Vận hành công cụ (Tool Flow):** Nhấn lệnh *"Tóm Tắt"* hoặc *"Tạo Bài Tập"* trên panel trợ năng bên tay phải. AI phân tích khối lượng text, đưa ra dàn bài cốt lõi hoặc bộ 5 câu hỏi Multi-choices đi kèm đáp án ngay thời gian thực.

---

## 🏗 Chuẩn Mực Phát Triển (Development Standards)

Dự án này tuân thủ nghiệm ngặt các quy tắc mã hóa cao cấp:
- **Backend:** Code Python đạt chuẩn Typing, Models vận hành độc lập với Schema. Tất cả API rẽ nhánh bắt buộc bảo hộ với cơ chế Dependency `get_current_user`.
- **Frontend:** Cấm việc chèn cứng định dạng màu sắc hay pixel vào CSS cụ thể. Tất cả phải được kế thừa từ tệp Design System chung `variables.css`. Kiến trúc `semantic HTML` được giữ tuyệt đối.
- **Git Flow:** Mọi cải tiến quy chiếu theo quy tắc Conventional Commits. Ví dụ: `feat(api): bổ trợ upload docx` ; `fix(ui): can chỉnh padding input`.

---

## 🤝 Thành Viên Phát Triển

Phát triển nguyên mẫu (Prototype) & Kiến trúc hoàn thiện cấp chuyên nghiệp nhằm mở rộng cơ sở hạ tầng học tập thông minh phi tập trung.
