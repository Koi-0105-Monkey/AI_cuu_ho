const mongoose = require('mongoose');

/**
 * TripGroup Model — Quản lý đoàn trekking (nhiều trekker trong 1 chuyến đi cùng)
 * Dùng bởi Tour Operator để gom nhóm các chuyến đi cá nhân vào 1 đoàn
 */

// Thông tin liên hệ và ghép đoàn của từng thành viên
const memberMedicalSchema = new mongoose.Schema({
  userId:               { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  tripId:               { type: mongoose.Schema.Types.ObjectId, ref: 'Trip' },
  emergencyContactPhone:{ type: String, default: '' },      // SĐT người thân khai báo thêm
  joinedAt:             { type: Date, default: Date.now }
}, { _id: false });

const tripGroupSchema = new mongoose.Schema({
  // Tên đoàn / tuyến đường
  groupName:   { type: String, required: true, trim: true },
  routeName:   { type: String, required: true },
  description: { type: String },

  // Công ty tour sở hữu đoàn này
  operatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Operator'
  },

  // Hướng dẫn viên phụ trách (role='guide')
  leaderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Danh sách Trip ID của từng trekker trong đoàn
  memberTripIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip'
  }],

  // Thông tin y tế khai báo khi gia nhập đoàn (lưu riêng để xuất PDF khai báo VQG)
  memberMedicalInfo: [memberMedicalSchema],

  // ─── QR / PIN ghép đoàn ──────────────────────────────────────────────────
  // Mã PIN 6 chữ số sinh tự động (duy nhất), dùng để tham gia đoàn
  joinCode: {
    type: String,
    unique: true,
    sparse: true // cho phép null ở doc cũ
  },

  // URL data:image/png;base64 của QR code (sinh phía backend bằng `qrcode`)
  qrCodeDataUrl: { type: String },

  // ─── Geofence hành lang an toàn ──────────────────────────────────────────
  // Tuyến đường GPX dưới dạng GeoJSON LineString ([lng, lat] pairs)
  geofenceCorridor: {
    type: {
      type: String,
      enum: ['LineString'],
      default: 'LineString'
    },
    coordinates: {
      type: [[Number]], // [[lng1, lat1], [lng2, lat2], ...]
      default: []
    }
  },
  // Bán kính (mét) lệch tuyến tối đa cho phép trước khi cảnh báo
  allowedBufferMeters: { type: Number, default: 200 },

  // Thời gian dự kiến
  plannedStartDate:  { type: Date },
  plannedEndDate:    { type: Date },
  actualStartDate:   { type: Date },
  actualEndDate:     { type: Date },

  // Trạng thái đoàn
  status: {
    type: String,
    enum: ['planned', 'active', 'completed', 'emergency'],
    default: 'planned'
  },

  // Ghi chú / tình huống khẩn cấp của đoàn
  notes: { type: String }
}, { timestamps: true });

tripGroupSchema.index({ operatorId: 1, status: 1 });
tripGroupSchema.index({ joinCode: 1 }); // tra cứu nhanh khi trekker nhập PIN

module.exports = mongoose.model('TripGroup', tripGroupSchema);
