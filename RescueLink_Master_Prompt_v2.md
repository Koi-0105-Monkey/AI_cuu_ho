# 🚨 RescueLink — Master Prompt & Dev Handbook v2
> Tổng hợp đầy đủ: ý tưởng, kiến trúc, tech stack, module, task breakdown, AI skills, quy trình code & testing  
> **Cách dùng:** Để file này trong root folder git. Antigravity tự đọc khi làm việc — không cần paste thủ công.

---

## 0. PROJECT CONTEXT — AI ĐỌC FILE NÀY TỰ ĐỘNG

```
Bạn là senior full-stack engineer đang giúp tôi xây dựng ứng dụng cứu hộ khẩn cấp tên RescueLink.

DỰ ÁN GỒM 3 PHẦN:
1. Web Admin Dashboard  → React + Vite + TailwindCSS (nộp môn full-stack)
2. Backend API          → Node.js + Express + MongoDB + Socket.io
3. Mobile App           → React Native + Expo

QUY TẮC BẮT BUỘC:
- Dùng async/await, không dùng callback
- Error handling đầy đủ với try/catch
- Comment code ở logic phức tạp
- Trả về code HOÀN CHỈNH — tuyệt đối không viết "// rest of code" hay "// TODO" hay "..."
- Validate input: Zod (backend), kiểm tra trực tiếp (frontend/mobile)
- Không bao giờ truncate output giữa chừng

INSIGHT CỐT LÕI:
Giá trị lớn nhất KHÔNG phải AI — mà là biết chính xác người ở đâu
và truyền được thông tin đó ra ngoài nhanh nhất, kể cả khi mất Internet.
```

---

## 1. TỔNG QUAN DỰ ÁN

### Mục tiêu
Hệ thống cứu hộ thông minh hoạt động được khi **mất Internet**, hỗ trợ:
- Tai nạn giao thông (tự phát hiện qua accelerometer)
- Lạc đường trong rừng / leo núi
- Cháy rừng, cháy nhà, cháy xe
- Xe hỏng giữa đường, người bị thương nặng

### Câu chuyện thật (anchor story)
Vụ Tam Đảo: Nam sinh trekking 3 đỉnh Tam Đảo, lạc hơn 36 giờ.
Gửi được vị trí cuối cho bạn gái rồi mất liên lạc. Vị trí cuối giúp thu hẹp vùng tìm kiếm.
→ Nếu có RescueLink: GPS track liên tục + auto SOS khi pin yếu = cứu được người.

### Kiến trúc hệ thống
```
[Mobile App - Expo]
    │
    ├── Có Internet ──────→ REST API (Node.js) ──→ MongoDB
    │                              │
    │                         WebSocket ──────────→ Web Dashboard (React)
    │
    ├── Mất 4G, có 2G ───→ SMS GSM (Twilio)
    │                              │
    │                   Parse webhook ──→ tạo Incident ──→ MongoDB
    │
    └── Mất cả sóng ────→ Lưu AsyncStorage queue ──→ retry khi có sóng
```

### Hệ thống liên lạc 4 tầng
| Tầng | Điều kiện | Kênh | Nội dung |
|------|-----------|------|----------|
| 1 | Có Internet | REST API + WebSocket | GPS, ảnh, video, AI analysis |
| 2 | Chỉ có sóng GSM | SMS 160 ký tự | GPS + loại sự cố + thời gian + pin |
| 3 | Mất sóng | AsyncStorage local | Queue, retry khi có sóng lại |
| 4 (V3) | Vùng hẻo lánh | Iridium SBD satellite | Gói tin 340 byte phủ toàn cầu |

---

## 2. TECH STACK ĐẦY ĐỦ

### Backend (Node.js)
```
express             # web framework
mongoose            # MongoDB ODM
socket.io           # WebSocket realtime
jsonwebtoken        # JWT auth
bcryptjs            # hash password
twilio              # SMS gửi/nhận
multer              # upload ảnh
cloudinary          # lưu trữ ảnh
zod                 # validate input
dotenv cors helmet morgan
node-cron           # compress GPS mỗi 2 tiếng
```

### Web Dashboard (React)
```
react + vite
react-router-dom v6
@tanstack/react-query    # data fetching + cache
axios
socket.io-client
leaflet + react-leaflet  # bản đồ + GPS track
recharts                 # biểu đồ thống kê
date-fns
react-hot-toast
@phosphor-icons/react    # icons — KHÔNG dùng lucide-react
tailwindcss
```

### Mobile App (Expo)
```
expo
expo-location            # GPS background tracking
expo-sensors             # accelerometer + gyroscope
expo-battery             # theo dõi pin
expo-notifications       # push notification
expo-camera              # chụp ảnh hiện trường
expo-sms                 # SMS fallback
@react-native-async-storage/async-storage
react-native-maps
@react-navigation/native
axios
socket.io-client
nativewind               # Tailwind CSS cho React Native
```

---

## 3. DATABASE SCHEMA (MongoDB)

```
Viết đầy đủ 5 Mongoose schema sau cho RescueLink (Node.js + Mongoose):

// 1. users
{
  name: String (required),
  phone: String (unique, required),
  passwordHash: String,
  emergencyContacts: [{ name, phone, relation }],
  role: enum ['user', 'admin', 'rescuer'] default 'user',
  createdAt: Date (default now)
}

// 2. trips (hành trình trekking)
{
  userId: ObjectId ref users (required),
  routeName: String,
  status: enum ['active', 'completed', 'emergency', 'overdue'],
  expectedReturn: Date,
  startedAt: Date,
  endedAt: Date,
  lastKnownLocation: GeoJSON Point { coordinates: [lng, lat] },
  lastBattery: Number,
  lastSeen: Date
}
Index: { lastKnownLocation: '2dsphere' }

// 3. incidents
{
  userId: ObjectId ref users (required),
  tripId: ObjectId ref trips,
  type: enum ['CRASH', 'LOST', 'FIRE', 'MED', 'VEH', 'MANUAL'] (required),
  severity: Number 1-5 (required),
  status: enum ['open', 'assigned', 'resolved'] default 'open',
  location: GeoJSON Point,
  message: String,
  imageUrl: String,
  batteryAtTime: Number,
  source: enum ['app', 'sms', 'auto'],
  createdAt: Date (default now)
}
Index: { location: '2dsphere', status: 1, createdAt: -1 }

// 4. gps_raw (buffer tạm — TTL 6 tiếng tự xoá)
{
  userId: ObjectId ref users,
  tripId: ObjectId ref trips,
  lat: Number, lng: Number,
  altitude: Number, speed: Number, heading: Number,
  battery: Number,
  recordedAt: Date   // TTL index: expireAfterSeconds: 21600
}

// 5. gps_segments (compressed LineString, lưu lâu dài)
{
  userId: ObjectId ref users,
  tripId: ObjectId ref trips,
  geometry: GeoJSON LineString { coordinates: [[lng, lat], ...] },
  startTime: Date, endTime: Date,
  distanceMeters: Number, avgSpeedKmh: Number,
  minBattery: Number,
  originalPointCount: Number, compressedPointCount: Number,
  color: String default '#1D9E75'
}
Index: { geometry: '2dsphere', userId: 1, startTime: -1 }
```

---

## 4. BACKEND API — TOÀN BỘ ENDPOINTS

```
Viết Express router cho các endpoints sau (Node.js + Express + Mongoose):

AUTH
POST /api/auth/register  → hash password, tạo user, trả JWT
POST /api/auth/login     → verify password, trả JWT + userInfo

TRIPS
POST   /api/trips/start          → tạo trip mới, status='active'
PATCH  /api/trips/:id/end        → status='completed', set endedAt
PATCH  /api/trips/:id/battery    → update lastBattery + lastKnownLocation
GET    /api/trips/:id/track      → lấy gps_segments + gps_raw gần nhất

GPS
POST /api/gps/batch              → nhận array GPS points từ app, lưu vào gps_raw
                                   body: [{ lat, lng, altitude, speed, heading, battery, recordedAt }]
GET  /api/gps/:tripId/segments   → lấy compressed segments để vẽ bản đồ

INCIDENTS
POST   /api/incidents            → tạo incident từ app
POST   /api/incidents/fire       → tạo incident cháy có ảnh (multipart/form-data)
GET    /api/incidents            → danh sách admin (filter: type, status, dateFrom, dateTo + pagination)
GET    /api/incidents/:id        → chi tiết 1 incident
PATCH  /api/incidents/:id/status → cập nhật status (admin only)

SMS WEBHOOK (Twilio)
POST /api/sms/inbound  → nhận SMS từ Twilio
                         parse format: [SOS:TYPE] GPS:lat,lng LVL:n MSG:...
                         → tạo incident tự động

ADMIN
GET /api/admin/stats             → { todayCount, openCount, resolvedCount, activeUsers }
GET /api/admin/incidents/active  → incidents đang open, sort mới nhất
```

### WebSocket events (socket.io)
```
Server emit → Web Dashboard:
'incident:new'     → khi có incident mới
'incident:updated' → khi status thay đổi
'gps:update'       → { userId, tripId, lat, lng, battery }
'trip:overdue'     → trip quá expectedReturn chưa end

Web Dashboard emit → Server:
'incident:assign'  → { incidentId, rescueTeamId }
'watch:trip'       → { tripId }
```

### SMS Parse Regex
```javascript
const SMS_PATTERN = /\[SOS:(\w+)\]\s*GPS:([\d.]+),([\d.]+)\s*T:([\d: -]+)\s*LVL:(\d)/;
// groups: [type, lat, lng, timestamp, severity]
// Mã loại: ACC=tai nạn, LOST=lạc, FIRE=cháy, MED=y tế, VEH=xe hỏng
```

---

## 5. MOBILE APP — 8 MODULE

### Module 1 — Trekking Mode (MVP)
```
Viết TrekkingSetupScreen cho React Native Expo.
Inputs:
  - Tên cung đường (TextInput)
  - SĐT người thân nhận thông báo (TextInput, type phone)
  - Thời gian dự kiến về (DateTimePicker)

Khi bấm "Bắt đầu":
  - Lưu vào AsyncStorage: { routeName, emergencyContact, expectedReturn }
  - Gọi POST /api/trips/start
  - Start background GPS service (TaskManager)
  - Navigate sang TrackingActiveScreen
```

### Module 2 — GPS Tracking liên tục (MVP — QUAN TRỌNG NHẤT)
```
Viết GPS background tracking cho Expo dùng expo-location + TaskManager.

Tần suất thích nghi:
  - speed > 5 m/s  → ghi mỗi 30 giây
  - speed 0.5–5 m/s → ghi mỗi 60 giây
  - speed < 0.5 m/s → ghi mỗi 5 phút
  - pin < 20%      → chế độ tiết kiệm (mỗi 10 phút)

Mỗi điểm: { lat, lng, altitude, speed, heading, battery, timestamp }
Batch upload: gom 5 phút → POST /api/gps/batch
Offline: lưu AsyncStorage → retry khi có mạng
Pin 20/10/5% → trigger Module 4
```

### Module 3 — Auto Check-in thụ động (MVP)
```
Viết Auto Check-in thụ động cho RescueLink — KHÔNG dùng "bấm nút xác nhận".

Logic:
  - GPS di chuyển (speed > 0.3 m/s) → coi là an toàn, không làm gì
  - GPS dừng > 20 phút bất thường:
    → Notification nhỏ "Bạn có ổn không? (5 phút để phản hồi)"
  - Không phản hồi trong 5 phút:
    → Gửi SMS cho emergency contact
    → PATCH /api/trips/:id/battery { lat, lng, status: 'no_checkin' }
  - Dừng > 60 phút + không phản hồi:
    → POST /api/incidents { type: 'LOST', severity: 2, source: 'auto' }
```

### Module 4 — Low Battery SOS (MVP — DỄ NHẤT, QUAN TRỌNG NHẤT)
```
Viết Low Battery SOS cho Expo dùng expo-battery.

Pin 20%:
  SMS → "PIN YEU 20% - [ten] - GPS:[lat],[lng] - [time]"
  API → PATCH /api/trips/:id/battery { level: 20, lat, lng }

Pin 10%:
  SMS + API với level: 10
  Tăng tần suất GPS lên mỗi 30 giây

Pin 5%:
  SMS khẩn cấp + API với level: 5
  Lưu snapshot GPS track vào AsyncStorage
  Gửi tổng hợp lộ trình compressed ngay lập tức

Dùng expo-battery: getBatteryLevelAsync() + addBatteryLevelListener()
```

### Module 5 — Route Deviation Detection (V2)
```
Viết AI phát hiện lạc đường cho RescueLink.

3 pattern phát hiện:
1. Đi vòng tròn:
   vị trí hiện tại vs 30 phút trước: distance < 200m nhưng totalDistance > 1.5km

2. Lệch cung đường:
   khoảng cách Haversine từ vị trí đến GeoJSON route đã đăng ký > 500m

3. Dừng bất thường:
   GPS dừng > 30 phút + không phải ban đêm + không có accelerometer movement

Khi phát hiện: POST /api/incidents { type, severity, pattern, lat, lng }
```

### Module 6 — Crash Detection (V2)
```
Viết Crash Detection dùng expo-sensors (accelerometer + gyroscope).

Thuật toán (theo Apple Crash Detection iPhone 14+):
  - Sample accelerometer 50Hz
  - magnitude = sqrt(ax² + ay² + az²)
  - magnitude > 3G (29.4 m/s²) trong < 200ms → khả năng va chạm
  - Gyroscope thay đổi góc > 90° sau va chạm → xác nhận

Sau phát hiện:
  - Countdown 30 giây: "Phát hiện va chạm — Bấm CANCEL nếu bạn ổn"
  - Không cancel → POST /api/incidents { type: 'CRASH', severity: 4, impactForce, lat, lng }
  - Gửi SMS khẩn cấp cho emergency contact
```

### Module 7 — Fire Detection (V2)
```
Viết FireDetectionScreen cho Expo dùng expo-camera + Claude Vision API.

Flow:
1. Bấm "Báo cháy" → mở camera
2. Chụp ảnh → convert base64
3. POST /api/incidents/fire { imageBase64, lat, lng }
4. Backend gọi Claude Vision:
   "Trong ảnh có lửa/khói/dấu hiệu cháy không?
    Trả JSON: { hasFire: boolean, confidence: number, description: string }"
5. AI xác nhận → tạo incident severity 4/5
6. Phản hồi user: "Đã xác nhận — Đội cứu hỏa đang được thông báo"
```

### Module 8 — GPS Track Compression (MVP)
```
Implement Ramer-Douglas-Peucker GPS compression (Node.js).

function rdpCompress(points, epsilon = 10):
  // points: [{ lat, lng, recordedAt, battery, speed }]
  // epsilon: ngưỡng mét (10m mặc định)
  // return: mảng points đã lọc bỏ điểm thừa

function haversineDistance(p1, p2): // khoảng cách mét giữa 2 tọa độ

Cron job chạy mỗi 2 tiếng:
  1. Lấy gps_raw > 2 tiếng tuổi, group by { userId, tripId }
  2. Sort theo recordedAt, chạy rdpCompress
  3. Tính totalDistance, avgSpeed, minBattery
  4. Lưu GpsSegment dạng GeoJSON LineString (LƯU Ý: [lng, lat] không phải [lat, lng])
  5. Xoá raw points đã xử lý

Kết quả: nén 70-90% điểm, bản đồ vẫn y hệt.
```

---

## 6. WEB DASHBOARD — 4 MÀN HÌNH MVP

### Màn hình 1 — Dashboard tổng quan
```
Viết DashboardPage.jsx cho web admin RescueLink (React + Vite + TailwindCSS).

Layout:
- 4 stat cards: incidents hôm nay / đang mở / đã xử lý / users active
  Dữ liệu từ GET /api/admin/stats, TanStack Query, refetch mỗi 30 giây
- Feed "Alert mới nhất" cập nhật realtime qua socket.io
  Mỗi item: icon loại sự cố + tên người + GPS + thời gian + badge severity
  Badge: 1-2=xanh, 3=vàng, 4-5=đỏ
- Khi nhận incident:new: thêm vào đầu feed + toast + beep âm thanh
```

### Màn hình 2 — Danh sách Incident
```
Viết IncidentListPage.jsx cho RescueLink.

Table columns: Loại / Tên người / GPS / Thời gian / Pin % / Trạng thái / Actions
Filter: type (dropdown), status (dropdown), dateFrom-dateTo (DatePicker)
Pagination: server-side, 20 items/trang
Sort: mới nhất mặc định
Click row → navigate('/incidents/:id')
```

### Màn hình 3 — Chi tiết Incident + GPS Track
```
Viết IncidentDetailPage.jsx dùng react-leaflet.

Layout 2 cột:
Cột trái:
  - Thông tin: loại, severity, user, thời gian, pin, message, nguồn
  - Timeline: GPS updates + check-ins + SOS events theo giờ
  - Actions: đổi status + nút "Gọi ngay" (tel: link)

Cột phải (Leaflet map):
  - Vẽ GPS track: L.polyline từ gps_segments GeoJSON, màu '#1D9E75', weight 4
  - Marker đỏ tại vị trí incident
  - Popup: lat/lng + thời gian + pin
  - Auto fitBounds() để thấy toàn bộ track
```

### Màn hình 4 — Quản lý User
```
Viết UserListPage.jsx cho RescueLink.

Table: Tên / SĐT / Ngày đăng ký / Số incident / Status hành trình gần nhất
Click row → Drawer bên phải:
  - Thông tin cá nhân + emergency contacts
  - 5 incident gần nhất
  - Link xem hành trình đầy đủ
```

---

## 7. AI SKILLS ĐÃ CÀI (Antigravity tự load)

### Skills cài 1 lần, tự động hoạt động:

```bash
# Chống UI generic cho web dashboard
npx skills add https://github.com/Leonxlnx/taste-skill

# Expo chuẩn cho mobile app (official từ Expo)
npx skills@latest add expo/skills --skill '*'

# React Native performance + testing (từ Callstack)
npx skills@latest add github:callstackincubator/agent-skills
```

### taste-skill — dùng cho Web Dashboard
Tự áp dụng khi làm UI web. Các rule quan trọng nhất:
- Font: Geist, Outfit, Cabinet Grotesk — KHÔNG dùng Inter/Roboto
- Icon: `@phosphor-icons/react` — KHÔNG dùng lucide-react
- KHÔNG dùng "purple/blue AI gradient" — dùng neutral base + accent đỏ khẩn cấp
- Shadow: tinted theo màu nền, KHÔNG dùng pure black opacity
- Mọi interactive element phải có `cursor-pointer`
- Contrast tối thiểu WCAG AA 4.5:1
- Khi redesign UI có sẵn: dùng `redesign-skill`
- Khi AI hay truncate: dùng `output-skill`

**Lưu ý:** taste-skill chỉ cho web — KHÔNG áp dụng React Native.
Cho mobile, dùng `expo/skills` + Apple HIG cho iOS, Material 3 cho Android.

### expo/skills — dùng cho Mobile App
Rules quan trọng từ Expo official skills:
- File names: `kebab-case` (ví dụ: `tracking-active.tsx`)
- Routes trong `app/`, KHÔNG để components ở đó
- KHÔNG import `SafeAreaView` từ react-native → dùng `expo-safe-area-context`
- Shadow: dùng CSS `boxShadow` prop, KHÔNG dùng `elevation`
- Navigation: `<Link href="/path" />` từ expo-router
- Luôn account for safe area insets (top + bottom)

---

## 8. QUY TRÌNH BUILD (WORKFLOW)

### Thứ tự làm việc với Antigravity

```
Chỉ cần mô tả task, Antigravity đọc file này + skills đã cài → tự biết context.
Không cần paste lại spec mỗi lần.

Ví dụ:
"Viết GPS batch endpoint" → Antigravity đọc Section 4 → output đúng schema
"Viết DashboardPage"     → Antigravity đọc Section 6 + taste-skill → UI không generic
"Viết Low Battery SOS"   → Antigravity đọc Module 4 + expo/skills → code đúng chuẩn Expo
```

### Thứ tự build theo tuần

```
Week 1 — Backend foundation:
  □ Setup Express + MongoDB connection
  □ Viết 5 Mongoose models (Section 3)
  □ Auth routes (register/login + JWT)
  □ GPS batch endpoint
  □ Incident CRUD

Week 2 — Realtime + SMS:
  □ Setup socket.io + emit events
  □ Twilio webhook nhận SMS → parse → tạo incident
  □ Twilio gửi SMS cho emergency contact
  □ Cron job GPS compression (RDP algorithm — Module 8)

Week 3 — Web Dashboard:
  □ Setup React + Vite + Tailwind + Router
  □ taste-skill đã cài → AI tự áp dụng khi viết UI
  □ Dashboard page (stats + realtime feed)
  □ Incident list (table + filter)
  □ Incident detail (leaflet map + GPS track)

Week 4 — Polish + Deploy:
  □ User management page
  □ Auth flow (login + protected routes)
  □ Deploy backend: Railway / Render
  □ Deploy frontend: Vercel
  □ Viết báo cáo môn

Tháng 2-3 — Mobile App:
  □ expo/skills + callstack/agent-skills đã cài
  □ Module 4 trước (Low Battery SOS — dễ nhất, quan trọng nhất)
  □ Module 2 (GPS tracking background)
  □ Module 3 (Auto check-in thụ động)
  □ Module 1 (Trekking setup screen)
  □ SMS fallback offline + AsyncStorage queue
```

### Git workflow
```bash
main          # production, chỉ merge khi tested
├── dev       # integration branch
    ├── feat/backend-auth
    ├── feat/gps-tracking
    ├── feat/web-dashboard
    └── feat/app-trekking-mode
```

### .gitignore — KHÔNG ignore skills folder
```gitignore
# Skills folder: COMMIT — để Antigravity trên máy khác cũng có sẵn
# .skills/   ← KHÔNG thêm dòng này

# Ignore những thứ này:
node_modules/
.env
.env.local
dist/
build/
*.log
```

---

## 9. TESTING

### Backend (Jest + Supertest)
```
Viết test suite cho RescueLink backend.
npm install -D jest supertest mongodb-memory-server

Tests:
1. POST /api/auth/register → tạo user thành công, reject duplicate phone
2. POST /api/auth/login → trả JWT đúng, 401 khi sai password
3. POST /api/gps/batch → lưu points, reject invalid coordinates
4. POST /api/incidents → tạo incident, emit socket event
5. POST /api/sms/inbound → parse SMS đúng format, reject sai format
6. rdpCompress(): 100 điểm thẳng → chỉ còn 2 điểm

Dùng mongodb-memory-server — không cần MongoDB thật khi test.
```

### Web (Vitest + React Testing Library)
```
Viết tests cho web dashboard RescueLink.
npm install -D vitest @testing-library/react @testing-library/user-event jsdom

Tests:
1. IncidentCard: render đúng badge màu theo severity
2. DashboardPage: stat cards hiển thị, nhận socket event incident:new
3. IncidentListPage: filter theo type, pagination hoạt động
4. useSocket hook: kết nối, nhận events, cleanup khi unmount
```

### E2E Web (Playwright)
```
Viết Playwright E2E tests.
npm install -D @playwright/test && npx playwright install

Test flows:
1. Login → redirect dashboard
2. Incident list → filter → click → xem detail
3. Incident detail → map hiển thị → GPS track vẽ đúng → đổi status
```

### Mobile (Jest + React Native Testing Library)
```
Viết unit tests cho Expo app (jest-expo preset).

Tests:
1. rdpCompress() với edge cases (đường thẳng, đường cong, 0 điểm)
2. SMS format builder: lat/lng → output đúng 160 ký tự, không dấu
3. Battery SOS: mock expo-battery, verify trigger ở 20/10/5%
4. AsyncStorage queue: enqueue khi offline, flush khi có mạng
```

---

## 10. DEPLOY

### Backend (Railway)
```bash
# railway.json
{ "build": { "builder": "NIXPACKS" }, "deploy": { "startCommand": "node src/app.js" } }

# Env vars:
MONGODB_URI, JWT_SECRET, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
TWILIO_PHONE_NUMBER, CLOUDINARY_URL, PORT=5000, NODE_ENV=production
```

### Web Dashboard (Vercel)
```bash
# vercel.json
{ "buildCommand": "npm run build", "outputDirectory": "dist" }

# Env vars:
VITE_API_URL=https://your-app.railway.app
VITE_SOCKET_URL=https://your-app.railway.app
```

### Mobile App (Expo EAS)
```bash
npm install -g eas-cli && eas login && eas build:configure
eas build --platform android --profile development
```

---

## 11. CẤU TRÚC THƯ MỤC

```
rescuelink/
├── rescuelink-backend/
│   └── src/
│       ├── models/        # User, Trip, Incident, GpsRaw, GpsSegment
│       ├── routes/        # auth, trips, gps, incidents, sms, admin
│       ├── services/      # socketService, smsService, compressionService
│       ├── jobs/          # compressGps.js (cron mỗi 2 tiếng)
│       └── app.js
│
├── rescuelink-web/
│   └── src/
│       ├── pages/         # Dashboard, IncidentList, IncidentDetail, UserList
│       ├── components/    # layout/, incidents/, map/, dashboard/
│       ├── hooks/         # useSocket, useIncidents, useAuth
│       └── services/      # api.js (axios instance)
│
├── rescuelink-app/
│   └── app/               # Expo Router routes (kebab-case)
│       ├── (tabs)/
│       ├── trekking-setup.tsx
│       └── tracking-active.tsx
│
├── .skills/               # Taste-skill + Expo skills (COMMIT, không ignore)
└── RescueLink_Master_Prompt_v2.md  ← file này
```

---

## 12. ĐIỂM KHÁC BIỆT SO VỚI ĐỐI THỦ

| App | Điểm yếu | RescueLink hơn |
|-----|----------|----------------|
| Zalo / Messenger | Cần Internet 100% | Hoạt động mất mạng qua SMS |
| Google Find My | Không có alert tự động | Gửi tổng đài + người thân tự động |
| Garmin inReach | Phần cứng $500 | Chỉ cần smartphone |
| Gọi 113 | Không biết GPS track lịch sử | Toàn bộ lộ trình, không chỉ điểm cuối |

**4 điểm độc đáo:**
1. GPS track compression + vẽ đường màu → cứu hộ biết chính xác hướng đã đi
2. Multi-channel fallback → không bao giờ mất liên lạc hoàn toàn
3. Low Battery SOS tự động → cứu được người kể cả khi họ bất tỉnh
4. Web dashboard realtime → tổng đài thấy tất cả incidents trên bản đồ ngay lập tức

---

*RescueLink Master Prompt v2 — Antigravity edition*  
*Cập nhật: 2026-06-25*
