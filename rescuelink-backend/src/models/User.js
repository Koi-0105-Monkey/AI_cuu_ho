const mongoose = require('mongoose');
const crypto = require('crypto');
const { encrypt, decrypt } = require('../utils/cryptoHelper');

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
    // admin: quản trị viên hệ thống cứu hộ HQ
    // rescuer: nhân viên cứu hộ thực địa
    // guide: hướng dẫn viên dẫn đoàn
    // operator: tài khoản công ty tour / nhóm dẫn đoàn
    enum: ['user', 'admin', 'rescuer', 'guide', 'operator'],
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
  medicalProfile: {
    bloodType: { 
      type: String, 
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'],
      default: 'unknown'
    },
    allergies: { type: String, default: '', get: decrypt, set: encrypt },
    medications: { type: String, default: '', get: decrypt, set: encrypt },
    chronicConditions: { type: String, default: '', get: decrypt, set: encrypt },
    notes: { type: String, default: '', get: decrypt, set: encrypt }
  },
  createdAt: { type: Date, default: Date.now }
}, {
  toJSON: { getters: true },
  toObject: { getters: true }
});

module.exports = mongoose.model('User', userSchema);
