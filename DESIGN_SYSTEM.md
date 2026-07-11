# 🎨 RescueLink — Hệ thống thiết kế Visual & UI/UX Framework

Tài liệu này định nghĩa hệ thống thiết kế (Design System), triết lý UI/UX, bảng màu chuẩn, cấu trúc layout và các nguyên tắc tương tác trên hai nền tảng **RescueLink Web Dashboard** (dành cho Chỉ huy HQ) và **RescueLink Mobile App** (dành cho Trekker leo núi).

---

## 👁️ 1. Mockup Thiết Kế Hệ Thống (High-Fidelity Mockups)

Hệ thống thiết kế của RescueLink kết hợp giữa sự tối giản, hiện đại và tính chính xác kỹ thuật cao để tối ưu hóa khả năng đọc thông tin cứu nạn trong các tình huống khẩn cấp.

### 🖥️ A. Giao diện Web Dashboard (Rescue Center HQ)
Giao diện tối (OLED-optimized Dark Mode) giúp giảm mỏi mắt cho nhân viên trực ca dài, bố trí layout dạng bento grid trực quan.

![RescueLink Web Dashboard](file:///Users/khoihuynh/Documents/AI_cuu_ho/assets/design/web_dashboard.png)

### 📱 B. Giao diện Mobile App (Trekker & Emergency SOS)
Tập trung tối đa vào Touch Target lớn, độ tương phản cực cao, trạng thái tín hiệu GPS và tương tác khẩn cấp 1-chạm (Hold-to-SOS 3 giây).

![RescueLink Mobile App](file:///Users/khoihuynh/Documents/AI_cuu_ho/assets/design/mobile_app.png)

---

## 🎨 2. Bảng Màu Chuẩn (Color Palette)

Hệ màu của RescueLink được cấu hình đồng bộ trực tiếp trong `tailwind.config.js` để làm **nguồn sự thật duy nhất (Single Source of Truth)**.

| Vai trò | Mã màu | Tên biến Tailwind | Mô tả |
| :--- | :--- | :--- | :--- |
| **Nền chính (Deep Dark)** | `#080c12` | `bg-surface` | Màu nền tối chủ đạo cho Web & Mobile. Giảm mỏi mắt, tiết kiệm pin OLED. |
| **Thẻ & Panel (Surface Slate 1)** | `#0d1117` | `bg-surface-1` | Bề mặt các sidebar, khối điều động chi tiết. |
| **Thẻ & Panel (Surface Slate 2)** | `#131920` | `bg-surface-2` | Bề mặt các hộp bento, card thông tin sự cố nhỏ. |
| **Cảnh báo SOS (Emergency Red)** | `#e11d48` | `text-emergency-600` | Màu đỏ cảnh báo chính. Dùng cho nút SOS, sự cố khẩn cấp mức 5. |
| **Cảnh báo trung bình (Warning Orange)**| `#f97316` | `text-severity-med` | Màu cam. Dùng cho sự cố mức 3 (lạc đường, thời tiết xấu). |
| **An toàn / Xong (Safe Green)** | `#10b981` | `text-safe-500` | Trạng thái trekker an toàn, sự cố đã giải quyết xong. |
| **Chữ phụ / Nhãn (Muted Slate)** | `#64748b` | `text-muted` | Sử dụng cho nhãn (labels), đường viền, dữ liệu phụ. |

### ♿ Phòng tránh mù màu đỏ-lục (Colorblind Accessibility - WCAG 1.4.1)
Để đảm bảo nhân viên chỉ huy bị mù màu đỏ-lục (chiếm ~8% nam giới) có thể phân biệt ngay lập tức trạng thái sự cố trong 1 giây nhìn lướt qua, RescueLink áp dụng nguyên tắc **"Không mã hóa thông tin chỉ bằng màu sắc"**:
- **Nhãn mức độ nghiêm trọng (Severity):** Đi kèm biểu tượng đặc trưng rõ ràng:
  - **Mức 1-2 (An toàn):** Có icon tích tròn xanh `CheckCircle` (✓).
  - **Mức 3 (Cảnh báo):** Có icon tam giác chấm than `Warning` (!).
  - **Mức 4-5 (Nguy hiểm):** Có icon cảnh báo `Warning` nhấp nháy liên tục (🚨).
- **Nhãn trạng thái sự cố (Status):**
  - **ĐANG MỞ (SOS):** Đi kèm còi báo động đỏ `🚨`.
  - **ĐANG CỨU HỘ:** Đi kèm đồng hồ cát đang chờ `⏳`.
  - **ĐÃ XONG (RESOLVED):** Đi kèm dấu tích hoàn thành `✅`.

---

## ✍️ 3. Hệ Thống Chữ (Typography System)

Typography được chia làm hai hướng: **Precise Data** (đối với số liệu kỹ thuật) và **Clean Readability** (đối với văn bản).

*   **Font chữ nội dung (Body/Headings):** **Inter** hoặc **Fira Sans**
    *   *Lý do:* Nét chữ không chân hiện đại, khoảng cách ký tự hoàn hảo giúp đọc nhanh nội dung sự cố hay hướng dẫn sơ cứu.
*   **Font chữ số liệu & Tọa độ (Data/Coordinates):** **Monospace (JetBrains Mono / Fira Code)**
    *   *Lý do:* Giúp các số tọa độ GPS (kinh độ, vĩ độ), dung lượng pin thẳng hàng hoàn hảo, không bị nhảy giật khung hình (layout shift) khi dữ liệu realtime cập nhật liên tục qua Socket.io.

---

## 📐 4. Cấu Trúc Bố Cục (Layout Architecture)

### 🖥️ Giao diện Web Dashboard (2-Column Grid)
1.  **Sidebar bên trái (220px fixed):**
    *   Gồm logo thương hiệu SVG-only.
    *   Phân khu "Phân Hệ Chỉ Huy HQ" với các liên kết điều hướng sạch.
    *   Hộp chuyển cổng nhanh (Portal Switcher) cho Admin.
2.  **Vùng hiển thị chính (Flexible Canvas):**
    *   **Dashboard chính:** Bản đồ Google Maps chiếm 70% chiều rộng để theo dõi vị trí trực quan, 30% bên phải là Bento Feed hiển thị danh sách sự cố sắp xếp theo mức độ khẩn cấp (Severity 5 -> 1).
    *   **Trang hiệu suất (HQAnalytics):** Sử dụng Bento Grid với 4 thẻ chỉ số nhanh ở trên cùng và 2 khối biểu đồ so sánh ở dưới.

### 📱 Giao diện Mobile App (Tab-based & Overlay)
*   **Touch Targets:** Tất cả các nút bấm tương tác ngoài thực địa (đặc biệt là nút SOS, nút bật Bluetooth) có kích thước tối thiểu **48x48dp** để dễ chạm khi Trekker đang di chuyển hoặc tay bị ướt/run.
*   **Dynamic Overlay:** Lớp phủ cảnh báo thời tiết hoặc pin yếu luôn nằm ở trên cùng để đập ngay vào mắt người dùng.

---

## ⚡ 5. Nguyên Tắc Trải Nghiệm Tương Tác (UX Interactions)

1.  **SOS khẩn cấp 1-chạm (Hold-to-SOS):**
    *   Để tránh bấm nhầm khi để điện thoại trong túi, Trekker phải chạm và giữ nút SOS trong **3 giây** (hiển thị vòng đếm ngược radial animation). Khi đủ 3 giây, điện thoại sẽ rung phản hồi xúc giác (Haptic Feedback) mạnh để xác nhận gửi tín hiệu thành công.
2.  **Phản hồi ngoại tuyến (Offline Mobile SOS state):**
    *   Khi Trekker kích hoạt SOS mà không có sóng mạng 4G/cellular để kết nối máy chủ, giao diện hiển thị ngay hộp thoại cảnh báo: *"Không thể kết nối với máy chủ. SOS đã được lưu ngoại tuyến và sẽ tự động đồng bộ khi có sóng. Hệ thống đang mở trình nhắn tin SMS để gửi tọa độ khẩn cấp qua sóng GSM dự phòng!"*
    *   Ứng dụng tự động nhảy sang màn hình tin nhắn mặc định của điện thoại cùng nội dung tin nhắn khẩn cấp nén gọn dưới 160 ký tự (1 segment GSM) đã điền sẵn số liên hệ khẩn cấp để người dùng nhấn Gửi ngay lập tức.
3.  **Tự động Debounce Tìm kiếm:**
    *   Mọi thanh tìm kiếm thông tin trekker/sự cố đều tích hợp debounce tự động **400ms** ngay sau khi người dùng dừng gõ phím. Loại bỏ hoàn toàn các nút "Tìm kiếm" thủ công rườm rà.
4.  **Code-Splitting & Lazy Loading:**
    *   Toàn bộ bản đồ Leaflet/Google Maps và thư viện biểu đồ Recharts được tách thành các lazy chunks. Khi người điều hành nhấn chuyển trang, hệ thống hiển thị hiệu ứng thẻ khung xương (Skeleton Cards) thay vì vòng xoay loading thô sơ, mang lại trải nghiệm mượt mà không bị giật trang (zero Cumulative Layout Shift - CLS).
