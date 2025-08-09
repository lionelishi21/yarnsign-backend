const mongoose = require('mongoose');

const displaySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  pairingCode: {
    type: String,
    unique: true,
    sparse: true
  },
  currentMenu: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Menu'
  },
  mediaUrl: {
    type: String
  },
  mediaType: {
    type: String,
    enum: ['image', 'video', null],
    default: null
  }
}, {
  timestamps: true
});

// Generate pairing code before saving
displaySchema.pre('save', function(next) {
  if (!this.pairingCode) {
    this.pairingCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  next();
});

module.exports = mongoose.model('Display', displaySchema); 