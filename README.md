# Laiber — kho game của nhóm

Web lưu trữ game nội bộ: đăng game bằng tên + thể loại + link, chấm sao, bình luận, báo lỗi, bảng xếp hạng, thành tích và ảnh đại diện.

## Công nghệ

- Node.js (>= 22.5, dùng `node:sqlite` có sẵn) + Express 4
- SQLite lưu tại `data/vault.db` (tự tạo khi chạy lần đầu)
- Ảnh bìa/avatar: Cloudinary, tự lưu local nếu upload lỗi
- Frontend thuần HTML/CSS/JS, không cần bước build

## Chạy local

```bash
npm install
npm start
```

Mở http://localhost:4321. Người **đăng ký đầu tiên** tự động là quản trị viên.

- `npm run dev` — tự khởi động lại khi sửa code.
- Đổi cổng: `PORT=4401 npm start` (Windows: `set PORT=4401 && npm start`).

## Cấu hình Cloudinary

Tạo file `.env` ở thư mục gốc (đã gitignore) dựa trên `.env.example`:

```
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_UPLOAD_PRESET=...
CLOUDINARY_API_KEY=...
```

`CLOUDINARY_UPLOAD_PRESET` phải là preset **Unsigned** trong Cloudinary Console. Không có `.env` thì web vẫn chạy, ảnh lưu vào `uploads/covers` và `uploads/avatars`.

## Cấu trúc

```
server.js            khởi động Express, mount route và static
src/db.js            schema SQLite + thư mục uploads
src/auth.js          session, phân quyền
src/cloudinary.js    upload ảnh lên Cloudinary
src/routes/          auth, games, scores, social, admin, preview
public/              SPA (index.html, css, js)
data/                database (không commit)
uploads/             file tạm/ảnh local (không commit)
```

## Ghi chú

- `data/`, `uploads/`, `node_modules/` đã nằm trong `.gitignore` — không đưa database hay file game lên git.
- Game do thành viên gửi lên kho ngay; admin/quản lý nội dung có thể sửa, xoá và xử lý báo cáo ở mục **Quản trị**.
