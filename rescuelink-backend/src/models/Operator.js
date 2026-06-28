const mongoose = require('mongoose');

/**
 * Operator Model — Tài khoản công ty tour / đơn vị tổ chức trekking
 */
const operatorSchema = new mongoose.Schema({
  // Thông tin công ty
  companyName: { type: String, required: true, trim: true },
  phone:       { type: String, required: true, unique: true, trim: true },
  email:       { type: String, trim: true, lowercase: true },
  address:     { type: String },
  description: { type: String },

  // Tài khoản admin của operator (ref User với role='operator')
  adminUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },

  // Danh sách hướng dẫn viên thuộc công ty (ref User với role='guide')
  guideIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // Gói dịch vụ
  plan: {
    type: String,
    enum: ['free', 'pro', 'enterprise'],
    default: 'free'
  },

  // Giới hạn theo plan
  maxActiveTrips: { type: Number, default: 10 },  // free: 10, pro: 100, enterprise: unlimited
  maxMembers:     { type: Number, default: 50 },

  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Operator', operatorSchema);
