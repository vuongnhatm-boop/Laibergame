# Laiber — kho game của nhóm

Web lưu trữ game nội bộ: đăng game bằng tên + thể loại + link, chấm sao, bình luận, báo lỗi, bảng xếp hạng, thành tích và ảnh đại diện.

## Công nghệ

- Node.js + Express 4
- SQLite: file `data/vault.db` khi chạy local, **Turso** khi deploy Vercel (cùng driver `@libsql/client`)
- Ảnh bìa/avatar: Cloudinary
- Frontend thuần HTML/CSS/JS, không cần bước build

## Chạy local

```bash
npm install
npm start
```

Mở http://localhost:4321. Người **đăng ký đầu tiên** tự động là quản trị viên.

- `npm run dev` — tự khởi động lại khi sửa code.
- Đổi cổng: `PORT=4401 npm start` (Windows: `set PORT=4401 && npm start`).

## Cấu hình

Tạo file `.env` ở thư mục gốc (đã gitignore) dựa trên `.env.example`:

```
TURSO_DATABASE_URL=libsql://...   # chỉ cần khi deploy
TURSO_AUTH_TOKEN=...              # chỉ cần khi deploy
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_UPLOAD_PRESET=...
CLOUDINARY_API_KEY=...
```

`CLOUDINARY_UPLOAD_PRESET` phải là preset **Unsigned** trong Cloudinary Console. Không có Cloudinary thì web vẫn chạy, ảnh lưu tạm trên máy.

## Triển khai Vercel

Repo đã có `vercel.json` và `api/index.js`, chỉ cần thêm biến môi trường trong **Project → Settings → Environment Variables**:

| Biến | Nguồn |
| --- | --- |
| `TURSO_DATABASE_URL` | Turso → database → URL (`libsql://...`) |
| `TURSO_AUTH_TOKEN` | Turso → Create Token |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary Console |
| `CLOUDINARY_UPLOAD_PRESET` | preset Unsigned |
| `CLOUDINARY_API_KEY` | Cloudinary Console |

Lưu ý:

- Vercel không có ổ đĩa bền. **Bắt buộc** dùng Turso, nếu thiếu biến thì DB chỉ nằm trong `/tmp` và mất khi function khởi động lại.
- Phải tắt **Deployment Protection** (Settings → Deployment Protection) để thành viên mở link không cần đăng nhập Vercel.
- Chức năng tải file game lên máy chủ không dùng được trên Vercel (giới hạn 4.5MB/request và không có đĩa). Luồng chính là đăng game bằng **link**.

## Cấu trúc

```
server.js            Express app (không listen khi chạy trên Vercel)
api/index.js         entry cho Vercel
vercel.json          route mọi request vào function
src/db.js            kết nối libSQL (file local hoặc Turso) + schema
src/auth.js          session, phân quyền
src/cloudinary.js    upload ảnh lên Cloudinary
src/routes/          auth, games, scores, social, admin, preview
public/              SPA (index.html, css, js)
data/                database local (không commit)
uploads/             file tạm/ảnh local (không commit)
```

## Ghi chú

- `data/`, `uploads/`, `node_modules/`, `.env` đã nằm trong `.gitignore` — không đưa database, file game hay khoá bí mật lên git.
- Game do thành viên gửi lên kho ngay; admin/quản lý nội dung có thể sửa, xoá và xử lý báo cáo ở mục **Quản trị**.
