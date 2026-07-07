# 🧠 RescueLink - Project Session Memory

Tài liệu này đóng vai trò là **Bộ nhớ phiên làm việc** (Session Memory) của dự án. Tất cả các AI Agent phải đọc file này ở đầu phiên và cập nhật file này ở cuối phiên làm việc để đồng bộ hóa tiến độ.

---

## 📌 1. Trạng Thế Hiện Tại Của Hệ Thống (Project State)

*   **Production Links**:
    *   Web Admin Dashboard (Vercel): https://ai-cuu-ho-web.vercel.app
    *   Backend API (Render): https://rescuelink-backend-5wwo.onrender.com
*   **Các thành phần chính**:
    1.  [rescuelink-app](file:///Users/khoihuynh/Documents/AI_cuu_ho/rescuelink-app) (Expo SDK 54, React Native) -> Bản di động cho Trekker, tích hợp widget Thời tiết, ghim điểm trên Map & Family Share link.
    2.  [rescuelink-web](file:///Users/khoihuynh/Documents/AI_cuu_ho/rescuelink-web) (React 19, Vite) -> Bảng điều khiển cho Rescue HQ Center + Tour Operator Portal.
    3.  [rescuelink-backend](file:///Users/khoihuynh/Documents/AI_cuu_ho/rescuelink-backend) (Express 5, MongoDB) -> Hệ thống REST API, Socket.io, Cron Weather alert & FCM Notification.

---

## 🛠️ 2. Các Thay Đổi Gần Đây (Recent Decisions & Changes)

*   **Tái Cấu Trúc Phân Quyền Siêu Gọn Nhẹ**: Loại bỏ hoàn toàn vai trò `authority` / VQG rườm rà. Gộp lại thành **3 Actor duy nhất**:
    *   `user`: Trekker leo núi cá nhân (App di động).
    *   `operator`: Công ty Tour / Trưởng đoàn dẫn leo núi.
    *   `admin`: Trung tâm chỉ huy Cứu hộ HQ & Đội cứu hộ thực địa (`rescuer`).
*   **Loại Bỏ Hoàn Toàn Viettel AI**: Xóa file `viettelAiService.js` và toàn bộ vết tích/route cũ. Chuyển sang sử dụng hoàn toàn **Google Gemini 1.5 Flash** cho NLP khôi phục dấu và trích xuất thực thể khẩn cấp khôi phục từ SMS.
*   **Tích Hợp Photon Geocoder Cho Tìm Kiếm Địa Điểm Bản Đồ**:
    *   Tối ưu endpoint `/api/search/locations` (và `/api/vqg/search` alias).
    *   Thứ tự ưu tiên: 1. Docker Photon local (`PHOTON_URL` ví dụ `http://localhost:2322`) -> 2. Komoot Photon Public API (`https://photon.komoot.io`) -> 3. Local POI Database các đỉnh núi, lán trại trekking nổi tiếng (Fansipan, Tà Xùa, Lảo Thần, Bạch Mộc Lương Tử...) & Đơn vị hành chính -> 4. OSM Nominatim.
*   **Fix Lỗi Dữ Liệu Thời Tiết**: Cập nhật [weatherService.js](file:///Users/khoihuynh/Documents/AI_cuu_ho/rescuelink-backend/src/services/weatherService.js) đọc linh hoạt cả `weather_code` lẫn `weathercode` từ Open-Meteo API, hỗ trợ timeout 10s và fallback không làm vỡ UI app.
*   **Bổ Sung Tính Năng Nhấp / Chạm Vào Map Để Chọn Vị Trí (Tap-to-Select)**:
    *   Mobile: [tracking-active.tsx](file:///Users/khoihuynh/Documents/AI_cuu_ho/rescuelink-app/app/tracking-active.tsx) cho phép chạm vào bất kỳ điểm nào trên bản đồ để ghim marker vị trí + hiển thị HUD tùy chọn tải bản đồ ngoại tuyến vùng này.
    *   Web: [Dashboard.jsx](file:///Users/khoihuynh/Documents/AI_cuu_ho/rescuelink-web/src/pages/Dashboard.jsx) thêm `LocationPickerMarker` (using `useMapEvents`) cho phép click trên Leaflet map ghim vị trí lấy tọa độ tức thì.
*   **SMS Mock Mode**: Thêm cấu hình `SMS_MOCK_MODE=true` trong môi trường phát triển để tránh mất credit Twilio thật khi test.
*   **Nâng Cấp Tính Năng Peer-to-Peer & Bluetooth Trên Mobile App (`rescuelink-app`)**:
    *   Thêm tính năng **🤝 Tự Tạo Nhóm Trekker Đi Lẻ ([qr-scanner.tsx](file:///Users/khoihuynh/Documents/AI_cuu_ho/rescuelink-app/app/qr-scanner.tsx))**: Tự động sinh mã QR & mã PIN 6 số trên màn hình điện thoại để những người đi trekking tự phát quét màn hình ghép nhóm cứu hộ chung.
    *   Thêm tính năng **📢 Cảnh Báo & Báo Cáo Sự Cố Cho Đồng Đội ([tracking-active.tsx](file:///Users/khoihuynh/Documents/AI_cuu_ho/rescuelink-app/app/tracking-active.tsx))**: Phát báo động rung/chuông và vị trí tới toàn bộ điện thoại các thành viên trong nhóm khi có người chấn thương hoặc đi lạc.
    *   Tích hợp module **📶 Bluetooth BLE RSSI Beacon ([bleBeacon.ts](file:///Users/khoihuynh/Documents/AI_cuu_ho/rescuelink-app/utils/bleBeacon.ts))**: Đo cường độ tín hiệu Bluetooth để xác định cự ly khoảng cách 5-10m giữa các đồng đội khi mất hoàn toàn sóng 4G/GPS.
    *   Tích hợp nút **🔗 Chia Sẻ Link Người Thân (1-Tap Share Zalo/FB)** trên [index.tsx](file:///Users/khoihuynh/Documents/AI_cuu_ho/rescuelink-app/app/(tabs)/index.tsx) và [tracking-active.tsx](file:///Users/khoihuynh/Documents/AI_cuu_ho/rescuelink-app/app/tracking-active.tsx).

---

## 📋 3. Nhiệm Vụ Tiếp Theo & Ưu Tiên (Next Steps & Priorities)

- `[ ]` Tích hợp Firebase service account key thật để thử nghiệm FCM Notification đầy đủ.
- `[ ]` Đăng ký API Key của Google Gemini (AI Studio miễn phí) điền vào file `.env` ở backend để chạy sản phẩm thật.
- `[x]` Chạy lệnh dọn dẹp xóa thư mục [rescuelink-vqg/](file:///Users/khoihuynh/Documents/AI_cuu_ho/rescuelink-vqg) khi có sự xác nhận của người dùng (Đã thực hiện).
- `[x]` Loại bỏ hoàn toàn vai trò `authority` / VQG và xóa mọi vết tích Viettel AI khỏi hệ thống (Đã thực hiện).

---

## 💡 4. Bài Học Kinh Kinh Nghiệm & Lưu Ý Đặc Biệt (Lessons Learned & Gotchas)

*   **Photon Geocoder**: Khi máy chủ Docker Photon local chưa khởi chạy, hệ thống tự động nhảy sang Komoot Photon public API (`https://photon.komoot.io`) để đảm bảo việc tìm kiếm tên các đỉnh núi, địa danh leo núi không bị gián đoạn.
*   **SMS Auto-Parser vs AI**: Tin nhắn Panic tự động khẩn cấp dùng Regex Parser để trích xuất vị trí lập tức. Tin nhắn mô tả chi tiết tai nạn (custom text không dấu) sử dụng Gemini 1.5 Flash để khôi phục dấu tiếng Việt và phân tích mức độ nguy hiểm.
*   **Chạm Bản Đồ Chớp Nổi HUD**: Sự kiện chạm trực tiếp trên bản đồ mang lại trải nghiệm UX linh hoạt hơn nhiều so với việc bắt buộc phải gõ thanh tìm kiếm khi trekking ngoài thực địa.

