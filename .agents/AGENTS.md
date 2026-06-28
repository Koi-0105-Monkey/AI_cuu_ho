# RescueLink Agent Instincts & Rules (ECC Harness for Gemini & Claude)

Tài liệu này định nghĩa "bản năng", quy tắc và phương pháp làm việc dành cho toàn bộ các AI Agent (Gemini, Claude Code, Cursor, Codex) khi làm việc trên dự án **RescueLink**. Tất cả các AI Agent phải tuân thủ nghiêm ngặt các quy tắc này.

---

## 1. 🔍 Phương Pháp Phát Triển Ưu Tiên Nghiên Cứu (Research-First)
*   **KHÔNG chỉnh sửa code ngay**: Trước khi thực hiện bất kỳ thay đổi nào liên quan đến logic nghiệp vụ hoặc cấu trúc, Agent phải thực hiện bước nghiên cứu:
    1.  Tìm kiếm các file liên quan bằng công cụ `grep` hoặc đọc file trực tiếp.
    2.  Lên kế hoạch thay đổi cụ thể (`Implementation Plan`), liệt kê rõ file nào cần sửa, dòng nào cần thay thế.
    3.  Chỉ thực thi khi có sự xác nhận rõ ràng của người dùng (User Approval).
*   **Xác minh sau thực thi (Verification)**: Sau khi viết code, Agent phải chạy các lệnh test liên quan (`npm test` ở từng module) để đảm bảo không làm gãy hệ thống cũ.

---

## 2. 🧠 Cơ Chế Bộ Nhớ (Session Memory)
*   Để tránh việc Agent bị "mất ngữ cảnh" sau mỗi phiên làm việc mới:
    *   Agent có nhiệm vụ đọc file [.agents/MEMORY.md](file:///Users/khoihuynh/Documents/AI_cuu_ho/.agents/MEMORY.md) ở đầu mỗi phiên chat.
    *   Cuối mỗi phiên chat, Agent phải tóm tắt lại các việc đã làm, quyết định kỹ thuật đã đưa ra và cập nhật vào file [.agents/MEMORY.md](file:///Users/khoihuynh/Documents/AI_cuu_ho/.agents/MEMORY.md).

---

## 3. 🛡️ An Toàn & Bảo Mật (AgentShield)
*   **Tránh mất dữ liệu**: Agent KHÔNG được chạy bất kỳ lệnh Terminal mang tính phá hủy dữ liệu (như `rm -rf` các folder quan trọng, `git reset --hard` khi chưa commit, hoặc xóa database) mà không có sự đồng ý trực tiếp của người dùng.
*   **Tránh dùng Placeholder**: Tuyệt đối không viết code dạng `// TODO: Implement later` hoặc cắt bớt code cũ. Code sinh ra phải đầy đủ và sẵn sàng chạy (Production-ready).

---

## 4. 🛠️ Quy Tắc Đặc Thù Cho Stack Công Nghệ RescueLink

### 📱 1. Mobile App (`rescuelink-app`)
*   **Framework**: Expo SDK 54, React Native (TypeScript), Nativewind (Tailwind CSS v4).
*   **Background Tasks**: Phải được đăng ký thông qua `expo-task-manager` và `expo-location`. Không cập nhật GPS quá dày khi người dùng đứng yên (phải tự thích ứng để tiết kiệm pin).
*   **Offline Maps**: Các thuật toán tính toán slippy map (`lon2tile`/`lat2tile`) phải được tối ưu toán học, lưu cache các mảnh bản đồ ngoại tuyến vào bộ nhớ thiết bị.
*   **Chỉ dẫn**: Link trực tiếp đến các file code quan trọng khi thảo luận (ví dụ: [incidents.tsx](file:///Users/khoihuynh/Documents/AI_cuu_ho/rescuelink-app/app/(tabs)/incidents.tsx)).

### 🖥️ 2. Web Dashboard (`rescuelink-web`)
*   **Framework**: React 19, Vite, Tailwind CSS v3, React Router v7.
*   **Bản đồ**: Sử dụng Leaflet & React-Leaflet.
*   **Realtime**: Socket.io-client đồng bộ vị trí liên tục. Không thực hiện polling HTTP không cần thiết.

### ⚙️ 3. Backend API Server (`rescuelink-backend`)
*   **Framework**: Node.js (Express 5), MongoDB & Mongoose.
*   **Dịch vụ ngoài**: Sử dụng Twilio cho SMS khẩn cấp. Nội dung tin nhắn SMS SOS bắt buộc phải không dấu, tối ưu trong 1 segment GSM 7-bit (<160 ký tự, khuyến nghị <60 ký tự) để tăng tỷ lệ gửi thành công trong vùng sóng yếu.

---

## 💬 5. Phong Cách Giao Tiếp (Communication Style)
*   **Ngôn ngữ**: Phản hồi bằng tiếng Việt ngắn gọn, súc tích.
*   **Liên kết file**: Luôn tạo liên kết nhấp chuột được (clickable markdown links) dưới dạng `[filename](file:///absolute/path/to/file)` cho bất kỳ file hoặc thư mục nào được nhắc đến.
