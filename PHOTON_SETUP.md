# 🗺️ Hướng Dẫn Thiết Lập Server Tìm Kiếm Địa Điểm Photon (Free 100%)

Tài liệu này hướng dẫn bạn dựng một máy chủ tìm kiếm thông minh riêng biệt (Geocoder Server) bằng **Photon** (chạy trên nền Elasticsearch + dữ liệu OpenStreetMap Việt Nam).

---

## 🛠️ Bước 1: Chuẩn bị Thư mục & Docker

Tạo một thư mục chứa dữ liệu Photon trên máy tính của bạn và khởi động container:

1. Mở Terminal trên máy tính.
2. Chạy câu lệnh Docker dưới đây để tải dữ liệu OpenStreetMap của Việt Nam mới nhất, tự động import và chạy dịch vụ tìm kiếm ở cổng **2322**:

```bash
# 1. Tạo thư mục chứa dữ liệu photon
mkdir -p ~/photon_data

# 2. Khởi chạy Docker Photon tự động download dữ liệu Việt Nam và build index
docker run -d \
  --name rescuelink-photon \
  -p 2322:2322 \
  -v ~/photon_data:/photon/photon_data \
  -e PHOTON_LANGS=vi,en \
  -e OSM_EXTRACT_URL=https://download.geofabrik.de/asia/vietnam-latest.osm.pbf \
  komoot/photon:latest
```

*Lưu ý:* Quá trình chạy lần đầu sẽ mất khoảng **10 - 20 phút** tùy thuộc vào tốc độ mạng của bạn để tải file bản đồ Việt Nam (300MB - 3GB sau giải nén) và xây dựng index vào Elasticsearch.

---

## ⚡ Bước 2: Kiểm tra hoạt động của Server

Sau khi Docker khởi chạy xong, bạn mở trình duyệt và truy cập đường link sau để test thử:

👉 **[http://localhost:2322/api?q=Đà+Nẵng&limit=5&lang=vi](http://localhost:2322/api?q=Đà+Nẵng&limit=5&lang=vi)**

Nếu trang trả về một chuỗi JSON chứa các toạ độ địa danh của Việt Nam, chúc mừng bạn đã dựng server tìm kiếm thành công!

---

## 🔌 Bước 3: Cấu hình Backend kết nối với Photon

Sửa file cấu hình `.env` của backend:

```env
# URL máy chủ Photon Geocoder tự dựng
PHOTON_URL=http://localhost:2322
```

Khi có biến `PHOTON_URL`, backend sẽ tự động định tuyến toàn bộ yêu cầu tìm kiếm địa chỉ của Mobile App và Web Dashboard sang máy chủ của riêng bạn, trả về hàng nghìn kết quả gợi ý Việt Nam cực kỳ nhạy bén và hoàn toàn miễn phí.
