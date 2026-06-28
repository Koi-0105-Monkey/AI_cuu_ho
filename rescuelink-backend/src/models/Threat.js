const mongoose = require('mongoose');

const threatSchema = new mongoose.Schema({
  reporterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['GỖ LẬU', 'BẪY THÚ', 'LẤN CHIẾM', 'SĂN BẮT', 'KHÁC'],
    required: true
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
  severity: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
    default: 3
  },
  description: {
    type: String
  },
  status: {
    type: String,
    enum: ['open', 'resolved'],
    default: 'open'
  },
  imageUrl: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

threatSchema.index({ location: '2dsphere' });
threatSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Threat', threatSchema);
