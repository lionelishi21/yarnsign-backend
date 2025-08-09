const express = require('express');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const { validateRequest } = require('../middleware/validation');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');

const router = express.Router();

// Validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('restaurantName').notEmpty().trim()
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
];

// Register new user
router.post('/register', registerValidation, validateRequest, async (req, res) => {
  try {
    const { email, password, restaurantName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create restaurant first
    const restaurant = new Restaurant({
      name: restaurantName,
      owner: null // Will be set after user creation
    });
    await restaurant.save();

    // Create user
    const user = new User({
      email,
      password,
      restaurant: restaurant._id
    });
    await user.save();

    // Update restaurant with owner
    restaurant.owner = user._id;
    await restaurant.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        restaurant: {
          id: restaurant._id,
          name: restaurant.name,
          owner: restaurant.owner,
          menus: restaurant.menus || [],
          items: restaurant.items || [],
          displays: restaurant.displays || []
        }
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login user
router.post('/login', loginValidation, validateRequest, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email }).populate('restaurant');
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        restaurant: {
          id: user.restaurant._id,
          name: user.restaurant.name,
          owner: user.restaurant.owner,
          menus: user.restaurant.menus || [],
          items: user.restaurant.items || [],
          displays: user.restaurant.displays || []
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router; 