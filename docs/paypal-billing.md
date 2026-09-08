# PayPal và giá quốc tế cho Apexa

Ngày đánh giá: 08/09/2026. Đây là đề xuất dựa trên mã nguồn hiện có và bảng giá công khai, chưa phải phân tích doanh thu/chi phí thực tế của khách hàng.

## Giá đã đặt mặc định

| Gói | Trả theo tháng | Trả trước 12 tháng | Bình quân tháng khi trả năm | AI hiện có/tháng |
| --- | ---: | ---: | ---: | ---: |
| Starter | 9 USD | 90 USD | 7,50 USD | 150 lượt |
| Pro | 29 USD | 290 USD | 24,17 USD | 2.000 lượt |
| Business | 99 USD | 990 USD | 82,50 USD | 10.000 lượt |

Giá năm bằng 10 tháng, tiết kiệm 16,67%. Thanh toán là trả trước theo chu kỳ; gói tự kích hoạt khi máy chủ xác nhận đã thu tiền và không tự động trừ tiền gia hạn. Các mức USD là giá thị trường quốc tế riêng, không phải quy đổi thời gian thực từ VND. Giá PayOS VND hiện hữu và hạn mức tính năng chưa thay đổi trong lần tích hợp này.

Billing hiện gắn với `user_id`, chưa thu tiền theo số ghế. Không nên quảng cáo đây là gói AI dùng chung cho mọi thành viên: hạn mức AI đang kiểm tra tài khoản gọi API. Giới hạn thành viên trong catalog lần lượt 10/50/250 cũng không phải cơ chế tính tiền mỗi ghế.

## Cơ sở định giá

Starter có quản lý công việc, lịch/Gantt và AI cơ bản. Pro thêm CRM, ERP/tài chính, tự động hóa và báo cáo. Business tăng quyền quản trị, API/webhook và hạn mức AI. Mức 9 USD giữ cửa vào thấp; hai gói trên cần khoảng chênh đủ lớn để trả chi phí AI và hỗ trợ. Sự hiện diện của module trong mã nguồn không đồng nghĩa tất cả đã đạt độ hoàn thiện hoặc SLA tương đương sản phẩm lâu năm.

Để tham chiếu, [ClickUp](https://clickup.com/pricing) công bố Unlimited 7 USD và Business 12 USD/người/tháng khi chọn chu kỳ năm. Cách tính theo người của ClickUp khác billing hiện tại của Apexa, nên không so giá trực tiếp mà bỏ qua số người và phạm vi AI.

Điểm rủi ro lớn nhất là AI: `src/lib/aiServer.ts` cho phép nhiều model, mặc định Gemini 3.6 Flash; quota hiện tính 1 đơn vị mỗi yêu cầu. Nhiều API chưa đặt trần output token. Hai yêu cầu cùng tốn một lượt có thể chênh chi phí rất lớn. Giá bán thấp không tự bảo đảm vận hành có lãi.

## Mô hình chi phí minh họa

Giả định mỗi lượt dùng 2.000 input token và 500 output token tính phí, đã bao gồm thinking trong số output giả định; không dùng grounding, hình ảnh đầu ra hay audio. Theo [Google Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing), Gemini 3.6 Flash Standard hiện 0,75 USD/triệu input và 3,75 USD/triệu output, tăng lên 1,50/7,50 USD từ 01/01/2027. Đây là kịch bản minh họa, chưa đo token thực tế.

Chi phí một lượt hiện tại: `(2.000 × 0,75 + 500 × 3,75) / 1.000.000 = 0,003375 USD`.

| Gói dùng hết quota | AI/tháng hiện tại | AI/tháng từ 2027 | Doanh thu năm quy về tháng sau phí PayPal |
| --- | ---: | ---: | ---: |
| Starter | 0,51 USD | 1,01 USD | 7,15 USD |
| Pro | 6,75 USD | 13,50 USD | 23,08 USD |
| Business | 33,75 USD | 67,50 USD | 78,85 USD |

Cột cuối giả định phí nhận thương mại quốc tế tại Việt Nam 4,40% + 0,30 USD/giao dịch theo [PayPal Việt Nam](https://www.paypal.com/vn/business/paypal-business-fees), thu một lần mỗi năm: `(giá_năm × 0,956 − 0,30) / 12`. Chưa trừ thuế, chuyển đổi tiền, rút tiền, hoàn tiền, hạ tầng, lưu trữ, email, hỗ trợ hoặc công phát triển. Không mặc định phí này áp dụng cho mọi loại giao dịch hoặc mọi thị trường.

Business năm chỉ còn khoảng 11,35 USD/tháng sau phí PayPal và AI trong kịch bản 2027 trên, trước các chi phí còn lại. Nếu output bình quân tăng lên 1.500 token, Business có thể tốn 142,50 USD AI/tháng từ 2027, vượt doanh thu. Vì vậy 99/990 USD là giá khởi điểm cần tối ưu và đo usage, không phải cam kết lợi nhuận ở mọi mức sử dụng.

## Ưu tiên tối ưu chi phí

1. Đo input/output/thinking token và chi phí theo tài khoản, tính năng, model; lập ngân sách AI theo USD thay vì chỉ đếm lượt. Đánh giá p50/p95 và khách dùng nhiều trước khi mở bán rộng.
2. Dùng Flash-Lite cho gắn nhãn, trích xuất, tóm tắt ngắn; model mạnh dành cho yêu cầu khó. Giới hạn lựa chọn model ở máy chủ theo gói. Không âm thầm giảm quyền lợi của khách đã mua.
3. Đặt trần input/output và thinking theo tính năng; chỉ gửi phần ngữ cảnh liên quan, cache kết quả, batch tác vụ nền phù hợp. Theo dõi chất lượng khi đổi model.
4. Với giá trên, đặt mục tiêu ngân sách AI khoảng 1/5/15 USD mỗi tháng cho Starter/Pro/Business. Đây là mục tiêu cần triển khai và hiệu chỉnh, chưa phải giới hạn được code trong thay đổi PayPal. Nếu không đạt, giảm quota cho gói mới, bán thêm credit hoặc tăng giá; không bán AI không giới hạn.
5. Khuyến khích trả năm để giảm số lần chịu phí cố định và giữ dòng tiền. Đo cả tổng doanh thu/chi phí từ PayOS vì giá VND thấp hơn đáng kể ở Pro/Business; bảng USD riêng không sửa được biên lợi nhuận của gói VND.

## Bật PayPal tự động

1. Áp dụng migration `supabase/migrations/20260908023628_add_paypal_checkout.sql` vào đúng môi trường Supabase trước khi bật khóa PayPal. Migration tạo `paypal_orders`, RLS chỉ đọc đơn của chính mình và RPC chỉ `service_role` được gọi.
2. Tạo REST app trong [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/applications/live) thuộc tài khoản Business nhận tiền. Cấu hình server theo `.env.example`: `PAYPAL_ENVIRONMENT`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`, `PAYPAL_MERCHANT_EMAIL`. Không đưa secret vào `NEXT_PUBLIC_*`, mã nguồn hoặc chat.
3. Live merchant email đã đặt mặc định: `hoang.benjamin.creative@gmail.com`. Khi thử sandbox, dùng email tài khoản **sandbox business** tương ứng, không dùng email live để giả lập người nhận.
4. Đăng ký webhook HTTPS `<domain>/api/billing/paypal-webhook` cho `CHECKOUT.ORDER.APPROVED` và `PAYMENT.CAPTURE.COMPLETED`; Webhook ID phải thuộc đúng REST app và môi trường. `NEXT_PUBLIC_APP_URL` phải là origin HTTPS triển khai thực tế.
5. Thử bằng tài khoản sandbox buyer riêng: duyệt, hủy, pending, callback lặp, quay lại trang và đóng trình duyệt ngay sau khi duyệt. Sau khi kiểm tra mới chuyển sang `live` cùng bộ khóa/email/webhook tương ứng.
6. Nếu cần thay giá, các biến `PAYPAL_PRICE_*` nhận **USD dạng thập phân**, ví dụ `29.00`; cơ sở dữ liệu lưu cents. Không nhập `2900` với ý nghĩa 29 USD.

Email đơn lẻ không đủ cho REST checkout tự động. Khi thiếu khóa, webhook ID hoặc môi trường hợp lệ, PayPal hiển thị đang thiết lập và chặn mua gói. Thay đổi này chưa tự tạo REST app, đăng ký webhook, áp dụng migration lên production hoặc thực hiện giao dịch thật.

## Đối soát và giới hạn

Máy chủ tạo đơn từ catalog, lưu chủ đơn/người nhận/số tiền trước khi mở PayPal. Browser không được quyết định số tiền, provider order ID hoặc trạng thái đã trả. API return yêu cầu phiên đăng nhập và quyền sở hữu. Webhook được xác minh qua API PayPal; trạng thái APPROVED chỉ cho phép capture, chưa cấp gói. Chỉ một capture COMPLETED khớp order, invoice, người nhận, USD và số tiền mới được RPC kích hoạt gói trong cùng transaction. Callback lặp trả cùng ngày hết hạn; capture ID không được tái sử dụng cho đơn khác.

RPC gia hạn cùng gói từ ngày hết hạn hiện tại. Khi gói còn hiệu lực, đổi gói/cổng cần hỗ trợ; UI và API chặn để tránh thay thế quyền lợi hoặc tính phí chồng. Đơn được tạo trước rồi phát sinh xung đột gói sau đó có thể cần hỗ trợ đối soát. Hoàn tiền/dispute/reversal chưa tự thu hồi quyền lợi trong phiên bản này; xử lý qua quy trình hỗ trợ và PayPal. Báo cáo doanh thu admin hiện thiên về PayOS/Stripe, chưa cộng bảng USD PayPal vào tổng VND.

Tài liệu API: [Orders v2](https://developer.paypal.com/api/orders/v2), [xác minh webhook](https://developer.paypal.com/api/webhooks/v1/verify-webhook-signature-post), [tiền tệ hỗ trợ](https://developer.paypal.com/api/codes/currency/).

## Kiểm thử cục bộ

`node --test scripts/test-paypal-billing.mjs scripts/test-billing-checkout.mjs`

`node scripts/test-paypal-sql.mjs` (cài engine PGlite tạm theo chú thích đầu script; không sửa dependencies ứng dụng).

Test SQL chạy PostgreSQL cô lập với bảng billing nền, kiểm tra migration, cấp gói, gia hạn, callback trùng, rollback khi capture trùng, RLS và quyền gọi RPC. Nó không thay thế test tích hợp sandbox PayPal hoặc kiểm tra toàn bộ migration history production.
