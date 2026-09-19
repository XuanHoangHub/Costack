# Upgen Mobile App (React Native + Expo)

Ứng dụng di động chính thức của nền tảng **Upgen**, được xây dựng bằng **React Native + Expo (TypeScript)**, kết nối và dùng chung 100% cơ sở dữ liệu và xác thực với phiên bản Web qua **Supabase**.

---

## 📱 Các tính năng cốt lõi trên Mobile

1. **Trang chủ & Tổng quan (Dashboard)**:
   - Thống kê 4 ô nhanh: Hạn hôm nay, Quá hạn, Đang làm, Đã hoàn thành.
   - Thẻ thông minh Upgen Brain AI (Smart Daily Briefing & Action Insight).
   - Danh sách công việc gần đây và không gian làm việc.
   - Nút nổi FAB `+` tạo nhanh công việc với hiệu ứng nảy (spring physics).

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

8. **Danh bạ đội nhóm (Team Directory)**:
   - Danh sách thành viên, vai trò, phòng ban.
   - Trạng thái hoạt động trực tuyến (Online presence).

9. **Cài đặt & Giao diện cá nhân hóa**:
    - Chuyển đổi Dark Mode / Light Mode đồng bộ với bảng màu Upgen Web (`#0c0e14`).
    - Hỗ trợ song ngữ: Tiếng Việt và English.
    - Cập nhật hồ sơ cá nhân.

---

## 🎨 Hệ thống Thư viện UI/UX Cao cấp (Modern Mobile Stack)

- **`expo-blur`**: Hiệu ứng kính mờ (Frosted Glass / Glassmorphism) cho Bottom Tab Bar nổi và thẻ `GlassCard`.
- **`expo-image`**: Trình kết xuất hình ảnh thế hệ mới, hỗ trợ bộ nhớ đệm cache đĩa, chuyển cảnh mượt mà không giật lag.
- **`react-native-reanimated` & `react-native-worklets`**: Động cơ diễn hoạt native 60/120fps chuẩn New Architecture.
- **`react-native-gesture-handler`**: Tương tác cử chỉ vuốt chạm siêu nhạy.
- **`react-native-toast-message`**: Thông báo nổi (Floating Toast) hiện đại kết hợp hiệu ứng rung phản hồi xúc giác (`expo-haptics`).
- **`SkeletonLoader`**: Hiệu ứng skeleton shimmer mượt mà thay thế hoàn toàn các spinner tải truyền thống.

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

### 6. Kiểm tra lỗi & Kết nối Supabase
```bash
# Kiểm tra TypeScript typecheck toàn bộ dự án (0 lỗi)
npm run typecheck

# Kiểm tra kết nối Supabase (truy vấn 9 bảng cốt lõi và kiểm tra Auth)
npm run test:supabase
```
