# 🧠 RescueLink - Project Session Memory

Tài liệu này đóng vai trò là **Bộ nhớ phiên làm việc** (Session Memory) của dự án. Tất cả các AI Agent phải đọc file này ở đầu phiên và cập nhật file này ở cuối phiên làm việc để đồng bộ hóa tiến độ.

---

## 📌 1. Trạng Thế Hiện Tại Của Hệ Thống (Project State)

*   **Production Links**:
    *   Web Admin Dashboard (Vercel): https://ai-cuu-ho-web.vercel.app
    *   Backend API (Render): https://rescuelink-backend-5wwo.onrender.com
*   **Các thành phần chính**:
    1.  [rescuelink-app](file:///Users/khoihuynh/Documents/AI_cuu_ho/rescuelink-app) (Expo SDK 54, React Native) -> Bản di động cho Trekker, tích hợp widget Thời tiết & Family Share link.
    2.  [rescuelink-web](file:///Users/khoihuynh/Documents/AI_cuu_ho/rescuelink-web) (React 19, Vite) -> Bảng điều khiển cho Rescue Center + Tour Operator Portal.
    3.  [rescuelink-backend](file:///Users/khoihuynh/Documents/AI_cuu_ho/rescuelink-backend) (Express 5, MongoDB) -> Hệ thống REST API, Socket.io, Cron Weather alert & FCM Notification.
    4.  [rescuelink-vqg](file:///Users/khoihuynh/Documents/AI_cuu_ho/rescuelink-vqg) (React 19, Vite) -> Portal dành riêng cho Vườn Quốc Gia / Lực lượng Kiểm lâm.

---

## 🛠️ 2. Các Thay Đổi Gần Đây (Recent Decisions & Changes)

*   **Mở rộng RBAC & DB Schema**: Tích hợp các vai trò mới (`family`, `guide`, `operator`, `authority`).
*   **SMS Mock Mode**: Thêm cấu hình `SMS_MOCK_MODE=true` trong môi trường phát triển để tránh mất credit Twilio thật khi test.
*   **Weather Alerts**: Tích hợp API Open-Meteo để tự động kiểm tra thời tiết nguy hiểm mỗi 30 phút và push notification qua Firebase FCM.
*   **Family Public Share**: Cho phép người thân theo dõi thông qua link public `/family/:shareToken` mà không cần tài khoản.
*   **VQG Portal (B2G)**: Khởi tạo hoàn chỉnh ứng dụng `rescuelink-vqg` trên cổng 5174 với giao diện xanh kiểm lâm tối giản.

---

## 📋 3. Nhiệm Vụ Tiếp Theo & Ưu Tiên (Next Steps & Priorities)

- `[ ]` Tích hợp Firebase service account key thật để thử nghiệm FCM Notification đầy đủ.
- `[ ]` Bổ sung công cụ quản lý polygon/ranh giới VQG trong `rescuelink-vqg`.
- `[ ]` Tối ưu hóa caching bản đồ ngoại tuyến trên ứng dụng di động.

---

## 💡 4. Bài Học Kinh Nghiệm & Lưu Ý Đặc Biệt (Lessons Learned & Gotchas)

*   **SMS Composer Fallback**: Khi trekker gửi SOS ngoại tuyến từ ứng dụng, điện thoại sẽ tự động kích hoạt trình soạn tin nhắn mặc định và trừ tiền trực tiếp vào tài khoản SIM của trekker (chứ không chạy qua Twilio của backend).
*   **Firebase FCM và Mạng**: FCM yêu cầu thiết bị nhận (điện thoại người thân) phải kết nối Internet để nhận thông báo tức thì, hoạt động song song với SMS truyền thống.
