const mongoose = require('mongoose');
const crypto = require('crypto');

const tripSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Nhóm đoàn trekking (nếu đi cùng tour operator)
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TripGroup',
    default: null
  },
  routeName: { type: String, required: true },
  status: {
    type: String,
    enum: ['active', 'completed', 'emergency', 'overdue'],
    default: 'active'
  },
  expectedReturn: { type: Date, required: true },
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date },
  lastKnownLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [lng, lat]
      required: true
    }
  },
  lastBattery: { type: Number },
  lastSeen: { type: Date, default: Date.now },

  // Token chia sẻ cho Family View (public, không cần login)
  shareToken: {
    type: String,
    unique: true,
    sparse: true,
    default: () => crypto.randomBytes(16).toString('hex')
  },

  // Cảnh báo thời tiết đã gửi (tránh gửi lặp)
  weatherAlerts: [{
    alertedAt: { type: Date },
    weatherCode: { type: Number },
    description: { type: String }
  }]
});

tripSchema.index({ lastKnownLocation: '2dsphere' });
tripSchema.index({ shareToken: 1 });

module.exports = mongoose.model('Trip', tripSchema);

