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

Hệ màu của RescueLink tuân thủ nghiêm ngặt tiêu chuẩn tương phản **WCAG AA/AAA** để có thể nhìn rõ dưới ánh sáng mặt trời mạnh (màn hình di động ngoài trời) hoặc ban đêm (phòng chỉ huy).

| Nhóm màu | Giá trị Hex | Vai trò / Ý nghĩa thiết kế |
|:---|:---|:---|
| **Midnight Background** | `#020617` | Màu nền tối chủ đạo cho Web & Mobile. Giảm mệt mỏi thị giác, tiết kiệm pin OLED. |
| **Emergency Red** | `#e11d48` | Màu cảnh báo khẩn cấp chính. Dùng cho nút SOS, sự cố cấp độ 5 (chấn thương nghiêm trọng). |
| **Warning Orange** | `#f97316` | Màu cảnh báo trung bình. Dùng cho cấp độ 3-4 (lạc đường, thời tiết xấu). |
| **Success/Safe Green** | `#10b981` | Trạng thái an toàn. Pin khỏe, GPS tốt, sự cố đã giải quyết xong. |
| **Technical Blue** | `#3b82f6` | Hiển thị tọa độ, các liên kết kỹ thuật và trạng thái đang cứu hộ. |
| **Surface Dark** | `#0d1525` | Màu nền của các thẻ (Cards), Sidebar, và các thành phần nâng lên từ nền chính. |
| **Muted Slate** | `#687385` | Màu chữ phụ, nhãn (labels), đường lưới biểu đồ và biên giới (borders). |
| **White/Foreground** | `#f8fafc` | Màu văn bản chính, đảm bảo độ tương phản tối thiểu 4.5:1. |

---

## ✍️ 3. Hệ Thống Chữ (Typography System)

Typography được chia làm hai hướng: **Precise Data** (đối với số liệu kỹ thuật) và **Clean Readability** (đối với văn bản).

*   **Font chữ nội dung (Body/Headings):** **Inter** hoặc **Fira Sans**
    *   *Lý do:* Nét chữ không chân hiện đại, khoảng cách ký tự hoàn hảo giúp đọc nhanh nội dung sự cố hay hướng dẫn sơ cứu.
*   **Font chữ số liệu & Tọa độ (Data/Coordinates):** **JetBrains Mono** hoặc **Fira Code**
    *   *Lý do:* Font monospace (đơn cách) giúp các số tọa độ GPS (kinh độ, vĩ độ), thời gian cứu hộ và dung lượng pin thẳng hàng hoàn hảo, không bị nhảy giật khung hình (layout shift) khi dữ liệu realtime cập nhật liên tục qua Socket.io.

---

## 📐 4. Cấu Trúc Bố Cục (Layout Architecture)

### 🖥️ Giao diện Web Dashboard (2-Column Grid)
1.  **Sidebar bên trái (220px fixed):**
    *   Gồm logo thương hiệu SVG-only (không dùng emoji).
    *   Phân khu "Phân Hệ Chỉ Huy HQ" với các liên kết điều hướng sạch.
    *   Hộp chuyển cổng nhanh (Portal Switcher) cho Admin.
2.  **Khu vực hiển thị chính (Flexible Canvas):**
    *   **Dashboard chính:** Bản đồ Google Maps chiếm 70% chiều rộng để theo dõi vị trí trực quan, 30% bên phải là Bento Feed hiển thị danh sách sự cố sắp xếp theo mức độ khẩn cấp (Severity 5 -> 1).
    *   **Trang hiệu suất (HQAnalytics):** Sử dụng Bento Grid với 4 thẻ chỉ số nhanh ở trên cùng và 2 khối biểu đồ so sánh ở dưới.

### 📱 Giao diện Mobile App (Tab-based & Overlay)
*   **Touch Targets:** Tất cả các nút bấm tương tác ngoài thực địa (đặc biệt là nút SOS, nút bật Bluetooth) có kích thước tối thiểu **48x48dp** để dễ chạm khi Trekker đang di chuyển hoặc tay bị ướt/run.
*   **Dynamic Overlay:** Lớp phủ cảnh báo thời tiết hoặc pin yếu luôn nằm ở trên cùng để đập ngay vào mắt người dùng.

---

## ⚡ 5. Nguyên Tắc Trải Nghiệm Tương Tác (UX Interactions)

1.  **SOS khẩn cấp 1-chạm (Hold-to-SOS):**
    *   Để tránh bấm nhầm khi để điện thoại trong túi, Trekker phải chạm và giữ nút SOS trong **3 giây** (hiển thị vòng đếm ngược radial animation). Khi đủ 3 giây, điện thoại sẽ rung phản hồi xúc giác (Haptic Feedback) mạnh để xác nhận gửi tín hiệu thành công.
2.  **Tự động Debounce Tìm kiếm:**
    *   Mọi thanh tìm kiếm thông tin trekker/sự cố đều tích hợp debounce tự động **400ms** ngay sau khi người dùng dừng gõ phím. Loại bỏ hoàn toàn các nút "Tìm kiếm" thủ công rườm rà.
3.  **Code-Splitting & Lazy Loading:**
    *   Toàn bộ bản đồ Leaflet/Google Maps và thư viện biểu đồ Recharts được tách thành các lazy chunks. Khi người điều hành nhấn chuyển trang, hệ thống hiển thị hiệu ứng thẻ khung xương (Skeleton Cards) thay vì vòng xoay loading thô sơ, mang lại trải nghiệm mượt mà không bị giật trang (zero Cumulative Layout Shift - CLS).
