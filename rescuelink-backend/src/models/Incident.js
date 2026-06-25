const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tripId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip'
  },
  type: {
    type: String,
    enum: ['CRASH', 'LOST', 'FIRE', 'MED', 'VEH', 'MANUAL'],
    required: true
  },
  severity: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  status: {
    type: String,
    enum: ['open', 'assigned', 'resolved'],
    default: 'open'
  },
  location: {
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
  message: { type: String },
  imageUrl: { type: String },
  batteryAtTime: { type: Number },
  source: {
    type: String,
    enum: ['app', 'sms', 'auto'],
    default: 'app'
  },
  createdAt: { type: Date, default: Date.now }
});

incidentSchema.index({ location: '2dsphere' });
incidentSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Incident', incidentSchema);
