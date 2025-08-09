const express = require('express');
const { body } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const Item = require('../models/Item');
const Restaurant = require('../models/Restaurant');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'item-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Validation rules
const itemValidation = [
  body('name').notEmpty().trim(),
  body('price').isFloat({ min: 0 }),
  body('category').notEmpty().trim()
];

// Create item
router.post('/restaurants/:restaurantId', authenticateToken, itemValidation, validateRequest, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { name, description, price, category, imageUrl, isAvailable = true } = req.body;

    // Verify restaurant ownership
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant || restaurant.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const item = new Item({
      name,
      description,
      price,
      category,
      imageUrl,
      isAvailable,
      restaurant: restaurantId
    });

    await item.save();

    // Add item to restaurant
    restaurant.items.push(item._id);
    await restaurant.save();

    // Emit socket event
    const io = req.app.get('io');
    io.to(`restaurant-${restaurantId}`).emit('item-created', { item });

    res.status(201).json(item);
  } catch (error) {
    console.error('Create item error:', error);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// Get items for restaurant
router.get('/restaurants/:restaurantId', authenticateToken, async (req, res) => {
  try {
    const { restaurantId } = req.params;

    // Verify restaurant ownership
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant || restaurant.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const items = await Item.find({ restaurant: restaurantId }).sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    console.error('Get items error:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// Update item
router.put('/:itemId', authenticateToken, itemValidation, validateRequest, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { name, description, price, category, imageUrl, isAvailable } = req.body;

    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Verify ownership through restaurant
    const restaurant = await Restaurant.findById(item.restaurant);
    if (!restaurant || restaurant.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    Object.assign(item, { name, description, price, category, imageUrl, isAvailable });
    await item.save();

    // Emit socket event
    const io = req.app.get('io');
    io.to(`restaurant-${item.restaurant}`).emit('item-updated', { item });

    res.json(item);
  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// Toggle item availability
router.patch('/:itemId/toggle', authenticateToken, async (req, res) => {
  try {
    const { itemId } = req.params;

    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Verify ownership through restaurant
    const restaurant = await Restaurant.findById(item.restaurant);
    if (!restaurant || restaurant.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    item.isAvailable = !item.isAvailable;
    await item.save();

    // Emit socket event
    const io = req.app.get('io');
    io.to(`restaurant-${item.restaurant}`).emit('item-availability-changed', { 
      itemId: item._id, 
      isAvailable: item.isAvailable 
    });

    res.json(item);
  } catch (error) {
    console.error('Toggle item availability error:', error);
    res.status(500).json({ error: 'Failed to toggle item availability' });
  }
});

// Delete item
router.delete('/:itemId', authenticateToken, async (req, res) => {
  try {
    const { itemId } = req.params;

    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Verify ownership through restaurant
    const restaurant = await Restaurant.findById(item.restaurant);
    if (!restaurant || restaurant.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await Item.findByIdAndDelete(itemId);

    // Remove from restaurant
    restaurant.items = restaurant.items.filter(id => id.toString() !== itemId);
    await restaurant.save();

    // Emit socket event
    const io = req.app.get('io');
    io.to(`restaurant-${item.restaurant}`).emit('item-deleted', { itemId });

    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// Upload image for item
router.post('/:itemId/upload-image', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { itemId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Verify ownership through restaurant
    const restaurant = await Restaurant.findById(item.restaurant);
    if (!restaurant || restaurant.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    item.imageUrl = imageUrl;
    await item.save();

    // Emit socket event
    const io = req.app.get('io');
    io.to(`restaurant-${item.restaurant}`).emit('item-updated', { item });

    res.json({ imageUrl });
  } catch (error) {
    console.error('Upload image error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

module.exports = router; 