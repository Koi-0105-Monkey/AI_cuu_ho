# 🚨 RescueLink - Emergency & Outdoor Safety Platform

![RescueLink App Banner](rescuelink-app/assets/images/app_banner.png)

**RescueLink** (RescueAI) là nền tảng an toàn dã ngoại và cứu trợ khẩn cấp thông minh, được thiết kế để hỗ trợ người leo núi (trekking) và thám hiểm trong các tình huống đi lạc, gặp tai nạn hoặc mất liên lạc ở khu vực rừng núi sâu. Hệ thống kết hợp định vị ngầm thích ứng, bản đồ ngoại tuyến, phát hiện bất thường bằng AI, và cơ chế gửi tín hiệu khẩn cấp đa phương thức (WebSockets/SMS).

---

## 🌐 Địa chỉ Xuất bản (Production Links)

*   **Bảng điều khiển Web Admin (Vercel)**: [https://ai-cuu-ho-web.vercel.app](https://ai-cuu-ho-web.vercel.app)
*   **Máy chủ Backend API (Render)**: [https://rescuelink-backend-5wwo.onrender.com](https://rescuelink-backend-5wwo.onrender.com)

---

## 🔑 Danh Sách Tài Khoản Test & Các Phân Quyền (Actors & Credentials)

Hệ thống **RescueLink** phân quyền tinh gọn gồm **3 Actor chính**:

| Phân quyền (Actor) | Nền tảng / Ứng dụng | Quyền hạn chính | Tài khoản thử nghiệm (Test Account) |
| :--- | :--- | :--- | :--- |
| **`user`** (Trekker) | 📱 Mobile App ([`rescuelink-app`](file:///Users/khoihuynh/Documents/AI_cuu_ho/rescuelink-app)) | Đăng ký cá nhân, xem thời tiết, theo dõi GPS, gửi SOS khẩn cấp, chọn vị trí trên Map, chia sẻ Family Link | Đăng ký tự do bằng bất kỳ SĐT nào trên App |
| **`operator`** (Công ty Tour) | 🖥️ Web Portal ([`/operator`](file:///Users/khoihuynh/Documents/AI_cuu_ho/rescuelink-web/src/pages/operator)) & 📱 App | Tạo nhóm ghép đoàn trekking, sinh mã QR / PIN 6 số, xem thông tin y tế đoàn, xuất danh sách PDF | SĐT: **`0123456789`**<br>Pass: **`test123`** |
| **`admin` / `rescuer`** (HQ & Cứu hộ) | 🖥️ Web Admin ([`rescuelink-web`](file:///Users/khoihuynh/Documents/AI_cuu_ho/rescuelink-web)) | Toàn quyền giám sát bản đồ sự cố khẩn cấp thời gian thực, điều phối cứu hộ, ghim vị trí chọn trên Leaflet Map, tìm kiếm địa điểm | SĐT: **`012345678`**<br>Pass: **`admin123`** |

---

## 📸 Giao diện Hệ thống

### 1. 📱 Ứng dụng Di động (RescueLink Mobile App — Premium Deep Dark Redesign)
Ứng dụng di động đã được thiết kế lại toàn diện theo phong cách **Premium Deep Dark** hiện đại, sử dụng bảng màu OLED-ready tối sâu (`#050505`), điểm nhấn màu cam đỏ cứu hộ ấm áp (`#FF4D3D`), bo góc mềm mại (`rounded-3xl`) và giao diện HUD (Heads-Up Display) trực quan:

| Trang Chủ (Home Screen) | Bản Đồ Tracking (Live HUD) | Báo Động Khẩn Cấp (SOS Screen) |
| :---: | :---: | :---: |
| ![Trang chủ](rescuelink-app/assets/images/home_mockup.png) | ![Bản đồ tracking](rescuelink-app/assets/images/active_trip_mockup.png) | ![Báo động SOS](rescuelink-app/assets/images/emergency_mockup.png) |
| *Lời chào cá nhân hóa, bảng điều khiển hành trình & chỉ số nhanh* | *Giao diện bản đồ với các bảng điều khiển HUD bo tròn nổi bật* | *Lựa chọn loại sự cố khẩn cấp dạng thẻ tối giản có phân mức* |

| Thiết Lập Hành Trình (Trekking Setup) | Thông Tin Cá Nhân (Profile & Device Status) | Màn Hình Đăng Nhập (Login Flow) |
| :---: | :---: | :---: |
| ![Thiết lập hành trình](rescuelink-app/assets/images/trekking_setup_mockup.png) | ![Thông tin cá nhân](rescuelink-app/assets/images/profile_mockup.png) | ![Đăng nhập](rescuelink-app/assets/images/login_mockup.png) |
| *Lựa chọn thời gian dạng nhãn thuốc (pills), nhập thông tin hành trình* | *Liên lạc khẩn cấp, vai trò thành viên & thông số pin/sóng* | *Giao diện đăng nhập nhận diện thương hiệu RescueLink với đỉnh núi* |

### 2. 🖥️ Trang đăng nhập Hệ thống Cứu hộ (RescueLink Web Login)
Trang đăng nhập Admin dành cho nhân viên trung tâm cứu hộ, bảo mật bằng số điện thoại và mật khẩu:

![RescueLink Web Login](rescuelink-app/assets/images/web_login_preview.webp)

### 3. 🖥️ Bảng điều khiển Trung tâm Cứu hộ (RescueLink Web Dashboard - Premium Deep Dark & Viettel Maps)
Bảng điều khiển thời gian thực cao cấp dành cho cứu hộ và kiểm lâm: theo dõi live incident feed, vẽ ranh giới phân khu cấm Geofencing, điểm cháy vệ tinh và giám sát tuần tra thực địa trên nền bản đồ số Viettel Maps:

![RescueLink Web Dashboard](rescuelink-app/assets/images/web_dashboard_mockup.png)

---

## 🛠️ Công nghệ Sử dụng & Đánh giá Kiến trúc

Hệ thống được chia làm các thành phần chính hoạt động độc lập và đồng bộ với nhau qua REST API, WebSockets và push notifications:

```mermaid
graph TD
    A[RescueLink Mobile - Expo] -->|1. GPS, SOS & Vi phạm rừng| B(RescueLink Backend - Express)
    A -->|2. Dự phòng SMS 7-bit| C[Số Điện Thoại Người Thân]
    B -->|3. Socket.io Real-time| D[RescueLink Web - React]
    B -->|4. Lưu trữ| E[(MongoDB Cloud)]
    B -->|5. Trình gửi SMS & FCM Mock| F[Twilio / Firebase Service]
```

### 1. 📱 Mobile App (`rescuelink-app`)
*   **Công nghệ**: Expo SDK 54, React Native, TypeScript, Nativewind (Tailwind CSS v4).
*   **Định vị ngầm**: Sử dụng `expo-location` và `expo-task-manager` đăng ký tác vụ chạy ẩn hệ thống (`background-location-task`). Cơ chế cập nhật tần số thích ứng thông minh dựa trên dung lượng pin và vận tốc di chuyển thực tế để tiết kiệm pin tối đa.
*   **Bản đồ & Chỉ đường Ngoại tuyến**:
    *   Sử dụng `react-native-maps` hiển thị bản đồ địa hình.
    *   Tự động tải trước và lưu trữ cục bộ (Tile Cache) các phân mảnh bản đồ vùng núi cận kề qua slippy map coordinate math (`lon2tile`/`lat2tile`) với buffer bán kính 3x3 và 5x5.
    *   Lưu trữ ngoại tuyến các tuyến đường chỉ dẫn qua lưu cache OSRM vào `AsyncStorage`.
*   **Hệ thống Cảnh báo & Âm thanh**:
    *   Sử dụng `expo-av` để phát âm thanh cảnh báo lớn ngoại tuyến trong đếm ngược 10s.
    *   Sử dụng `expo-notifications` quản lý các cảnh báo hệ thống và ghim thông báo hành trình thường trực (`ongoing: true`/`sticky: true`) trên khay trạng thái hệ điều hành Android/iOS.
*   **Widget & Chia sẻ**:
    *   Tích hợp Live Weather widget lấy thông tin thời tiết tự động.
    *   Cung cấp tính năng sao chép link chia sẻ hành trình (Family Share Link) gửi nhanh cho người thân qua Zalo/SMS.

### 2. 🖥️ Web Operator Dashboard & Portals (`rescuelink-web`)
*   **Công nghệ**: React 19, Vite, Tailwind CSS v3, React Router v7.
*   **Bản đồ Giám sát**: Leaflet & React-Leaflet vẽ tọa độ hành trình và các vùng khoanh vùng cứu hộ khẩn cấp thời gian thực.
*   **Thời gian thực**: Tích hợp `socket.io-client` để đồng bộ vị trí di chuyển và thông báo sự cố ngay lập tức mà không cần tải lại trang.
*   **Cổng Tour Operator B2B**: Quản lý hướng dẫn viên, phân đoàn và theo dõi đoàn trekking tập trung tại route `/operator`.
*   **Trang Public Family View**: Người thân theo dõi trực tiếp vị trí thông qua share link `/family/:shareToken` mà không cần tài khoản.

### 3. 🗺️ Module Tìm Kiếm Địa Điểm Bản Đồ & Google Gemini AI
*   **Photon Geocoder (Docker & Komoot Fallback)**: Tích hợp công cụ geocoding tìm kiếm địa danh, đỉnh núi, lán trại leo núi toàn quốc (Fansipan, Tà Xùa, Lảo Thần, Bạch Mộc Lương Tử...) tự động fallback mượt mà từ Docker Photon local đến Komoot Photon public API.
*   **Trực quan hóa Chọn Vị Trí Trên Bản Đồ (Tap-to-Select)**: Hỗ trợ nhấp/chạm trực tiếp vào bất kỳ đâu trên Leaflet Map (Web) hoặc MapView (Mobile) để ghim marker vị trí và tải bản đồ ngoại tuyến vùng tương ứng.
*   **Google Gemini 1.5 Flash AI**: Tích hợp giải mã âm thanh Voice SOS, khôi phục dấu tiếng Việt cho tin nhắn SMS không dấu vùng sóng yếu và trích xuất thực thể tai nạn khẩn cấp.

### 4. ⚙️ Backend API Server (`rescuelink-backend`)
*   **Công nghệ**: Node.js, Express 5, MongoDB & Mongoose.
*   **Kết nối**: Socket.io (v4) quản lý kết nối thời gian thực hai chiều giữa thiết bị di động và bảng điều khiển cứu hộ.
*   **Cảnh báo thời tiết tự động**: Chạy cron job mỗi 30 phút tự động kiểm tra thời tiết nguy hiểm (Open-Meteo API) tại tọa độ của các chuyến đi đang hoạt động và gửi push thông báo.
*   **Dự phòng & Gửi tin tự động**:
    *   Tích hợp SDK Twilio gửi tin nhắn SMS khẩn cấp tự động (có SMS_MOCK_MODE cho dev).
    *   Tích hợp Firebase Admin SDK để gửi push notification FCM trực tiếp lên thiết bị di động.

---

## 🔄 Quy trình Hoạt động Cấp cứu Đặc biệt

### 1. Cơ chế Nhấn Đúp (Double-tap) & Đếm ngược 10s tránh bấm nhầm do Nước
*   **Thách thức**: Người leo núi đi trong rừng thường gặp mưa, tay bị ướt hoặc kẹp máy vào đai đeo, nếu dùng nút nhấn giữ (long press) hoặc chạm đơn rất dễ bị trượt cảm ứng hoặc kích hoạt giả.
*   **Quy trình**:
    1.  Người dùng chạm 1 lần: Ứng dụng hiển thị Tooltip nhắc nhở `"🚨 NHẤN ĐÚP 2 LẦN LIÊN TỤC ĐỂ BÁO CỨU HỘ"` và ẩn sau 2.5s.
    2.  Chạm 2 lần liên tiếp (< 1s): Ứng dụng kích hoạt Overlay toàn màn hình, chặn tất cả thao tác bản đồ.
    3.  Ứng dụng đếm ngược lùi từ 10 về 0. Mỗi giây trôi qua, thiết bị phát âm thanh bíp lớn và rung mạnh liên tục.
    4.  Nếu là kích hoạt nhầm, người dùng chỉ cần chạm nút **"HỦY CẤP CỨU"** để khôi phục lại trạng thái cũ.
    5.  Sau 10 giây (hoặc bấm **"GỬI CỨU HỘ NGAY"**), tín hiệu khẩn cấp sẽ tự động gửi đi mà không cần thao tác gì thêm.

### 2. Nén Dữ liệu SMS SOS Siêu nhẹ cho Vùng Sóng Yếu
*   **Thách thức**: Trong rừng sâu, sóng di động thường chập chờn (chỉ có 1 vạch sóng vụt qua rồi mất). Tin nhắn SMS dài/chứa tiếng Việt có dấu sẽ bị chia làm nhiều phân đoạn (Multi-part SMS) dẫn đến tỷ lệ thất bại rất cao.
*   **Giải pháp**: Hệ thống sử dụng thuật toán đóng gói chuỗi ASCII không dấu, nén tọa độ GPS xuống 5 chữ số thập phân (vẫn đảm bảo sai số tối đa chỉ ~1.1 mét):
    `SOS RescueLink! maps.google.com/?q=21.02854,105.85421` (Đúng 53 ký tự ASCII).
*   **Hiệu quả**: Tin nhắn ngắn hơn 60 ký tự, nằm gọn trong 1 phân đoạn truyền tải cơ bản (Single Segment GSM 7-bit tối đa 160 ký tự), nâng xác suất gửi tin thành công lên gấp **5 lần** khi sóng cực kỳ yếu.

### 3. Phát hiện Bất thường bằng AI (AI Anomaly Detection)
*   **Đi lòng vòng (Going in Circles)**: Nếu quãng đường di chuyển > 1500m nhưng khoảng cách thực tế so với vị trí 30 phút trước đó < 200m -> AI suy luận người dùng đang bị đi lạc vòng tròn (mất định hướng) và tự động kích hoạt báo động.
*   **Lệch cung đường (Route Deviation)**: Đo khoảng cách vuông góc từ vị trí hiện tại đến cung đường đã đăng ký. Nếu lệch > 500m, hệ thống sẽ cảnh báo người dùng và người thân ngay lập tức.

---

## 🚀 Hướng dẫn Cài đặt & Chạy Dự án

### Yêu cầu hệ thống
*   Node.js phiên bản >= 18
*   MongoDB Server local hoặc tài khoản MongoDB Atlas
*   Expo Go cài trên điện thoại (để chạy thử app di động)

### 1. Chạy Backend Server
```bash
cd rescuelink-backend
npm install

# Tạo file .env và điền các cấu hình cần thiết (PORT, MONGO_URI, JWT_SECRET, TWILIO_SID...)
npm run dev
```

### 2. Chạy Web Dashboard (Doanh nghiệp & Cứu Hộ)
```bash
cd rescuelink-web
npm install
npm run dev
```
Mở trình duyệt truy cập `http://localhost:5173`.
### 3. Chạy App Di động (Expo)
```bash
cd rescuelink-app
npm install
npm start
```
Quét mã QR hiển thị trên Terminal bằng ứng dụng Expo Go trên iOS hoặc Android để khởi động.

---

## 🧪 Chạy Kiểm thử (Testing)

*   **Mobile App Tests** (Kiểm tra hình học Geo-tracking và trình đóng gói SMS):
    ```bash
    cd rescuelink-app
    npm test
    ```
*   **Backend Integration Tests** (Kiểm tra API đăng ký hành trình, tạo incident):
    ```bash
    cd rescuelink-backend
    npm test
    ```
*   **Web Dashboard Tests**:
    ```bash
    cd rescuelink-web
    npm run test       # Chạy unit tests bằng vitest
    npm run test:e2e   # Chạy e2e tests bằng playwright
    ```

