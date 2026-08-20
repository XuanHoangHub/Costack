# Apexa OS

Apexa OS là workspace năng suất Việt–Anh xây dựng trên Next.js 16, React 19, Supabase và Stripe. Ứng dụng hợp nhất quản lý task, docs, chat realtime, calendar, CRM, ERP, finance, goals, whiteboard, automation và trợ lý Gemini AI.

## Yêu cầu

- Node.js tương thích với Next.js 16
- Một dự án Supabase đã bật Auth, Database, Realtime và Storage theo nhu cầu
- Stripe account nếu mở bán gói Pro
- Gemini API key dùng trên server hoặc khóa riêng do người dùng cung cấp

## Cấu hình local

```powershell
Copy-Item .env.example .env.local
npm install
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000). Không commit `.env.local`.

Các biến bắt buộc cho production:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`: kết nối Supabase phía client.
- `SUPABASE_SECRET_KEY`: chỉ dùng ở Route Handler phía server; không thêm tiền tố `NEXT_PUBLIC_`.
- `NEXT_PUBLIC_APP_URL`: origin HTTPS chính thức, không có dấu `/` cuối.
- `GEMINI_API_KEY`: Gemini key dùng cho người dùng đã đăng nhập.
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_PRO_YEARLY`: cần đủ trước khi mở checkout.

Xem giá trị mẫu an toàn tại [`.env.example`](./.env.example).

## Database

Áp dụng toàn bộ migration trong `supabase/migrations` theo thứ tự thời gian trước khi deploy web. Migration mới nhất tạo bảng đăng ký newsletter với RLS khóa truy cập trực tiếp từ client.

```powershell
npx supabase db push
```

Sau khi áp dụng, chạy Supabase Database Advisors và xác nhận không còn cảnh báo Security/RLS liên quan các bảng trong schema `public`.

## Stripe

1. Tạo hai recurring Price cho Pro monthly/yearly.
2. Điền Price ID vào biến môi trường.
3. Trỏ webhook Stripe tới `https://YOUR_DOMAIN/api/billing/webhook`.
4. Đăng ký các event subscription/checkout/customer phù hợp với handler.
5. Kiểm tra checkout, portal, webhook signature và entitlement bằng Stripe test mode trước khi dùng live key.

Khi Stripe chưa cấu hình, API trả `configured: false`, landing không hiển thị giá giả và nút nâng cấp trong app bị vô hiệu hóa an toàn.

## Kiểm tra trước deploy

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

Smoke test tối thiểu:

- Landing desktop/mobile không tràn ngang; menu, CTA và auth modal hoạt động.
- Email/password và OAuth giữ đúng Supabase user UUID.
- `/legal/terms`, `/legal/privacy`, `/legal/security`, `/robots.txt`, `/sitemap.xml` trả HTTP 200.
- API AI không có session/khóa riêng trả 401 và không dùng server key.
- Billing không thể tự cấp Pro khi Stripe lỗi.
- Newsletter email hợp lệ được ghi sau khi migration đã áp dụng.

## Production

```powershell
npm run build
npm start
```

Chỉ phát hành sau khi domain HTTPS, OAuth redirect URLs, Supabase RLS, Storage policies, Stripe live webhook và backup/monitoring đã được xác nhận trên đúng môi trường production.
