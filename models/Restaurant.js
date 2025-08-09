const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  menus: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Menu'
  }],
  items: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item'
  }],
  displays: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Display'
  }],
  schedules: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Schedule'
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Restaurant', restaurantSchema); 