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
*   **Gộp Tính Năng Kiểm Lâm**: Loại bỏ hoàn toàn ứng dụng web riêng lẻ `rescuelink-vqg` để tối ưu dự án. Toàn bộ tính năng kiểm lâm (phân khu cấm, điểm cháy vệ tinh, tuần tra thực địa, nhật ký vi phạm lâm nghiệp SMART) đã được tích hợp trực tiếp vào [Web Dashboard](file:///Users/khoihuynh/Documents/AI_cuu_ho/rescuelink-web) và [Mobile App](file:///Users/khoihuynh/Documents/AI_cuu_ho/rescuelink-app).
*   **Tích Hợp Bản Đồ Viettel Maps (VMaps)**: Chuyển đổi toàn bộ nền bản đồ số sang sử dụng Viettel Maps Tile Layer XYZ phục vụ vùng núi Việt Nam chi tiết, hỗ trợ cơ chế tự động fallback thông minh.
*   **Tải Bản Đồ Ngoại Tuyến Co Giãn & Tìm Kiếm POI**:
    *   Tạo endpoint `/api/vqg/search` kết nối Viettel Maps API Geocoding thật (tương thích nhiều cấu trúc JSON) và fallback thông minh.
    *   Thêm HUD co giãn bounding box tải offline (zoom 12-16) thời gian thực trên di động và vẽ Polygon ranh giới các vùng đã tải lên bản đồ.
*   **Tích Hợp Sentry SDK**: Cài đặt và cấu hình bọc giám sát lỗi Sentry tự động cho cả 3 phân hệ Mobile (`@sentry/react-native`), Backend (`@sentry/node`), và Web Dashboard (`@sentry/react`).
*   **Tích Hợp Viettel AI**:
    *   Tích hợp dịch vụ [viettelAiService.js](file:///Users/khoihuynh/Documents/AI_cuu_ho/rescuelink-backend/src/services/viettelAiService.js) xử lý Speech-to-Text (ASR) giải mã ghi âm Voice SOS, khôi phục dấu tiếng Việt cho SMS không dấu (Diacritics Restorer) và trích xuất thực thể khẩn cấp (NER).
    *   Tích hợp trình phát âm thanh và hiển thị phân tích AI cứu nạn trực quan trên Web Operator Dashboard.
*   **Tích Hợp Photon Geocoder Server**: Hỗ trợ tích hợp máy chủ tìm kiếm địa điểm tự dựng bằng Photon (Elasticsearch) thông qua biến `PHOTON_URL` trong [.env](file:///Users/khoihuynh/Documents/AI_cuu_ho/rescuelink-backend/.env) của backend, viết file hướng dẫn setup Docker [PHOTON_SETUP.md](file:///Users/khoihuynh/Documents/AI_cuu_ho/PHOTON_SETUP.md) cho người dùng.

---

## 📋 3. Nhiệm Vụ Tiếp Theo & Ưu Tiên (Next Steps & Priorities)

- `[ ]` Tích hợp Firebase service account key thật để thử nghiệm FCM Notification đầy đủ.
- `[x]` Tối ưu hóa caching bản đồ ngoại tuyến trên ứng dụng di động (Đã hoàn thành co giãn bounding box tải offline và vẽ Polygon ranh giới).
- `[ ]` Đăng ký API Token thật của Viettel AI Open Platform và Viettel Maps để chuyển sang chạy production thật.
- `[x]` Chạy lệnh dọn dẹp xóa thư mục [rescuelink-vqg/](file:///Users/khoihuynh/Documents/AI_cuu_ho/rescuelink-vqg) khi có sự xác nhận của người dùng (Đã thực hiện).
- `[x]` Cấu hình giám sát lỗi runtime Sentry cho cả 3 phân hệ (Đã thực hiện).

---

## 💡 4. Bài Học Kinh Kinh Nghiệm & Lưu Ý Đặc Biệt (Lessons Learned & Gotchas)

*   **SMS Composer Fallback**: Khi trekker gửi SOS ngoại tuyến từ ứng dụng, điện thoại sẽ tự động kích hoạt trình soạn tin nhắn mặc định và trừ tiền trực tiếp vào tài khoản SIM của trekker (chứ không chạy qua Twilio của backend).
*   **SMS Auto-Parser vs AI**: Đối với tin nhắn Panic tự động của hệ thống (có kèm link Google Maps và toạ độ), backend sử dụng Regex Parser để trích xuất vị trí ngay lập tức nhằm đảm bảo tính nhanh chóng. Đối với tin nhắn viết tay mô tả chi tiết tai nạn (custom text không dấu), backend gọi Viettel AI NLP để khôi phục dấu và trích xuất thực thể hỗ trợ tìm kiếm.
*   **Firebase FCM và Mạng**: FCM yêu cầu thiết bị nhận (điện thoại người thân) phải kết nối Internet để nhận thông báo tức thì, hoạt động song song với SMS truyền thống.
