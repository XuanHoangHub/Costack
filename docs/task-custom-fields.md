# Space và trường tùy chỉnh của Task

Tham chiếu sản phẩm: [ClickUp Tasks](https://clickup.com/features/tasks).

Trong Space, mở **Trường dữ liệu** để tạo, cấu hình, sắp xếp, ẩn/hiện hoặc xóa trường. Trình quản lý hiển thị số Task đã điền từng trường và đánh dấu trường bắt buộc. Cấu hình thuộc Space; ẩn/hiện thuộc chế độ xem.

Các loại được hỗ trợ: văn bản, văn bản dài, số, tiền tệ, ngày/giờ, dropdown, nhiều nhãn, checkbox, đánh giá, tiến độ, email, điện thoại, URL, một hoặc nhiều thành viên. Form tạo Task, bảng và chi tiết dùng cùng trình nhập liệu. Kanban tóm tắt tối đa ba trường đã điền, theo cấu hình hiển thị.

- Giá trị mặc định áp dụng khi tạo Task, kể cả tạo nhanh. Giá trị đã nhập hoặc chủ động xóa không bị mặc định ghi đè.
- Trường bắt buộc phải có giá trị trước khi chuyển Task sang hoàn thành. `0` và `false` là giá trị hợp lệ; checkbox bắt buộc không có nghĩa là phải được tích.
- Số được kiểm tra giới hạn và số chữ số thập phân. Email, URL và ngày được kiểm tra định dạng. Sửa trực tiếp trong bảng/chi tiết lưu khi rời ô; dữ liệu không hợp lệ được giữ tại ô để sửa, không gửi cập nhật.
- Đổi tên trường giữ dữ liệu trong Space hiện tại. Đổi tên lựa chọn cập nhật dữ liệu theo ID lựa chọn. Lựa chọn bị bỏ khỏi cấu hình không âm thầm xóa giá trị cũ; cần chọn lại trước khi hoàn thành Task.
- Loại của trường đã tạo được giữ cố định để tránh chuyển đổi gây mất dữ liệu. Tạo trường mới khi cần loại khác.
- Bộ lọc nâng cao hỗ trợ custom field: bằng, khác, chứa, trống, có giá trị, lớn hơn và nhỏ hơn. Các phép so sánh lớn/nhỏ dành cho số. Tìm kiếm và CSV bao gồm custom field; cột số sắp xếp theo giá trị số.

Các thay đổi sử dụng cơ chế lưu Space và Task hiện có; không cần migration cơ sở dữ liệu mới. Chưa triển khai lên production hoặc xác minh đồng bộ bằng phiên đăng nhập thật.

Kiểm tra hồi quy:

```powershell
node --test scripts/test-custom-fields.mjs scripts/test-task-lifecycle.mjs scripts/test-space-insights.mjs
npm run typecheck
npm run build
```
