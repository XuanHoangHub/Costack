# Avaxa Productivity OS - Next.js App Router Version

Dự án này là phiên bản nâng cấp của **Avaxa Productivity OS** từ Vite + Express SPA sang **Next.js App Router** chạy bằng TypeScript và Tailwind CSS v4.

---

## ⚡ Các Thay Đổi & Nâng Cấp Chính
1. **Kiến Trúc Hợp Nhất**: Không còn cần hai server riêng biệt cho frontend (Vite) và backend (Express). Các API AI Gemini hiện được xử lý trực tiếp bởi **Next.js Route Handlers** tại `src/app/api/`.
2. **Quản Lý Biến Môi Trường**: Hỗ trợ chuẩn Next.js. Next.js tự động tải file `.env.local` ở chế độ local dev.
3. **TypeScript Tuyệt Đối**: Cấu hình TypeScript chặt chẽ, tối ưu hóa kiểu dữ liệu cho toàn bộ các component và API Routes.

---

## ⚙️ Biến Môi Trường (.env.local)

Tạo file `.env.local` tại thư mục gốc của dự án `avaxa-next/` với nội dung sau:

```bash
# Gemini AI Key
GEMINI_API_KEY="your-gemini-api-key"

# Supabase Keys (Khuyên dùng chuẩn Next.js, tự động fallback nếu để trống)
NEXT_PUBLIC_SUPABASE_URL="https://zfyngidcwjijuogaygwe.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
```

---

## 🚀 Khởi Chạy Dự Án

### 1. Cài đặt các thư viện (đã cài sẵn khi khởi tạo)
```bash
npm install
```

### 2. Chạy môi trường Phát triển (Development)
```bash
npm run dev
```
Ứng dụng sẽ chạy tại: [http://localhost:3000](http://localhost:3000).

### 3. Build và Start cho Production
```bash
npm run build
npm run start
```
