# Ứng Dụng Frontend LearnOS

## Tổng Quan

LearnOS là nền tảng học tập thông minh tích hợp trí tuệ nhân tạo (AI), cho phép người dùng kết hợp sức mạnh của mô hình ngôn ngữ Google Gemini vào quy trình học tập cá nhân một cách mạch lạc. Người dùng có thể tải lên các tài liệu cá nhân (như PDF, Word, TXT, hoặc Markdown), chọn ngữ cảnh tài liệu, và tương tác trực tiếp với AI để tự động tạo tóm tắt, giải quyết các câu hỏi theo nội dung, hoặc tạo bài kiểm tra (quiz) động dựa trên chính tài liệu đã tải lên thay vì kiến thức chung chung.

## Tính Năng Chính

- Xác thực tài khoản & Quản lý phiên làm việc của người dùng.
- Tải lên tài liệu với đa dạng định dạng (PDF, TXT, DOCX, Markdown).
- Lựa chọn ngữ cảnh tương tác linh hoạt theo phân vùng tài liệu.
- Công cụ tự động tóm tắt nội dung thông minh.
- Tính năng tự tạo bài kiểm tra trắc nghiệm động từ văn bản.
- Theo dõi thống kê, tiến độ cá nhân thông qua bảng dữ liệu học tập.
- Kiến trúc Error Boundary kiểm soát tuyệt đối sự ổn định của hệ thống.
- Giao diện linh hoạt (Responsive) thiết kế bằng chuẩn Design Token hệ thống (Tỉ lệ chuẩn cho Mobile, Tablet, Desktop).

## Nền Tảng Kỹ Thuật

- **Framework**: React (Triển khai biên dịch với Vite)
- **Ngôn ngữ**: TypeScript
- **Giao diện**: Vanilla CSS (CSS Module kết hợp với hệ thống Design Token toàn cục cấp thấp)
- **Kiến trúc mạng**: Kết nối máy chủ bằng REST APIs xử lý bất đồng bộ.

## Cấu Trúc Dự Án

```text
frontend/
├── src/
│   ├── components/      # Các module độc lập và hệ thống kiểm soát ranh giới (Boundary)
│   │   └── ErrorBoundary.tsx
│   ├── pages/           # Phân trang hiển thị gốc
│   │   ├── AuthPage.tsx
│   │   └── WorkspacePage.tsx
│   ├── styles/          # Hệ thống Design System và Tokens định nghĩa giao diện
│   │   ├── variables.css
│   │   ├── AuthPage.css
│   │   └── WorkspacePage.css
│   ├── App.css          # Điều chỉnh cấp vi mô độ chuyên sâu cho App 
│   ├── App.tsx          # Điểm kết nối điều phối toàn ứng dụng
│   ├── index.css        # Khởi tạo CSS gốc, khai báo class đa dụng, đăng ký tokens
│   └── main.tsx         # Hệ thống gắn kết Virtual DOM
├── package.json         # Khai báo các gói thư viện cài đặt 
└── vite.config.ts       # Định nghĩa thao tác của công cụ Vite Build
```

## Hướng Dẫn Cài Đặt

Yêu cầu máy tính vận hành có môi trường Node.js phiên bản từ 18.x trở lên. Tại thư mục `frontend`:

1. Cài đặt các gói thư viện cấu thành phần mềm:
```bash
npm install
```

2. Khởi chạy máy chủ nội bộ cho mục đích phát triển:
```bash
npm run dev
```

Máy chủ sẽ bắt đầu phân phối giao diện tại địa chỉ `http://localhost:5173`.

## Cấu Hình Môi Trường

Để đảm bảo kết nối mạng chuẩn xác từ phía giao diện về cụm máy chủ Backend, một file cấu hình cần được lập trước:

1. Thiết lập một tập tin `.env` tại ngay gốc thư mục backend-frontend.
2. Cung cấp giá trị đường dẫn gốc đến Backend API:

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

## Hướng Dẫn Sử Dụng

1. Đăng ký nhận cấp phép sử dụng thiết bị tại tab "Tạo tài khoản" ở phân hệ gốc.
2. Lập các thiết lập an toàn thông tin (Mật khẩu buộc thỏa tối thiểu 8 điểm logic ký tự).
3. Sau bước đi vào hệ thống, điều phối danh mục tải dữ liệu ở thanh công cụ phía tay trái.
4. Đẩy nội dung sách vở kỹ thuật lên hệ thống làm tư liệu cá nhân.
5. Kích hoạt tư liệu cụ thể bằng thao tác nhấp chuột để điều phối hướng dẫn ngữ cảnh của AI Assistant.
6. Thao tác trò chuyện truy vấn trực tiếp kiến thức, hỏi đáp trên màn hình chính diện.
7. Triển khai các hệ module như đánh giá tóm lược tự động hoặc bóc tách bộ đề trắc nghiệm thông minh ở Panel sườn tay phải.

## Tích Hợp Hệ Thống API

Kết nối ngoại vi vận hành hoàn toàn dựa trên REST Schema tại định tuyến `/api/v1`. Các giao tiếp mũi nhọn:

- `POST /auth/login` - Giải phóng quyền xác thực bằng thẻ JWT nội hàm.
- `POST /auth/register` - Đăng kiểm thông tin mã khóa người dùng ở nền tảng Backend.
- `GET /auth/me` - Kiểm tra tính toàn vẹn của mã khóa Token tồn dư trong headers.
- `GET | POST | DELETE /documents/` - Chỉnh tài liệu học tập vào Database tương ứng.
- `POST /ai/chat` - Đẩy dữ kiện chất vấn dạng ngôn ngữ tự nhiên lên máy chủ AI.
- `POST /ai/summarize` - Thực hiện mệnh lệnh tổng hợp, rút gọn, bao quát ý chính văn bản nguồn.
- `POST /ai/generate-quiz` - Diễn dịch cấu trúc phi tuyến tính thành bộ câu hỏi đa đáp án theo chuẩn kiểm định trực quan.

## Quy Chuẩn Phát Triển & Vận Hành

Mọi sự tham gia xây dựng hoặc đóng góp nâng cấp cho dự án cần tuyệt đối bám sát các điều luật chuyên môn:

- Toàn bộ tham số liên quan đến hình ảnh quy cách thiết kế phải được chiết xuất từ tập `variables.css`. Cấm định danh màu sắc Hexcode độc lập, tỉ lệ Pixel cho khoảng cách Typography hoặc BorderRadius vượt ra ngoài khung Utility có sẵn trừ khi ở môi trường Isolated đặc thù.
- Khuyến khích tối đa việc tái sinh hàm như `input-base`, `btn btn-primary`, `card`, `spinner` cấu hình rễ ở `index.css`.
- Luồng rẽ nhánh phát triển Logic có khả năng kích hoạt tai nạn cục bộ buộc phải thiết lập tường che `Error Boundary` cô lập trước khi đóng gói rẽ nhánh mới.
- Khai báo Commit chuẩn hóa định dạng quốc tế Conventional Commit (ví dụ: `feat(core): thay doi font`, `fix(auth): tu chinh loading`).
- Không xả thẻ `div` hàng loạt; Thiết kế gốc chuẩn Semantic HTML như `main`, `aside`, `nav`, `section`.

## Định Hướng Nâng Cấp Tương Lai

- Ứng dụng điều phối React State diện rộng thông qua các bộ trung khu thư viện như Redux Toolkit hoặc Zustand.
- Điều phối Dark Mode giao tiếp ngược bằng CSS Root Variables trên diện toàn cầu.
- Mô phỏng thực thi với giao diện Testing Jest vào lõi nghiệp vụ then chốt.
- Tinh lọc độ trễ phân tải (Cache) với chuẩn API Fetch logic React Query.

## Tổ Chức Đóng Góp

Được tái thiết và hoàn thiện với mục tiêu định hình cấu trúc giao diện chuẩn hóa và nâng cấp độ chuyên nghiệp cho môi trường Front-end.
