# Upgen Mobile App (React Native + Expo)

Ứng dụng di động chính thức của nền tảng **Upgen**, được xây dựng bằng **React Native + Expo (TypeScript)**, kết nối và dùng chung 100% cơ sở dữ liệu và xác thực với phiên bản Web qua **Supabase**.

---

## 📱 Các tính năng cốt lõi trên Mobile

1. **Trang chủ & Tổng quan (Dashboard)**:
   - Thống kê 4 ô nhanh: Hạn hôm nay, Quá hạn, Đang làm, Đã hoàn thành.
   - Widget Pomodoro 1 chạm (Quick Focus).
   - Danh sách công việc gần đây.
   - Nút nổi FAB `+` tạo nhanh công việc.

2. **Quản lý công việc (Tasks Engine)**:
   - Chuyển đổi giữa chế độ **Danh sách (List View)** và **Bảng Kanban vuốt ngang (Board View)**.
   - Thanh bộ lọc trượt ngang: Tất cả, Hôm nay, Quá hạn, Ưu tiên cao, Gán cho tôi.
   - Tìm kiếm công việc tức thì.
   - Chi tiết công việc (Bottom Sheet): Đổi trạng thái, độ ưu tiên, tương tác checklist subtask, bình luận theo thời gian thực, xóa mềm.
   - Đồng bộ thời gian thực (**Supabase Realtime**).

3. **Kênh trao đổi & Chat trực tiếp (Chat Room)**:
   - Danh sách các kênh thảo luận (General, Mobile Dev, UI/UX).
   - Chat theo thời gian thực (Supabase Broadcast Channel).
   - Phản ứng Emoji (Reactions).
   - Tự động cuộn thông minh xuống tin nhắn mới nhất.

4. **Hộp thư thông báo (Inbox)**:
   - Phân loại tab: Tất cả, Được nhắc tới, Hệ thống.
   - Đánh dấu đã đọc tất cả.
   - Badge hiển thị số lượng chưa đọc trên Bottom Tab Bar.

5. **Tài liệu & Ghi chú (Docs Hub)**:
   - Danh mục tài liệu trực quan theo danh mục.
   - Soạn thảo và chỉnh sửa ghi chú nhanh.

6. **Quản lý Tài chính (Finance Hub)**:
   - Thẻ số dư ví trực quan.
   - Thống kê thu nhập và chi phí.
   - Lịch sử giao dịch và modal thêm khoản thu/chi nhanh.

7. **Trợ lý trí tuệ nhân tạo (Upgen Brain AI Assistant)**:
   - Màn hình trò chuyện AI chuyên biệt với các câu lệnh mẫu: Tóm tắt ngày, chia nhỏ việc, gợi ý thứ tự ưu tiên.
   - Kết nối với backend AI API.

8. **Đồng hồ Pomodoro (Focus Timer)**:
   - Đồng hồ đếm ngược toàn màn hình.
   - Rung xúc giác (Haptics) khi hoàn thành phiên.
   - Chuyển đổi linh hoạt giữa Tập trung (25 phút) và Nghỉ ngơi (5 phút).

9. **Danh bạ đội nhóm (Team Directory)**:
   - Danh sách thành viên, vai trò, phòng ban.
   - Trạng thái hoạt động trực tuyến (Online presence).

10. **Cài đặt & Giao diện cá nhân hóa**:
    - Chuyển đổi Dark Mode / Light Mode đồng bộ với bảng màu Upgen Web (`#0c0e14`).
    - Hỗ trợ song ngữ: Tiếng Việt và English.
    - Cập nhật hồ sơ cá nhân.

---

## 🚀 Hướng dẫn cài đặt và chạy ứng dụng

### 1. Di chuyển vào thư mục mobile
```bash
cd mobile
```

### 2. Cài đặt thư viện (nếu chưa cài)
```bash
npm install
```

### 3. Khởi động Expo Development Server
```bash
npm start
# hoặc: npx expo start
```

### 4. Xem ứng dụng trên điện thoại thật
- Tải ứng dụng **Expo Go** từ App Store (iOS) hoặc Google Play Store (Android).
- Quét mã QR hiển thị trên màn hình terminal bằng Camera (iOS) hoặc app Expo Go (Android).

### 5. Chạy trên trình giả lập
- **Android**: Nhấn phím `a` trong terminal (yêu cầu Android Studio).
- **iOS**: Nhấn phím `i` trong terminal (yêu cầu macOS & Xcode).
- **Web**: Nhấn phím `w` trong terminal để mở bản preview trên trình duyệt.
