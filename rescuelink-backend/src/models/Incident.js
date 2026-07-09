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
  audioUrl: { type: String },
  voiceTranscript: { type: String },
  extractedEntities: {
    victimName: { type: String },
    location: { type: String },
    incidentType: { type: String },
    severity: { type: Number }
  },
  assignedRescuerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  assignedAt: { type: Date },
  resolvedAt: { type: Date },
  etaMinutes: { type: Number },
  dispatchNotes: { type: String, default: '' },
  afterActionReport: {
    summary: { type: String, default: '' },
    teamNotes: { type: String, default: '' },
    responseTimeMinutes: { type: Number },
    resolutionTimeMinutes: { type: Number }
  },
  severityBreakdown: {
    baseScore: { type: Number },
    medicalAdjustment: { type: Number },
    batteryAdjustment: { type: Number },
    weatherAdjustment: { type: Number },
    timeAdjustment: { type: Number },
    finalScore: { type: Number },
    reasons: [{ type: String }]
  },
  createdAt: { type: Date, default: Date.now }
});

incidentSchema.index({ location: '2dsphere' });
incidentSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Incident', incidentSchema);
