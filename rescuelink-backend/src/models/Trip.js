const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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
  lastSeen: { type: Date, default: Date.now }
});

tripSchema.index({ lastKnownLocation: '2dsphere' });

module.exports = mongoose.model('Trip', tripSchema);
