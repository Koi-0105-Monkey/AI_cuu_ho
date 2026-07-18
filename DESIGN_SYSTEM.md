# 🎨 RescueLink — Giải Pháp Thiết Kế UI/UX (Bản Chuẩn Hóa)

---
## ⚠️ QUY TẮC ƯU TIÊN (đọc trước khi áp dụng bất kỳ skill thiết kế nào)

File này là nguồn sự thật DUY NHẤT cho font, màu sắc, và hướng thẩm mỹ của
RescueLink. Khi các skill khác (design-taste-frontend, high-end-visual-design,
minimalist-ui...) đưa ra quy tắc MÂU THUẪN với file này (ví dụ: skill cấm
dùng Inter nhưng file này yêu cầu Inter/Fira Sans; skill yêu cầu glassmorphism
nhưng file này không đề cập), LUÔN LUÔN ưu tiên theo file này.

Hướng thẩm mỹ chính thức của dự án: **Tactical Telemetry** (theo skill
industrial-brutalist-ui, nhánh Dark/CRT Terminal) — KHÔNG áp dụng nhánh
"Ethereal Glass" hay "Soft Structuralism" từ các skill khác. Cụ thể:
- KHÔNG glassmorphism, KHÔNG gradient text, KHÔNG double-bezel card
- KHÔNG animation vô hạn trang trí (pulse/float/glow) trừ khi có ý nghĩa
  cảnh báo thật (SOS, sự cố khẩn cấp)
- Border 1px chia vùng rõ ràng thay vì shadow/blur
- Monospace (JetBrains Mono) ưu tiên cho số liệu, KHÔNG dùng Outfit —
  dùng Inter cho nội dung chính như đã chốt ở mục 4 bên dưới
---

Tài liệu này định nghĩa hệ thống thiết kế (Design System) duy nhất của RescueLink, cấu hình trực tiếp vào `tailwind.config.js` và `index.css` để làm **nguồn sự thật duy nhất (Single Source of Truth)**.

---

## 1. Vấn đề giải quyết

| # | Vấn đề | Mức độ | Giải pháp |
|---|---|---|---|
| 1 | Đỏ-Cam-Lục dễ gây nhầm lẫn cho người mù màu đỏ-lục (~8% nam giới) | 🔴 Nghiêm trọng | Thay thế xanh lá bằng **Xanh dương** (`#0ea5e9`). Đi kèm biểu tượng đặc trưng (icon) cho mọi nhãn trạng thái và marker. |
| 2 | Mobile không có trạng thái phản hồi rõ ràng khi SOS gửi thất bại | 🔴 Nghiêm trọng | Bổ sung **5 trạng thái trực quan & phản hồi xúc giác** cho nút Hold-to-SOS. |
| 3 | Mâu thuẫn bảng màu giữa các tài liệu thiết kế cũ | 🟠 Cần đồng bộ | Đồng bộ hóa một bảng màu duy nhất làm chuẩn cho toàn bộ code và tài liệu. |

---

## 👁️ 2. Mockup Thiết Kế Hệ Thống (High-Fidelity Mockups)

### 🖥️ A. Giao diện Web Dashboard (Rescue Center HQ)
Giao diện tối (OLED-optimized Dark Mode) giúp giảm mỏi mắt cho nhân viên trực ca dài, bố trí layout dạng bento grid trực quan.

![RescueLink Web Dashboard](file:///Users/khoihuynh/Documents/AI_cuu_ho/assets/design/web_dashboard.png)

### 📱 B. Giao diện Mobile App (Trekker & Emergency SOS)
Tập trung tối đa vào Touch Target lớn, độ tương phản cực cao, trạng thái tín hiệu GPS và tương tác khẩn cấp 1-chạm (Hold-to-SOS 3 giây).

![RescueLink Mobile App](file:///Users/khoihuynh/Documents/AI_cuu_ho/assets/design/mobile_app.png)

---

## 🎨 3. Bảng Màu Chuẩn Duy Nhất

**Nguyên tắc bắt buộc: không bao giờ dùng MÀU làm kênh thông tin duy nhất.** Mọi trạng thái khẩn cấp phải đi kèm ít nhất 1 trong: icon, hình dạng, hoặc text label.

### 3.1 Màu nền & bề mặt

| Token | Hex | Vai trò | Tên trong code (Tailwind) |
|---|---|---|---|
| `--bg-base` | `#020617` | Nền chính Web & Mobile | `bg-[#020617]` (body) |
| `--bg-surface` | `#0d1525` | Card, Sidebar, Panel | `bg-surface` (`surface.DEFAULT`) |
| `--border-subtle` | `#1e293b` | Viền, đường phân chia | `border-surface-4` (`surface.4`) |
| `--text-primary` | `#f8fafc` | Văn bản chính | `text-white` |
| `--text-muted` | `#687385` | Label phụ, chú thích | `text-muted` (`muted.DEFAULT`) |

### 3.2 Màu trạng thái (đã kiểm tra phân biệt được với mù màu đỏ-lục)

| Token | Hex | Vai trò | Icon bắt buộc đi kèm | Tên trong code (Tailwind) |
|---|---|---|---|---|
| `--status-critical` | `#e11d48` | Cấp độ 5, SOS mới | ⬤ chấm nhấp nháy + icon `!` | `text-emergency-600` / `severity-high` |
| `--status-warning` | `#f59e0b` | Cấp độ 3-4 | icon `▲` cảnh báo | `text-severity-med` / `gold.500` |
| **`--status-safe`** | **`#0ea5e9`** (Xanh dương) | An toàn, đã xử lý | icon `✓` dấu tích | `text-safe-500` / `severity-low` |
| `--status-info` | `#3b82f6` | Tọa độ, trạng thái kỹ thuật | — | `text-status-info` |

*Lý do đổi "an toàn" từ xanh lá sang xanh dương:* Xanh dương (`#0ea5e9`) và đỏ (`#e11d48`) là cặp màu dễ phân biệt nhất đối với người mù màu đỏ-lục. Mọi nhãn trạng thái và marker bắt buộc có icon/text đi kèm để tăng độ an toàn.

### 3.3 Cách áp dụng cho map markers
- **SOS marker:** 🔴 Nền đỏ + icon `!` trắng ở giữa + viền nhấp nháy phát sóng.
- **Trekker an toàn:** 🔵 Nền xanh dương + icon tích xanh `✓` (hoặc người đi bộ).
- **Ranger tuần tra:** ⬛ Nền xám đậm + icon khiên bảo vệ `🛡️`.
- **Cháy rừng NASA:** 🟠 Nền cam + icon ngọn lửa `🔥`.

---

## ✍️ 4. Typography (Hệ Thống Chữ)

- **Nội dung / Tiêu đề:** **Inter** hoặc **Fira Sans** (Nét chữ không chân hiện đại, khoảng cách ký tự giúp đọc nhanh nội dung).
- **Số liệu / Tọa độ / Pin:** **Monospace (JetBrains Mono / Fira Code)** (Đơn cách, giúp các tọa độ GPS và % pin thẳng hàng hoàn hảo, không bị nhảy giật khung hình khi cập nhật realtime).
- **Không dùng emoji trong logo hoặc icon hệ thống** (Dùng SVG icon set như Lucide/Phosphor) để đảm bảo đồng bộ hiển thị trên mọi hệ điều hành của trung tâm chỉ huy.

---

## 📶 5. Trạng thái Mobile SOS — 5 Cấp Phản Hồi Bắt Buộc

Nút Hold-to-SOS trên di động cần tối thiểu 5 trạng thái hiển thị rõ ràng để người dùng biết kết quả gửi tín hiệu:

| Trạng thái | Hiển thị trên màn hình | Haptic (Rung) | Phản hồi ứng xử |
|---|---|---|---|
| **1. Đang giữ (0-3s)** | Vòng đếm ngược radial chuyển màu | Rung nhẹ liên tục | Đang tích lũy thời gian giữ |
| **2. Đang gửi (có sóng)** | Icon xoay spinner + *"Đang gửi tín hiệu..."* | Rung mạnh 1 lần tại giây thứ 3 | Đang upload gói tin khẩn cấp lên server |
| **3. Gửi thành công** | Icon `✓` xanh dương full-screen + *"HQ đã nhận được vị trí"* | Rung mạnh 2 lần | Hoàn thành, yên tâm chờ điều phối |
| **4. Mất mạng - SMS dự phòng** | Icon `⚠` vàng + *"Không có mạng. Đang gửi qua SMS..."* | Rung mạnh 1 lần dài | Tự động mở trình soạn tin nhắn SMS chứa GPS qua sóng GSM |
| **5. Gửi thất bại hoàn toàn** | Icon `✗` đỏ + *"Chưa gửi được. Thử lại..."* + nút Thử lại thủ công | Rung liên tục 3 lần, lặp lại mỗi 30s | Lưu vào queue offline, thử lại tự động khi dò thấy sóng mạng |

*Nguyên tắc quan trọng nhất:* Người dùng không bao giờ được phép để màn hình im lặng sau khi giữ đủ 3 giây. Luôn phải có phản hồi hình ảnh + haptic bất kể kết quả mạng như thế nào.

---

## 📐 6. Layout & UX Polish

- **Bản đồ & Feed (70/30):** Maps chiếm 70% bên phải, Bento Feed chiếm 30% bên trái sắp xếp sự cố theo Severity giảm dần.
- **Empty State cho Incident Feed:** Khi không có sự cố nào, feed hiển thị: **"Hệ thống đang giám sát bình thường"** đi kèm biểu tượng khiên bảo vệ màu xanh lá/dương để tránh gây cảm giác ứng dụng bị treo/lỗi dữ liệu.
- **Xác nhận điều phối cứu hộ:** Nút *"Xác nhận điều động"* cần 1 bước xác nhận phụ (Double-check modal) để tránh kích hoạt nhầm đội cứu hộ thực địa ngoài thực tế.
