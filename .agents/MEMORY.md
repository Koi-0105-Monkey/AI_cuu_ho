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
*   **Tích hợp Trí tuệ Thiết kế UI/UX Pro Max**:
    *   Cài đặt bộ skill [ui-ux-pro-max](file:///Users/khoihuynh/Documents/AI_cuu_ho/.agents/skills/ui-ux-pro-max) trực tiếp vào thư mục `.agents/skills/` để các AI Agent trong tương lai tự động truy xuất cẩm nang thiết kế chuẩn chỉ.
    *   Hỗ trợ sinh tự động hệ thống Token thiết kế thông qua CLI `search.py` và tối ưu hóa các thành phần UI (Touch Target size >= 44x44pt, loading feedback, contrast check) cho RescueLink Web & Mobile App.

---

## 📋 3. Nhiệm Vụ Tiếp Theo & Ưu Tiên (Next Steps & Priorities)

- `[ ]` Tích hợp Firebase service account key thật để thử nghiệm FCM Notification đầy đủ.
- `[ ]` Đăng ký API Key của Google Gemini (AI Studio miễn phí) điền vào file `.env` ở backend để chạy sản phẩm thật.
- `[x]` Chạy lệnh dọn dẹp xóa thư mục [rescuelink-vqg/](file:///Users/khoihuynh/Documents/AI_cuu_ho/rescuelink-vqg) khi có sự xác nhận của người dùng (Đã thực hiện).
- `[x]` Loại bỏ hoàn toàn vai trò `authority` / VQG và xóa mọi vết tích Viettel AI khỏi hệ thống (Đã thực hiện).
- `[x]` Triển khai mã hóa dữ liệu y khoa (AES-256-CBC) và bảng nhật ký Audit Log bảo mật (Nghị định 13/2023) (Đã thực hiện).

---

## 💡 4. Bài Học Kinh Kinh Nghiệm & Lưu Ý Đặc Biệt (Lessons Learned & Gotchas)

*   **Mã hóa Y khoa & Access Control (Nghị định 13/2023)**:
    *   Hồ sơ y khoa được mã hóa đối xứng bằng khóa bí mật 32-byte thông qua getters/setters của Mongoose.
    *   Thông tin y tế đầy đủ bị lọc bỏ khỏi mọi route xem danh sách (incidents list, users list) và chỉ trả về duy nhất trong chi tiết Incident `GET /api/incidents/:id` nếu người xem vượt qua bộ lọc ACL (là Admin, Chủ sở hữu hoặc Cứu hộ viên được phân công ca đó).
    *   Mỗi lượt truy cập được giải mã thành công đều lưu vết bảo mật vào bảng `MedicalAuditLog` để lưu trữ đối soát bảo mật.
*   **Rate Limiting chống Spam**: SOS endpoint được bảo vệ bởi rate limiter giới hạn 3 lượt tạo incident/5 phút để tránh quá tải do báo động giả hoặc tấn công DDoS.
*   **Photon Geocoder**: Khi máy chủ Docker Photon local chưa khởi chạy, hệ thống tự động nhảy sang Komoot Photon public API (`https://photon.komoot.io`) để đảm bảo việc tìm kiếm tên các đỉnh núi, địa danh leo núi không bị gián đoạn.
*   **SMS Auto-Parser vs AI**: Tin nhắn Panic tự động khẩn cấp dùng Regex Parser để trích xuất vị trí lập tức. Tin nhắn mô tả chi tiết tai nạn (custom text không dấu) sử dụng Gemini 1.5 Flash để khôi phục dấu tiếng Việt và phân tích mức độ nguy hiểm.
*   **Chạm Bản Đồ Chớp Nổi HUD**: Sự kiện chạm trực tiếp trên bản đồ mang lại trải nghiệm UX linh hoạt hơn nhiều so với việc bắt buộc phải gõ thanh tìm kiếm khi trekking ngoài thực địa.
*   **Leaflet Icon Fix**: Đã extract thành utility [leafletIcons.js](file:///Users/khoihuynh/Documents/AI_cuu_ho/rescuelink-web/src/utils/leafletIcons.js) — không được duplicate `L.divIcon` definitions nữa.
*   **Routing Bug**: Đã fix `App.jsx` (xóa `index: true` khỏi AppLayout children) và `Login.jsx` (navigate về `/dashboard` thay vì `/`).
*   **Premium UI Redesign (07/07/2026)**:
    *   LandingPage mới: floating glass pill navbar, 3D card tilt (CSS perspective + mousemove), animated counter (useCounter hook easeOutQuart), radial ambient orbs background, Button-in-Button CTA, floating hero shield animate-float.
    *   `index.css` mới: grain overlay (fixed pseudo-element), true glassmorphism, `.card-3d`, gradient border via CSS mask, holographic gradient text `.stat-number-*`, border-severity thicker (4px), nav-active glow.
    *   `tailwind.config.js` mới: navy-tinted surface palette, glow shadows, mesh-gradient backgrounds, spring easing, new keyframes.
    *   `TrailSafety.jsx`: thêm Header, fix layout inside AppLayout, đổi GPX button sang emerald.
    *   `OperatorDashboard.jsx`: thêm Header, LayersControl OSM.
    *   Sidebar: bỏ "TEST MODE" badge.
*   **Tinh giản 2 Actor & Tích hợp Google Maps (09/07/2026)**:
    *   **Loại bỏ Operator (Công ty lữ hành):** Xóa bỏ hoàn toàn vai trò Operator, operator routes và menu liên quan trong Sidebar/App.jsx.
    *   **Cổng Web Portal Một Trang (`UserPortal.jsx`):** Tinh giản thành trang SOS báo nạn 1-chạm gửi định vị GPS từ trình duyệt và form khai báo y tế ngắn đồng bộ hóa tự động lên server.
    *   **Dashboard HQ Sắp xếp theo Độ khẩn cấp AI:** Sự cố tự động sắp xếp theo điểm Severity giảm dần từ 5 xuống 1 nhờ dynamic Severity Scoring Engine.
    *   **Thay thế bằng Google Maps API:** Toàn bộ bản đồ trên web chuyển sang Google Maps tiles. Hệ thống tìm kiếm địa điểm và dịch ngược tọa độ tại backend đã chuyển hẳn sang **Google Places API** và **Google Geocoding API** (xóa bỏ code OSM Nominatim và Docker Photon local).
    *   **Tối ưu Docker:** Xóa bỏ service và volume `photon` trong `docker-compose.yml` để giải phóng tài nguyên CPU/RAM/ổ cứng cho server.

---

## 📋 3. Nhiệm Vụ Tiếp Theo & Ưu Tiên (Next Steps & Priorities)

- `[ ]` Tích hợp Firebase service account key thật để thử nghiệm FCM Notification đầy đủ.
- `[ ]` Đăng ký API Key của Google Gemini (AI Studio miễn phí) điền vào file `.env` ở backend để chạy sản phẩm thật.
- `[x]` Chạy lệnh dọn dẹp xóa thư mục [rescuelink-vqg/](file:///Users/khoihuynh/Documents/AI_cuu_ho/rescuelink-vqg) khi có sự xác nhận của người dùng (Đã thực hiện).
- `[x]` Loại bỏ hoàn toàn vai trò `authority` / VQG và xóa mọi vết tích Viettel AI khỏi hệ thống (Đã thực hiện).
- `[x]` Triển khai mã hóa dữ liệu y khoa (AES-256-CBC) và bảng nhật ký Audit Log bảo mật (Nghị định 13/2023) (Đã thực hiện).
- `[x]` Tinh giản 2 Actor, tích hợp Google Maps API & Google Places, tối ưu hóa dọn dẹp Docker container (Đã thực hiện).
- `[x]` **Tối ưu UI/UX Web Dashboard (11/07/2026)** — Hoàn thành (xem mục 4 bên dưới).

---

## 🎨 5. UI/UX Web Optimization Session (11/07/2026)

Sử dụng **ui-ux-pro-max skill** để audit và tối ưu toàn bộ `rescuelink-web`. Build verification: **PASSED**.

### Thay đổi đã thực hiện

| File | Thay đổi |
|------|----------|
| [App.jsx](file:///Users/khoihuynh/Documents/AI_cuu_ho/rescuelink-web/src/App.jsx) | Xóa `WindyWeather` route/import; Thêm `gcTime: 5min` vào QueryClient; Lazy-load `Dashboard` + `HQAnalytics` với `React.lazy + Suspense` → giảm initial bundle |
| [Sidebar.jsx](file:///Users/khoihuynh/Documents/AI_cuu_ho/rescuelink-web/src/components/layout/Sidebar.jsx) | Xóa 8 icon import thừa (`CloudSun`, `Suitcase`, `Heartbeat`, `House`, `Compass`...); Thay `⚡` emoji bằng `ArrowsLeftRight` SVG icon; Thu gọn Portal Switcher còn 2 link thực sự hữu ích |
| [Dashboard.jsx](file:///Users/khoihuynh/Documents/AI_cuu_ho/rescuelink-web/src/pages/Dashboard.jsx) | Xóa unused imports; Wrap `sortedFeed` trong `useMemo`; **Sửa lỗi:** Import lại `islandIcon` (dùng hiển thị Hoàng Sa / Trường Sa trên map) chống crash trang |
| [Header.jsx](file:///Users/khoihuynh/Documents/AI_cuu_ho/rescuelink-web/src/components/layout/Header.jsx) | Xóa Bell button vô nghĩa (click không làm gì) + xóa `Bell` import |
| [UserList.jsx](file:///Users/khoihuynh/Documents/AI_cuu_ho/rescuelink-web/src/pages/UserList.jsx) | Thêm `useEffect` debounce 400ms; Xóa nút "Tìm" thừa; Thêm `sr-only label` WCAG; Thêm `aria-label` cho table + pagination; Thêm empty state với icon + nút xóa filter |
| [IncidentList.jsx](file:///Users/khoihuynh/Documents/AI_cuu_ho/rescuelink-web/src/pages/IncidentList.jsx) | Thay emoji `📋` bằng `<Printer />` SVG icon; Thêm `aria-label` cho table + pagination; Thêm empty state với icon + nút xóa filter |
| [HQAnalytics.jsx](file:///Users/khoihuynh/Documents/AI_cuu_ho/rescuelink-web/src/pages/HQAnalytics.jsx) | Thay spinner thành skeleton cards (4 stat boxes + 2 chart blocks); Thêm `isUsingFallbackData` flag + badge "Dữ liệu mẫu" khi monthlyMetrics là hardcoded |

### Kết quả Build

```
Dashboard-VnDNxyw0.js   98 kB  (tách riêng, lazy)
HQAnalytics-asUtyhgT.js 394 kB (tách riêng, lazy)
index-CoB_Hem2.js      1041 kB (bundle chính, không chứa Leaflet/Recharts)
✓ built in 1.14s — PASSED
```

---

## 📚 6. Định Hướng Đề Tài & Phạm Vi Nghiên Cứu (Official Thesis Scope)

Tất cả các AI Agent làm việc sau này phải tuân thủ ranh giới định hướng và roadmap đề tài đã được thống nhất:

### 📌 6.1. Chủ đề chính thức (Tên đề tài chốt cuối)
> **"RescueLink — Hệ thống hỗ trợ ra quyết định cứu hộ khẩn cấp chuyên biệt cho hoạt động trekking, ứng dụng AI phân tích tín hiệu SOS đa phương thức và xếp hạng ưu tiên cứu hộ trong điều kiện mất kết nối mạng vùng núi"**

### 📐 6.2. Phạm vi & Ranh giới nghiên cứu (Scope Boundaries)
*   **Trong phạm vi:**
    *   Trekker/người leo núi dã ngoại tham gia cung đường có đăng ký trước.
    *   Khu vực rừng núi hiểm trở có nguy cơ mất sóng viễn thông/sóng data 4G di động.
    *   Các sự cố chuyên biệt: lạc đường, chấn thương thực địa, kiệt sức, thời tiết xấu cực đoan.
*   **Ngoài phạm vi (Bắt buộc loại trừ):**
    *   Không thay thế hệ thống tổng đài khẩn cấp quốc gia (112, 113, 114, 115) ở đô thị.
    *   Không xử lý các tai nạn giao thông đô thị, cháy nhà dân hoặc tình huống khẩn cấp thường nhật.
    *   Không tích hợp các tính năng du lịch/săn mây thương mại đại trà làm loãng giá trị cứu nạn cốt lõi.

### 🗺️ 6.3. Định hướng mở rộng dài hạn (Roadmap)
*   **Mở rộng theo chiều ngang (Cùng bài toán mất kết nối mạng, khác hoạt động):**
    *   *Lặn biển / Đi biển xa bờ:* Đo đạc thêm tín hiệu thủy triều, độ sâu thay vì độ cao vùng núi.
    *   *Phượt xe máy địa hình (Off-road):* Thay đổi bộ chỉ số y tế/tốc độ di chuyển tương ứng tai nạn xe cộ.
    *   *Khám phá hang động (Caving):* Phát huy tối đa mạng lưới Bluetooth BLE mesh khi không có cả sóng GPS.
*   **Mở rộng đối tượng Actor:**
    *   Cung cấp API xuất báo cáo AAR (After-Action Report) và Response Time cho các **Công ty bảo hiểm du lịch mạo hiểm** định giá rủi ro.
    *   Bán/cấp phép bản quyền phần mềm quản lý cho **Ban quản lý các Vườn Quốc Gia** giám sát mật độ du khách trekking.
*   **Mở rộng quy mô (Thiên tai diện rộng):** Ứng dụng lõi AI Severity scoring đa tín hiệu cho công tác cứu nạn lũ lụt, sạt lở đất đá mùa mưa bão tại miền Trung (vùng mất sóng diện rộng cần ưu tiên phân bổ nguồn lực).

---

## 🔒 7. Nhật Ký Kiểm Tra Hệ Thống (Security & Code Audit Log - 13/07/2026)
Tiến hành rà soát kỹ thuật chi tiết toàn bộ các thành phần Backend, Web Dashboard, Mobile App. Kết quả thu được:
*   **Backend**: Khóa y khoa `MEDICAL_SECRET_KEY` được bảo vệ bằng lỗi FATAL STARTUP. Webhook `/inbound` có bảo vệ Twilio signature & rate limit. TTL Index hoạt động đúng trên `syncedAt`. Script di trú dữ liệu chưa phát hiện lịch sử chạy thật trên DB. Google Maps API vẫn đang được sử dụng ở Backend cho Geocoding/Reverse Geocoding. Route `/operators` sau feature flag.
*   **Web Dashboard**: Sử dụng `react-leaflet` với Google Maps tile layer. Cơ chế duyệt sự cố `needsManualReview` hoạt động đúng (chặn điều phối và khóa nút trên UI). Giao diện có 3 trạng thái. Bảng màu đồng nhất.
*   **Mobile App**: Luồng SOS khép kín. Nút khẩn cấp dùng cơ chế Nhấp đúp (Double-Tap) báo hiệu bằng âm thanh/rung/chớp nháy. Xin quyền định vị "Always Allow" (Background). Hiển thị hàng đợi offline đầy đủ.

---

## 🎨 8. UI/UX Mobile Optimization Session (16/07/2026)

Cải thiện chất lượng trải nghiệm người dùng (UX) và bảo mật biểu mẫu phía client trên màn hình di động.

### Thay đổi đã thực hiện

*   **Tạo component SkeletonCard chung ([SkeletonCard.tsx](file:///Users/khoihuynh/Documents/AI_cuu_ho/rescuelink-app/components/SkeletonCard.tsx))**:
    *   Tạo khung hình chữ nhật bo góc với viền mỏng sử dụng màu xám `bg-surface-2` và hiệu ứng nhấp nháy nhẹ bằng `Animated.loop` thuần của React Native.
*   **Cải tiến màn hình Home ([index.tsx](file:///Users/khoihuynh/Documents/AI_cuu_ho/rescuelink-app/app/(tabs)/index.tsx))**:
    *   Thay thế ActivityIndicator lớn toàn màn hình bằng bộ khung Bento cards Skeleton.
    *   Bộ khung mô phỏng trực quan các phần như: Khu vực chào mừng, thông tin thời tiết, hành trình hoạt động và dòng thống kê nhanh.
*   **Cải tiến màn hình Cá nhân ([profile.tsx](file:///Users/khoihuynh/Documents/AI_cuu_ho/rescuelink-app/app/(tabs)/profile.tsx))**:
    *   Thay thế ActivityIndicator lớn toàn màn hình bằng các khung Skeleton tương ứng với hồ sơ thành viên, hồ sơ y khoa, danh sách người thân SOS và chia sẻ hành trình.
    *   **Validate Hồ sơ Y tế**: Giới hạn tối đa 500 ký tự cho các trường text tự do, chặn nhập toàn khoảng trắng, hiển thị bộ đếm độ dài thời gian thực dạng `X/500 ký tự`. Validation nhóm máu theo danh sách enum hợp lệ.
    *   **Validate Liên hệ khẩn cấp**: Thêm regex kiểm tra định dạng số điện thoại Việt Nam bắt đầu bằng `0` hoặc `+84` và có 9-10 số tiếp theo. Thêm validate ký tự & khoảng trắng cho tên người thân và mối quan hệ kèm theo bộ đếm ký tự 500 ký tự.

---

## 🔒 9. Nhật Ký Rà Soát Hệ Thống (18/07/2026)
Rà soát hiện trạng hệ thống, không sửa đổi source code:
*   **Incident Schema & Enum**: Khớp với `['open', 'assigned', 'resolved']`.
*   **Routes & Web Buttons**: Hoạt động đúng theo thiết kế luồng chuyển trạng thái (`open` -> `assigned` -> `resolved`).
*   **Code chết & Trùng lặp**:
    *   Web: 27 file. File `WindyWeather.jsx` trong thư mục `future/` không dùng (code chết đã dọn dẹp).
    *   Backend: 42 file. Model `Operator.js` và route `operators.js` là tàn dư cũ nhưng đã được bảo vệ/ẩn đi.
*   **Kết quả Test**:
    *   Backend: 100% PASS (9 suites, 49 tests).
    *   Web: 100% PASS (4 suites, 12 tests) sau khi sửa đổi Mock Socket (thêm `connect` & `connected` vào `useSocket.test.js`) và chỉnh sửa test query theo nhãn WCAG mới (`Trang sau` thay vì `Sau →` trong `IncidentList.test.jsx`).
*   **Rà Soát Hệ Thống Thiết Kế (18/07/2026)**: Hoàn thành rà soát hệ thống thiết kế hiện tại của `rescuelink-web`. Phát hiện bất nhất về tông màu "an toàn/đã giải quyết" (màu xanh dương trong Tailwind Config nhưng dùng xanh lá emerald trên UI thực tế), và ghi đè nút `.btn-primary` làm lệch shadow đỏ mặc định.

---

## 🎨 10. Đồng bộ hóa Thiết kế & Chuẩn hóa Hệ thống (18/07/2026)

*   **Dọn dẹp skill trùng lặp**: Đã xóa bỏ thư mục `agent/` không chuẩn spec. Chốt thư mục `.agents/skills/` là nơi duy nhất lưu trữ cấu hình skill cho AI agent.
*   **Chốt nguồn sự thật thiết kế**: Bổ sung phần `## ⚠️ QUY TẮC ƯU TIÊN` vào đầu [DESIGN_SYSTEM.md](file:///Users/khoihuynh/Documents/AI_cuu_ho/DESIGN_SYSTEM.md), xác lập file này là Single Source of Truth tối cao cho thiết kế, định hướng theo phong cách **Tactical Telemetry** (nền tối, CRT terminal, không glassmorphism hay gradient text trang trí).
*   **Đổi font chữ**: Thay đổi cấu hình font display và sans từ `Outfit` sang `Inter` trên toàn bộ Web Dashboard, giữ nguyên font `JetBrains Mono` cho các số liệu kỹ thuật.
*   **Dọn dẹp Animation & CSS thừa**: Loại bỏ keyframes/animations chết (`glow-pulse`, `slide-in`, `scan-line`, `spin-slow`) và các class CSS không dùng (`.card-3d`, `.glass`, `.border-gradient-emergency`).
*   **Chuẩn hóa Tông màu An toàn (safe)**: Đổi màu shadow.safe trong config và gradient `.stat-number-green` (nay là `.stat-number-safe`) sang tông màu xanh dương (`sky/safe`) khớp với mã màu `#0ea5e9`. Rà soát và thay đổi toàn bộ class màu xanh lá (`emerald/green`) sử dụng cho trạng thái an toàn/hoàn thành cứu hộ sang tông màu xanh dương trên:
    *   `IncidentCard.jsx`, `IncidentList.jsx`
    *   `HQAnalytics.jsx`, `Dashboard.jsx`, `IncidentDetail.jsx`
    *   `FamilyView.jsx` (trạng thái bình thường đối lập khẩn cấp)
    *   `LandingPage.jsx` (metric và GPS dot demo)
*   **Build & Test**: Đảm bảo tất cả 12 ca kiểm thử phía Web đều PASS (`npm test` OK) và build thành công sản phẩm cho production.
