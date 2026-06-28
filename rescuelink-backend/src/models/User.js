const mongoose = require('mongoose');
const crypto = require('crypto');

const emergencyContactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  relation: { type: String, required: true }
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  passwordHash: { type: String, required: true },
  emergencyContacts: [emergencyContactSchema],
  role: {
    type: String,
    // user: trekker cá nhân
    // admin: quản trị viên hệ thống
    // rescuer: nhân viên trung tâm cứu hộ
    // guide: hướng dẫn viên của tour operator
    // operator: tài khoản công ty tour
    // authority: tài khoản VQG / SAR
    enum: ['user', 'admin', 'rescuer', 'guide', 'operator', 'authority'],
    default: 'user'
  },
  // ID công ty tour (dành cho role: guide, user thuộc operator)
  operatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Operator',
    default: null
  },
  // FCM Device Token — để gửi push notification
  fcmToken: {
    type: String,
    default: null
  },
  // Token duy nhất để tạo Family View share link
  familyShareToken: {
    type: String,
    unique: true,
    sparse: true, // cho phép null, không bắt unique với null
    default: () => crypto.randomBytes(20).toString('hex')
  },
  isRanger: {
    type: Boolean,
    default: false
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
