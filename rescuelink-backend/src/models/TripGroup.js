const mongoose = require('mongoose');

/**
 * TripGroup Model — Quản lý đoàn trekking (nhiều trekker trong 1 chuyến đi cùng)
 * Dùng bởi Tour Operator để gom nhóm các chuyến đi cá nhân vào 1 đoàn
 */
const tripGroupSchema = new mongoose.Schema({
  // Tên đoàn / tuyến đường
  groupName:   { type: String, required: true, trim: true },
  routeName:   { type: String, required: true },
  description: { type: String },

  // Công ty tour sở hữu đoàn này
  operatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Operator',
    required: true
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
  notes: { type: String },

  createdAt: { type: Date, default: Date.now }
});

tripGroupSchema.index({ operatorId: 1, status: 1 });

module.exports = mongoose.model('TripGroup', tripGroupSchema);
