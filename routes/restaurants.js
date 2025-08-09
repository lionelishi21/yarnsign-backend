const express = require('express');
const { body } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');

const router = express.Router();

// Validation rules
const restaurantValidation = [
  body('name').notEmpty().trim()
];

// Get restaurant by ID
router.get('/:restaurantId', authenticateToken, async (req, res) => {
  try {
    const { restaurantId } = req.params;

    // Verify restaurant ownership
    const restaurant = await Restaurant.findById(restaurantId)
      .populate('owner', 'email')
      .populate('menus')
      .populate('items')
      .populate('displays'); // Removed .populate('schedules')

    if (!restaurant || restaurant.owner._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(restaurant);
  } catch (error) {
    console.error('Get restaurant error:', error);
    res.status(500).json({ error: 'Failed to fetch restaurant' });
  }
});

// Get user's restaurant
router.get('/my/restaurant', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('restaurant');
    
    if (!user.restaurant) {
      return res.status(404).json({ error: 'No restaurant found for this user' });
    }

    const restaurant = await Restaurant.findById(user.restaurant._id)
      .populate('menus')
      .populate('items')
      .populate('displays'); // Removed .populate('schedules')

    res.json(restaurant);
  } catch (error) {
    console.error('Get user restaurant error:', error);
    res.status(500).json({ error: 'Failed to fetch restaurant' });
  }
});

// Update restaurant
router.put('/:restaurantId', authenticateToken, restaurantValidation, validateRequest, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { name } = req.body;

    // Verify restaurant ownership
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant || restaurant.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    restaurant.name = name;
    await restaurant.save();

    // Emit socket event
    const io = req.app.get('io');
    io.to(`restaurant-${restaurantId}`).emit('restaurant-updated', { restaurant });

    res.json(restaurant);
  } catch (error) {
    console.error('Update restaurant error:', error);
    res.status(500).json({ error: 'Failed to update restaurant' });
  }
});

// Get restaurant statistics
router.get('/:restaurantId/stats', authenticateToken, async (req, res) => {
  try {
    const { restaurantId } = req.params;

    // Verify restaurant ownership
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant || restaurant.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const stats = {
      totalMenus: restaurant.menus.length,
      totalItems: restaurant.items.length,
      totalDisplays: restaurant.displays.length,
      totalSchedules: restaurant.schedules.length
    };

    res.json(stats);
  } catch (error) {
    console.error('Get restaurant stats error:', error);
    res.status(500).json({ error: 'Failed to fetch restaurant statistics' });
  }
});

module.exports = router; 