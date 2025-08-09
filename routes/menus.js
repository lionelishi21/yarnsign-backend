const express = require('express');
const { body } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const Menu = require('../models/Menu');
const Restaurant = require('../models/Restaurant');
const Item = require('../models/Item');

const router = express.Router();

// Validation rules
const menuValidation = [
  body('name').notEmpty().trim(),
  body('description').optional().trim(),
  body('items').optional().isArray()
];

// Create menu for a restaurant
router.post('/restaurants/:restaurantId', authenticateToken, menuValidation, validateRequest, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { name, description, items } = req.body;

    // Verify restaurant ownership
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant || restaurant.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Create menu
    const menu = new Menu({
      name,
      description,
      items: items || []
    });
    await menu.save();

    // Add menu to restaurant
    restaurant.menus.push(menu._id);
    await restaurant.save();

    // Emit socket event
    const io = req.app.get('io');
    io.to(`restaurant-${restaurantId}`).emit('menu-created', { menu });

    res.status(201).json(menu);
  } catch (error) {
    console.error('Create menu error:', error);
    res.status(500).json({ error: 'Failed to create menu' });
  }
});

// Get all menus for a restaurant
router.get('/restaurants/:restaurantId', authenticateToken, async (req, res) => {
  try {
    const { restaurantId } = req.params;

    // Verify restaurant ownership
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant || restaurant.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const menus = await Menu.find({ _id: { $in: restaurant.menus } }).populate('items');
    res.json(menus);
  } catch (error) {
    console.error('Get menus error:', error);
    res.status(500).json({ error: 'Failed to fetch menus' });
  }
});

// Get specific menu
router.get('/:menuId', authenticateToken, async (req, res) => {
  try {
    const { menuId } = req.params;
    const menu = await Menu.findById(menuId).populate('items');
    
    if (!menu) {
      return res.status(404).json({ error: 'Menu not found' });
    }

    res.json(menu);
  } catch (error) {
    console.error('Get menu error:', error);
    res.status(500).json({ error: 'Failed to fetch menu' });
  }
});

// Update menu
router.put('/:menuId', authenticateToken, menuValidation, validateRequest, async (req, res) => {
  try {
    const { menuId } = req.params;
    const { name, description, items } = req.body;

    const menu = await Menu.findById(menuId);
    if (!menu) {
      return res.status(404).json({ error: 'Menu not found' });
    }

    // Update menu
    menu.name = name || menu.name;
    menu.description = description !== undefined ? description : menu.description;
    if (items !== undefined) {
      menu.items = items;
    }
    await menu.save();

    // Emit socket event
    const io = req.app.get('io');
    io.to(`menu-${menuId}`).emit('menu-updated', { menu });

    res.json(menu);
  } catch (error) {
    console.error('Update menu error:', error);
    res.status(500).json({ error: 'Failed to update menu' });
  }
});

// Delete menu
router.delete('/:menuId', authenticateToken, async (req, res) => {
  try {
    const { menuId } = req.params;

    const menu = await Menu.findById(menuId);
    if (!menu) {
      return res.status(404).json({ error: 'Menu not found' });
    }

    // Remove menu from restaurant
    const restaurant = await Restaurant.findOne({ menus: menuId });
    if (restaurant) {
      restaurant.menus = restaurant.menus.filter(id => id.toString() !== menuId);
      await restaurant.save();
    }

    await Menu.findByIdAndDelete(menuId);

    // Emit socket event
    const io = req.app.get('io');
    io.to(`menu-${menuId}`).emit('menu-deleted', { menuId });

    res.json({ message: 'Menu deleted successfully' });
  } catch (error) {
    console.error('Delete menu error:', error);
    res.status(500).json({ error: 'Failed to delete menu' });
  }
});

module.exports = router; 