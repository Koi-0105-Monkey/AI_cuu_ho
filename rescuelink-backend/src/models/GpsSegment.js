const mongoose = require('mongoose');

const gpsSegmentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tripId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip',
    required: true
  },
  geometry: {
    type: {
      type: String,
      enum: ['LineString'],
      default: 'LineString'
    },
    coordinates: {
      type: [[Number]], // Array of [lng, lat]
      required: true
    }
  },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  distanceMeters: { type: Number },
  avgSpeedKmh: { type: Number },
  minBattery: { type: Number },
  originalPointCount: { type: Number },
  compressedPointCount: { type: Number },
  color: { type: String, default: '#1D9E75' }
});

gpsSegmentSchema.index({ geometry: '2dsphere' });
gpsSegmentSchema.index({ userId: 1, startTime: -1 });

module.exports = mongoose.model('GpsSegment', gpsSegmentSchema);
