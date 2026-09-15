# Upgen

Upgen là workspace năng suất Việt–Anh xây dựng trên Next.js 16, React 19, Supabase và PayOS. Ứng dụng hợp nhất quản lý task, docs, chat realtime, calendar, CRM, ERP, finance, goals, whiteboard, automation và trợ lý Gemini AI.

## Yêu cầu

- Node.js tương thích với Next.js 16
- Một dự án Supabase đã bật Auth, Database, Realtime và Storage theo nhu cầu
- Tài khoản PayOS đã có kênh thanh toán nếu mở bán gói trả phí
- Gemini API key chỉ dùng trên server; ứng dụng không hỗ trợ khóa riêng của người dùng (BYOK)

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
- `GEMINI_API_KEY`: khóa Gemini server-only dùng cho tài khoản có gói trả phí; tuyệt đối không thêm tiền tố `NEXT_PUBLIC_`.
- `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`: thông tin kênh PayOS, chỉ dùng trên server.

Xem giá trị mẫu an toàn tại [`.env.example`](./.env.example).

## Database

Áp dụng migration trong `supabase/migrations` theo thứ tự thời gian trước khi deploy web. Migration PayOS tạo sổ đơn hàng, RLS chỉ-đọc theo chủ sở hữu và hàm kích hoạt quyền lợi chỉ dành cho service role.

> **Điều kiện chặn production hiện tại:** thư mục migration đang chứa các migration bổ sung nhưng chưa có baseline tạo toàn bộ schema lõi (`workspaces`, `members`, `spaces`, `lists`, `tasks`, `docs`, `base_apps`, chat, whiteboard...). Không dùng một database trống cho tới khi baseline đã được tạo từ schema nguồn, kiểm thử bằng `supabase db reset`, review RLS và commit vào `supabase/migrations`. File SQL rời ở root không thay thế cho một lịch sử migration tái lập được.

```powershell
npx supabase db push
npm run audit:schema
```

`audit:schema` chỉ kiểm tra sự hiện diện của các bảng qua publishable/anon key và không đọc dữ liệu. Sau khi áp dụng, chạy thêm Supabase Database Advisors và xác nhận không còn cảnh báo Security/RLS liên quan các bảng trong schema `public`.

## PayOS

1. Điền ba khóa server-only của kênh PayOS và `NEXT_PUBLIC_APP_URL` là origin HTTPS production.
2. Áp dụng migration mới nhất để tạo `billing_orders`, RLS và hàm xử lý thanh toán nguyên tử.
3. Trong kênh PayOS, xác nhận webhook `https://YOUR_DOMAIN/api/billing/webhook`.
4. Có thể ghi đè giá VND bằng sáu biến `PAYOS_PRICE_<PLAN>_<CYCLE>` trong `.env.example`; nếu bỏ trống sẽ dùng catalog mặc định.
5. Thử cả thanh toán thành công, hủy, webhook lặp lại và webhook sai chữ ký trước khi phát hành.

Sau khi domain production hoạt động, có thể xác nhận webhook bằng SDK chính thức:

```powershell
npm run payos:confirm-webhook
```

PayOS được triển khai dưới dạng gói trả trước theo tháng/năm, không tự động trừ tiền. Webhook đã xác minh chữ ký là nguồn sự thật duy nhất để cấp hoặc gia hạn quyền lợi.

Nếu còn người dùng Stripe cũ, giữ webhook Stripe tại `https://YOUR_DOMAIN/api/billing/stripe-webhook` cho đến khi các subscription đó kết thúc.

## Kiểm tra trước deploy

```powershell
npm run check
npm run validate:production
npm run audit:schema
```

`validate:production` chỉ kiểm tra sự hiện diện/định dạng cấu hình và không in giá trị bí mật. Chạy dependency audit trong CI hoặc terminal được phép truy cập registry; không bỏ qua kết quả mức high/critical.

Smoke test tối thiểu:

- Landing desktop/mobile không tràn ngang; menu, CTA và auth modal hoạt động.
- Email/password và OAuth giữ đúng Supabase user UUID.
- `/legal/terms`, `/legal/privacy`, `/legal/security`, `/robots.txt`, `/sitemap.xml` trả HTTP 200.
- API AI không có session trả 401; tài khoản Free trả 403; header khóa AI cá nhân bị bỏ qua và không bao giờ được dùng.
- Billing không thể tự cấp gói trả phí từ return URL hoặc webhook PayOS sai chữ ký/sai số tiền.
- Newsletter email hợp lệ được ghi sau khi migration đã áp dụng.
- `/pricing-preview` trả 404 trong production, trừ khi chủ động đặt `ENABLE_PRICING_PREVIEW=true`.

## Production

```powershell
npm run build
npm start
```

`npm start` chạy standalone server đã tạo bởi `npm run build`; đặt `PORT`/`HOSTNAME` qua biến môi trường nếu cần. Docker image cũng dùng standalone output, chạy bằng user không đặc quyền và có healthcheck tại `/api/health`. Các biến `NEXT_PUBLIC_*` phải được truyền ở build time; khóa Gemini, Supabase service role, PayOS và Stripe chỉ truyền ở runtime.

Chỉ phát hành sau khi domain HTTPS, OAuth redirect URLs, Supabase RLS, Storage policies, PayOS webhook, backup/restore và monitoring đã được xác nhận trên đúng môi trường production. Xem checklist chi tiết tại [`PRODUCTION_CHECKLIST.md`](./PRODUCTION_CHECKLIST.md).
