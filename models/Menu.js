const mongoose = require('mongoose');

const menuSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  items: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item'
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Menu', menuSchema); 