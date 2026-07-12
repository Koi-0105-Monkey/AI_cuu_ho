const mongoose = require('mongoose');

const gpsRawSchema = new mongoose.Schema({
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
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  altitude: { type: Number },
  speed: { type: Number },
  heading: { type: Number },
  battery: { type: Number },
  recordedAt: {
    type: Date,
    default: Date.now
  },
  syncedAt: {
    type: Date,
    default: Date.now,
    expires: 21600 // TTL index: 6 hours (21600 seconds)
  }
});

module.exports = mongoose.model('GpsRaw', gpsRawSchema);
