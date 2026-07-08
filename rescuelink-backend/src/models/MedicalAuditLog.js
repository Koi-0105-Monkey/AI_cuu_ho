const mongoose = require('mongoose');

const medicalAuditLogSchema = new mongoose.Schema({
  viewerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  targetUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  incidentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Incident',
    default: null
  },
  action: {
    type: String,
    enum: ['view', 'update'],
    default: 'view'
  },
  accessedAt: {
    type: Date,
    default: Date.now
  }
});

// Thêm index để truy vấn nhật ký nhanh
medicalAuditLogSchema.index({ accessedAt: -1 });
medicalAuditLogSchema.index({ viewerId: 1 });
medicalAuditLogSchema.index({ targetUserId: 1 });

module.exports = mongoose.model('MedicalAuditLog', medicalAuditLogSchema);
