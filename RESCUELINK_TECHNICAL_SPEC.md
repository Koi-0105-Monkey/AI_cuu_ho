# 📑 Đặc Tả Kỹ Thuật Hệ Thống Cứu Hộ Dã Ngoại — RescueLink (Chuẩn Hóa & Bảo Mật)

Tài liệu này tổng hợp toàn bộ đặc tả kỹ thuật chuẩn của hệ thống **RescueLink** sau khi đã vá các lỗ hổng bảo mật nghiêm trọng, đồng bộ bảng màu và khôi phục các tính năng tự động cốt lõi.

---

## 🎨 1. Hệ Thống Thiết Kế & Bảng Màu (Design System)

Hệ thống thiết kế RescueLink được cấu hình trực tiếp vào `tailwind.config.js` để làm **nguồn sự thật duy nhất (Single Source of Truth)**, tuân thủ tiêu chuẩn WCAG 1.4.1 (không mã hóa thông tin chỉ bằng màu sắc).

### 1.1. Bảng màu chuẩn trong `tailwind.config.js`
*   **Màu nền chính (`--bg-base` / `#020617`):** Nền tối sâu (Deep dark) giúp tiết kiệm pin OLED và dễ nhìn ban đêm.
*   **Màu thẻ bề mặt (`--bg-surface` / `#0d1525`):** Dành cho cards, sidebar, panels và các khối bento.
*   **Màu viền phân cách (`--border-subtle` / `#1e293b`):** Biên giới siêu mảnh 1px.
*   **Chữ chính (`--text-primary` / `#f8fafc`):** Văn bản có độ tương phản >= 4.5:1 dưới nắng mặt trời.
*   **Chữ phụ (`--text-muted` / `#687385`):** Nhãn mô tả, chú thích.
*   **Màu trạng thái (Colorblind-Safe):**
    *   🔴 **Khẩn cấp (Critical - `#e11d48`):** Mức độ nghiêm trọng 5, ghim SOS nhấp nháy. Đi kèm icon còi báo `🚨` hoặc `!`.
    *   🟡 **Cảnh báo (Warning - `#f59e0b`):** Mức độ 3-4, sự cố vừa hoặc nhỏ. Đi kèm icon tam giác `⏳` hoặc `▲`.
    *   🔵 **An toàn / Đã xử lý (Safe - `#0ea5e9`):** Dùng xanh dương làm trạng thái an toàn để người mù màu dễ phân biệt với màu đỏ. Đi kèm icon tích `✓` hoặc `✅`.

### 1.2. Nguyên tắc Typography
*   **Văn bản & Tiêu đề:** Sử dụng font không chân **Inter** / **Fira Sans**.
*   **Tọa độ GPS & Chỉ số Pin:** Sử dụng font đơn cách **Monospace (JetBrains Mono / Fira Code)** để số liệu thẳng hàng hoàn hảo, không bị giật nhấp nháy (layout shift) khi cập nhật realtime.
*   **Biểu tượng (Icons):** Sử dụng SVG vector (Phosphor Icons), không dùng emoji hệ thống để hiển thị đồng nhất.

---

## 🛠️ 2. Danh Sách Tính Năng & Chức Năng (Feature Inventory)

### 📱 A. Mobile App (`rescuelink-app`) — Dành cho Trekker leo núi
1.  **Hold-to-SOS 3 Giây:** Người dùng phải ấn giữ nút SOS lớn trong 3 giây (có hiệu ứng radial đếm ngược và haptic vibration phản hồi) để tránh kích hoạt giả trong túi quần.
2.  **Định Vị GPS Thích Ứng (Adaptive Tracking):** Tự động điều chỉnh tần suất lấy tọa độ (giảm tần suất khi đứng yên, tăng khi di chuyển) để tiết kiệm pin tối đa.
3.  **Hàng Đợi Ngoại Tuyến (Offline Queue Service):** Lưu trữ tọa độ GPS và báo động SOS vào bộ nhớ thiết bị (`AsyncStorage`) khi mất sóng mạng 4G. Tự động đồng bộ lên server khi phát hiện có kết nối mạng trở lại.
4.  **Bản Đồ Ngoại Tuyến (Offline Maps):** Hỗ trợ tải trước các mảnh bản đồ (Slippy Map cache) của khu vực leo núi để tự xem vị trí và đường đi khi mất mạng hoàn toàn.
5.  **Tự Tạo Nhóm P2P Không Sóng (BLE RSSI Beacon):** Trekker quét mã QR ghép nhóm dã ngoại tự phát. Đo tín hiệu Bluetooth RSSI giữa các điện thoại trong nhóm để định vị tương đối (5-10m) khi mất hoàn toàn sóng 4G/GPS.
6.  **Gửi SOS qua SMS GSM Nén 7-bit:** Khi mất mạng data 4G, app tự động biên dịch tọa độ GPS thành tin nhắn khẩn cấp siêu nén (nằm gọn dưới 160 ký tự trong 1 segment GSM) gửi trực tiếp qua SMS cho người thân hoặc tổng đài cứu hộ.
    *   *Mô phỏng trong Dev:* Trong môi trường phát triển di động (`__DEV__`), việc gửi SMS được giả lập qua Alert hộp thoại để tránh tốn tiền điện thoại thật của lập trình viên.
7.  **Khai Báo Y Tế & Trang Bị:** Cho phép Trekker điền thông tin nhóm máu, dị ứng, thuốc men đặc trị, và trang bị mang theo (dây thừng, lều, GPS độc lập...) đồng bộ lên hệ thống trước khi bắt đầu cung đường leo núi.

### 🖥️ B. Web Dashboard (`rescuelink-web`) — Dành cho Chỉ huy cứu hộ HQ
1.  **Bản Đồ Command Center Realtime (Leaflet & Google Maps tiles):** Sử dụng thư viện Leaflet gọn nhẹ làm nhân bản đồ, nạp các lớp bản đồ Google Maps tiles (`https://mt1.google.com/vt/...`) để tối ưu hóa hiệu suất và dung lượng bundle client. Hiển thị ghim cứu hộ nhấp nháy đỏ dạng radar, vị trí trekker (ghim xanh dương có dấu tích), kiểm lâm (ghim xám khiên) và NASA fire hotspots (ghim cam lửa).
2.  **Bento Alert Feed:** Danh sách sự cố cập nhật realtime qua Socket.io, tự động sắp xếp theo điểm Severity (độ khẩn cấp) giảm dần từ 5 xuống 1.
    *   *Empty State:* Khi không có sự cố nào, hiển thị nhãn "Hệ thống đang giám sát bình thường" cùng khiên bảo vệ xanh dương để báo hiệu app hoạt động tốt.
3.  **AI Triage Breakdown Panel (Màn hình điều phối):** Trình bày chi tiết giải trình chấm điểm của AI (Severity Engine) bao gồm các trọng số: tình trạng y khoa, lượng pin điện thoại báo về, điều kiện thời tiết thực tế, thời điểm ban đêm, và tự động gắn cờ `needsManualReview` nếu dữ liệu có mâu thuẫn.
4.  **Giải Mã Y Khoa Audit Log:** Mã hóa y tế Trekker bằng khóa AES-256 đối xứng. Chỉ giải mã khi chỉ huy HQ nhấp xem chi tiết sự cố và lưu lại nhật ký truy cập (`MedicalAuditLog`) để đối soát bảo mật theo Nghị định 13/2023.
5.  **Báo Cáo Hiệu Suất Cứu Hộ (HQAnalytics):** Thống kê thời gian phản ứng cứu hộ (Response Time), thời gian giải quyết sự cố (Resolution Time) qua các tháng, phân bổ các loại sự cố thông qua biểu đồ Recharts.

---

## 🔒 3. Kiến Trúc Bảo Mật & Xác Thực (Security Architecture)

Hệ thống đã được thiết lập bảo mật 3 lớp cốt lõi chống brute force và giả mạo:
1.  **Xác thực chữ ký Twilio Webhook:** Đường dẫn nhận tin nhắn khẩn cấp SMS `/api/sms/inbound` bắt buộc xác minh chữ ký `X-Twilio-Signature` trong header để đảm bảo tin nhắn gửi đến thực sự đến từ tổng đài Twilio, chặn đứng hoàn toàn các request khẩn cấp giả mạo. (Bỏ qua khi chạy kiểm thử test/mock).
2.  **Xác thực Handshake Web Socket (Socket.io JWT Validation):** Mọi kết nối socket từ client lên server đều được chặn lại ở bước handshake để kiểm tra tính hợp lệ của token JWT. Chỉ các client đã đăng nhập hợp lệ mới được quyền kết nối và nhận bản tin realtime.
3.  **Rate limiting đăng nhập chống Brute-force:** Áp dụng giới hạn `loginRateLimiter` tối đa 5 lần thử đăng nhập / 5 phút trên route `/api/auth/login` trên mỗi IP/Số điện thoại để ngăn chặn dò tìm mật khẩu tài khoản điều hành.

---

## ⚙️ 4. Các Trình Quét Tự Động Định Kỳ (Cron Jobs)

1.  **Dead Man's Switch (Giám sát trễ hẹn):** Quét các chuyến trekking đang hoạt động mỗi phút:
    *   *Nhắc nhở:* Gửi push notification FCM báo động yêu cầu check-in khi trễ hẹn khoảng thời gian tự đặt.
    *   *SOS Tự Động:* Trễ giờ dự tính về quá 30 phút mà không check-in sẽ tự động tạo một sự cố mức 5 (LẠC) trên bản đồ cứu hộ và gửi SMS/Push cảnh báo trực tiếp.
2.  **Weather Watchdog (Giám sát thời tiết):** Định kỳ quét các chuyến đi ngoài thực địa, kết nối Open-Meteo API kiểm tra điều kiện khí tượng vùng hoạt động để gửi thông báo cảnh báo sớm (bão, lũ, rét đậm).
3.  **GPS Compression (Nén dữ liệu tọa độ):** Sử dụng thuật toán Ramer-Douglas-Peucker (RDP) định kỳ nén mảng tọa độ GPS của trekker (ví dụ nén từ 100 điểm xuống 10 điểm giữ nguyên hình dạng đường đi) để giảm tải cơ sở dữ liệu MongoDB.

---

## 🔌 5. Đặc Tả API Endpoints

Hệ thống hỗ trợ song song hai phiên bản truy cập: `/api/...` và `/api/v1/...` (cho API versioning) đảm bảo tính tương thích ngược lâu dài.

### 5.1. Danh sách Endpoints
*   `POST /api/v1/auth/register` — Đăng ký tài khoản.
*   `POST /api/v1/auth/login` — Đăng nhập hệ thống (Bảo vệ bởi Rate Limiter 5 lần / 5 phút).
*   `PATCH /api/v1/auth/profile` — Cập nhật thông tin cá nhân và hồ sơ y tế lâu dài.
*   `POST /api/v1/incidents` — Tạo sự cố khẩn cấp SOS (Bảo vệ bởi Rate Limiter 3 lần / 5 phút).
*   `GET /api/v1/incidents` — Lấy danh sách sự cố (phân trang, sắp xếp theo Severity).
*   `PATCH /api/v1/incidents/:id/assign` — Chỉ định cứu hộ viên thực địa.
*   `PATCH /api/v1/trips/:id/checkin` — Nhấp nút "Tôi vẫn ổn" để báo cáo an toàn (Dead Man's Switch).
*   `POST /api/v1/sms/inbound` — Tiếp nhận tin nhắn SMS Twilio (Yêu cầu xác thực chữ ký Twilio).

---

## 🛠️ 6. Công Cụ & Stack Công Nghệ (Technology Stack)

*   **Mobile Client:** Expo SDK 54, React Native (TypeScript), Nativewind v5.
*   **Web Client:** React 19, Vite, Recharts, Leaflet, Google Maps Tiles.
*   **Backend Server:** Node.js, Express 5, MongoDB Atlas, Mongoose, Sentry.
*   **Trí tuệ nhân tạo (AI):** **Google Gemini API** (Model động cấu hình qua `.env` `GEMINI_MODEL`, mặc định là `gemini-3.5-flash` để tránh lỗi khai tử model cũ).
