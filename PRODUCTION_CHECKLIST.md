# Costack — Production readiness checklist


Checklist này là cổng phát hành, không phải tài liệu marketing. Mỗi mục phải được xác nhận trên đúng project Supabase, domain và kênh PayOS production.

## 1. Release gate tự động

- [ ] `npm ci` hoàn tất bằng lockfile đã commit.
- [ ] `npm run check` đạt (env local, ESLint, TypeScript và Next.js production build).
- [ ] `npm run validate:production` đạt với secrets của môi trường deploy.
- [ ] Dependency audit không còn lỗ hổng high/critical chưa có quyết định xử lý được ghi nhận.
- [ ] Container standalone khởi động bằng user không đặc quyền; `/api/health` trả 200.

## 2. Database và dữ liệu — đang chặn release mới

- [ ] Tạo và commit baseline migration cho toàn bộ schema lõi còn thiếu.
- [ ] `supabase db reset` dựng được database trống mà không cần chạy SQL thủ công ngoài thư mục migration.
- [x] `npm run audit:schema` nhận diện đủ các bảng ứng dụng bằng publishable/anon key (44 bảng).
- [ ] Supabase Security Advisor không còn cảnh báo RLS/policy/function search path chưa xử lý.
- [ ] Thử quyền anon, user A, user B, workspace admin và service role; user không đọc/ghi được dữ liệu workspace khác.
- [ ] Storage bucket và policy được kiểm thử với file riêng tư, URL hết hạn và giới hạn loại/kích thước file.
- [ ] Backup tự động đã bật và một lần restore thử đã hoàn tất.

## 3. Auth, billing và tích hợp

- [ ] Email/password, Google OAuth, logout, refresh token và MFA hoạt động trên domain production.
- [ ] Supabase Site URL và toàn bộ redirect URL chỉ trỏ tới domain tin cậy.
- [ ] PayOS webhook production đúng `/api/billing/webhook`; thử chữ ký sai, số tiền sai, callback lặp và thanh toán hủy.
- [ ] `npm run payos:confirm-webhook` hoàn tất sau khi domain HTTPS hoạt động.
- [ ] Migration `20260831111852_production_billing_entitlements.sql` đã được áp dụng; thử hạn mức seat và AI bằng hai tài khoản riêng.
- [ ] Gọi một API `/api/ai/*` không có session trả `401`, kể cả khi cố gửi header `x-gemini-api-key`.
- [ ] Tài khoản Free gọi API AI trả `403`; Starter/Pro/Business dùng được và bị chặn đúng khi hết quota tháng.
- [ ] Trình duyệt không còn trường nhập khóa AI cá nhân và tự xóa khóa `apexa_gemini_api_key` từ các phiên bản cũ.
- [ ] Thanh toán PayOS thật đã đi hết luồng `pending → paid → receipt`; gói, thời hạn và `members.is_premium` được cập nhật sau webhook và khi reconcile dự phòng.
- [ ] Nếu bán bằng thẻ: cấu hình đủ `STRIPE_PRICE_*`, webhook Stripe production đúng `/api/billing/stripe-webhook`, bật phương thức mong muốn trong Stripe Dashboard và thử thanh toán/hủy/gia hạn bằng test clock.
- [ ] Thử downgrade bị chặn khi gói PayOS cao hơn còn hiệu lực; thử renewal nối tiếp đúng `current_period_end` và webhook lặp không cộng thêm thời hạn.
- [ ] Google Calendar refresh token và quyền tối thiểu đã được kiểm tra; lỗi tích hợp không làm mất dữ liệu local.
- [ ] Secrets chỉ tồn tại ở runtime/server; không xuất hiện trong source map, browser bundle hoặc log.

## 4. Nội dung, pháp lý và vận hành

- [ ] Chủ sở hữu xác minh tên pháp nhân, mã số doanh nghiệp, địa chỉ, email và số điện thoại trong footer/legal pages.
- [ ] Terms, Privacy và Security phản ánh đúng nhà cung cấp, loại dữ liệu, thời hạn lưu, quy trình xóa và nơi xử lý dữ liệu.
- [ ] Giá, thuế, chu kỳ trả trước và chính sách hoàn tiền khớp PayOS catalog thực tế.
- [ ] Không công bố chứng nhận, SLA, mã hóa, hạn mức AI hoặc tính năng enterprise khi chưa có bằng chứng/hợp đồng tương ứng.
- [ ] Monitoring uptime/error, cảnh báo webhook, log retention và quy trình incident response đã có chủ sở hữu.

## 5. Smoke test giao diện

- [ ] Landing page, auth modal và workspace không tràn ngang ở 390×844 và desktop.
- [ ] Keyboard focus, Escape, labels, contrast và reduced-motion được kiểm tra trên các luồng chính.
- [ ] Tạo/sửa/xóa task, document, comment, whiteboard, goal và giao dịch tài chính hoạt động sau reload.
- [ ] `/robots.txt`, `/sitemap.xml`, canonical, Open Graph và Twitter image đúng domain production.
- [ ] `/admin` không cache và từ chối người dùng không có quyền; `/pricing-preview` trả 404 khi không bật cờ nội bộ.
- [ ] Không có console error, request 4xx/5xx bất ngờ hoặc hydration mismatch trên các luồng smoke test.

## 6. Go/no-go

- [ ] Có kế hoạch rollback cho web release và migration.
- [ ] Có release owner xác nhận toàn bộ mục trên; mọi ngoại lệ có mức rủi ro, người chấp thuận và ngày xử lý.
