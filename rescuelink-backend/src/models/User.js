const mongoose = require('mongoose');

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
    enum: ['user', 'admin', 'rescuer'],
    default: 'user'
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
