const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  menu: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Menu',
    required: true
  },
  display: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Display',
    required: true
  },
  dayOfWeek: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Schedule', scheduleSchema); 