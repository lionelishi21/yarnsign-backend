const express = require('express');
const { body } = require('express-validator');
const multer = require('multer');
const path = require('path');
const { authenticateToken } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const Display = require('../models/Display');
const Restaurant = require('../models/Restaurant');
const Menu = require('../models/Menu');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: function (req, file, cb) {
    // Allow images and videos
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed!'), false);
    }
  }
});

// Helper function to transform MongoDB document to frontend format
const transformDisplay = (display) => {
  if (!display) return null;
  const doc = display.toObject ? display.toObject() : display;
  
  // Transform currentMenu if it's populated
  let currentMenu = null;
  if (doc.currentMenu) {
    if (typeof doc.currentMenu === 'object' && doc.currentMenu._id) {
      // It's a populated menu object
      currentMenu = {
        id: doc.currentMenu._id,
        name: doc.currentMenu.name,
        description: doc.currentMenu.description,
        items: doc.currentMenu.items || []
      };
    } else {
      // It's just an ObjectId
      currentMenu = doc.currentMenu;
    }
  }
  
  return {
    id: doc._id,
    name: doc.name,
    pairingCode: doc.pairingCode,
    currentMenu: currentMenu,
    mediaUrl: doc.mediaUrl,
    mediaType: doc.mediaType,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt
  };
};

// Validation rules
const displayValidation = [
  body('name').notEmpty().trim(),
  body('currentMenu').optional().isMongoId()
];

// Create display for a restaurant
router.post('/restaurants/:restaurantId', authenticateToken, displayValidation, validateRequest, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { name, currentMenu } = req.body;

    // Verify restaurant ownership
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant || restaurant.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Create display
    const display = new Display({
      name,
      currentMenu
    });
    await display.save();

    // Add display to restaurant
    restaurant.displays.push(display._id);
    await restaurant.save();

    // Emit socket event
    const io = req.app.get('io');
    io.to(`restaurant-${restaurantId}`).emit('display-created', { display: transformDisplay(display) });

    res.status(201).json(transformDisplay(display));
  } catch (error) {
    console.error('Create display error:', error);
    res.status(500).json({ error: 'Failed to create display' });
  }
});

// Get all displays for a restaurant
router.get('/restaurants/:restaurantId', authenticateToken, async (req, res) => {
  try {
    const { restaurantId } = req.params;

    // Verify restaurant ownership
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant || restaurant.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const displays = await Display.find({ _id: { $in: restaurant.displays } }).populate('currentMenu');
    res.json(displays.map(transformDisplay));
  } catch (error) {
    console.error('Get displays error:', error);
    res.status(500).json({ error: 'Failed to fetch displays' });
  }
});

// Update display
router.put('/:displayId', authenticateToken, displayValidation, validateRequest, async (req, res) => {
  try {
    const { displayId } = req.params;
    const { name, currentMenu } = req.body;

    const display = await Display.findById(displayId);
    if (!display) {
      return res.status(404).json({ error: 'Display not found' });
    }

    // Update display
    if (name !== undefined) display.name = name;
    if (currentMenu !== undefined) display.currentMenu = currentMenu;

    await display.save();

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    io.to(`display-${displayId}`).emit('display-updated', { display: transformDisplay(display) });

    res.json(transformDisplay(display));
  } catch (error) {
    console.error('Update display error:', error);
    res.status(500).json({ error: 'Failed to update display' });
  }
});

// Pair display with restaurant using pairing code
router.post('/pair', async (req, res) => {
  try {
    const { pairingCode } = req.body;

    if (!pairingCode) {
      return res.status(400).json({ error: 'Pairing code is required' });
    }

    const display = await Display.findOne({ pairingCode });
    if (!display) {
      return res.status(404).json({ error: 'Invalid pairing code' });
    }

    // Emit socket event for pairing
    const io = req.app.get('io');
    io.to(`pairing-${pairingCode}`).emit('display-paired', { 
      displayId: display._id,
      displayName: display.name 
    });

    res.json({ 
      message: 'Display paired successfully',
      displayId: display._id.toString(),
      displayName: display.name
    });
  } catch (error) {
    console.error('Pair display error:', error);
    res.status(500).json({ error: 'Failed to pair display' });
  }
});

// Get display by pairing code (for display clients)
router.get('/pair/:pairingCode', async (req, res) => {
  try {
    const { pairingCode } = req.params;

    const display = await Display.findOne({ pairingCode }).populate('currentMenu');
    if (!display) {
      return res.status(404).json({ error: 'Invalid pairing code' });
    }

    res.json(transformDisplay(display));
  } catch (error) {
    console.error('Get display by pairing code error:', error);
    res.status(500).json({ error: 'Failed to fetch display' });
  }
});

// Get display by ID (for authenticated users)
router.get('/:displayId', authenticateToken, async (req, res) => {
  try {
    const { displayId } = req.params;

    const display = await Display.findById(displayId).populate('currentMenu');
    if (!display) {
      return res.status(404).json({ error: 'Display not found' });
    }

    res.json(transformDisplay(display));
  } catch (error) {
    console.error('Get display error:', error);
    res.status(500).json({ error: 'Failed to fetch display' });
  }
});

// Assign menu to display
router.patch('/:displayId/assign-menu', authenticateToken, async (req, res) => {
  try {
    const { displayId } = req.params;
    const { menuId } = req.body;

    console.log('Assign menu request:', { displayId, menuId, body: req.body });

    const display = await Display.findById(displayId);
    if (!display) {
      console.log('Display not found:', displayId);
      return res.status(404).json({ error: 'Display not found' });
    }

    console.log('Found display:', display);

    // Verify menu exists
    if (menuId) {
      const menu = await Menu.findById(menuId);
      if (!menu) {
        console.log('Menu not found:', menuId);
        return res.status(404).json({ error: 'Menu not found' });
      }
      console.log('Found menu:', menu.name);
    }

    console.log('Setting currentMenu to:', menuId);
    display.currentMenu = menuId || null;
    await display.save();
    console.log('Display saved with currentMenu:', display.currentMenu);

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    io.to(`display-${displayId}`).emit('menu-assigned', { 
      displayId, 
      menuId 
    });

    // Fetch the display with populated menu for response
    const populatedDisplay = await Display.findById(displayId).populate('currentMenu');
    console.log('Populated display:', populatedDisplay);
    const transformedDisplay = transformDisplay(populatedDisplay);
    console.log('Transformed display:', transformedDisplay);
    res.json(transformedDisplay);
  } catch (error) {
    console.error('Assign menu error:', error);
    res.status(500).json({ error: 'Failed to assign menu' });
  }
});

// Upload media to display
router.post('/:displayId/upload-media', authenticateToken, upload.single('media'), async (req, res) => {
  try {
    const { displayId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('Uploading media for display:', displayId);
    console.log('File info:', req.file);

    const display = await Display.findById(displayId);
    if (!display) {
      return res.status(404).json({ error: 'Display not found' });
    }

    // Determine media type
    const mediaType = req.file.mimetype.startsWith('image/') ? 'image' : 'video';
    const mediaUrl = `/uploads/${req.file.filename}`;

    console.log('Setting mediaUrl:', mediaUrl, 'mediaType:', mediaType);

    // Update display with media
    display.mediaUrl = mediaUrl;
    display.mediaType = mediaType;
    await display.save();

    console.log('Display saved with media:', display.mediaUrl, display.mediaType);

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    io.to(`display-${displayId}`).emit('media-uploaded', { 
      displayId, 
      mediaUrl,
      mediaType 
    });

    const transformedDisplay = transformDisplay(display);
    console.log('Sending transformed display:', transformedDisplay);
    res.json(transformedDisplay);
  } catch (error) {
    console.error('Upload media error:', error);
    res.status(500).json({ error: 'Failed to upload media' });
  }
});

// Remove media from display
router.delete('/:displayId/media', authenticateToken, async (req, res) => {
  try {
    const { displayId } = req.params;

    const display = await Display.findById(displayId);
    if (!display) {
      return res.status(404).json({ error: 'Display not found' });
    }

    // Remove media
    display.mediaUrl = null;
    display.mediaType = null;
    await display.save();

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    io.to(`display-${displayId}`).emit('media-removed', { displayId });

    res.json(transformDisplay(display));
  } catch (error) {
    console.error('Remove media error:', error);
    res.status(500).json({ error: 'Failed to remove media' });
  }
});

// Generate new pairing code for display
router.patch('/:displayId/regenerate-pairing-code', authenticateToken, async (req, res) => {
  try {
    const { displayId } = req.params;

    const display = await Display.findById(displayId);
    if (!display) {
      return res.status(404).json({ error: 'Display not found' });
    }

    // Generate new pairing code
    display.pairingCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    await display.save();

    res.json({ 
      message: 'New pairing code generated',
      pairingCode: display.pairingCode 
    });
  } catch (error) {
    console.error('Regenerate pairing code error:', error);
    res.status(500).json({ error: 'Failed to regenerate pairing code' });
  }
});

// Delete display
router.delete('/:displayId', authenticateToken, async (req, res) => {
  try {
    const { displayId } = req.params;

    const display = await Display.findById(displayId);
    if (!display) {
      return res.status(404).json({ error: 'Display not found' });
    }

    // Remove display from restaurant
    const restaurant = await Restaurant.findOne({ displays: displayId });
    if (restaurant) {
      restaurant.displays = restaurant.displays.filter(id => id.toString() !== displayId);
      await restaurant.save();
    }

    // Delete the display
    await Display.findByIdAndDelete(displayId);

    // Emit socket event
    const io = req.app.get('io');
    io.to(`display-${displayId}`).emit('display-deleted', { displayId });

    res.json({ message: 'Display deleted successfully' });
  } catch (error) {
    console.error('Delete display error:', error);
    res.status(500).json({ error: 'Failed to delete display' });
  }
});

module.exports = router; 