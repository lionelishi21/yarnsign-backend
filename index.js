const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

// Load environment variables
dotenv.config();

// Import models
require('./models/User');
require('./models/Restaurant');
require('./models/Menu');
require('./models/Item');
require('./models/Display');
require('./models/Schedule');

// Import routes
const authRoutes = require('./routes/auth');
const menuRoutes = require('./routes/menus');
const itemRoutes = require('./routes/items');
const displayRoutes = require('./routes/displays');
const restaurantRoutes = require('./routes/restaurants');

// Import middleware
const { authenticateToken } = require('./middleware/auth');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://yaadsign.com",
      "http://localhost:3000", // Add common dev ports
      "http://localhost:3001",
      "https://yaadsign.com",
      "http://yaadsign.com"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true
  }
});

// Enhanced CORS with debugging
app.use(cors({
  origin: function(origin, callback) {
    console.log('🌐 CORS Origin:', origin);
    callback(null, true); // allow all origins dynamically
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Origin", "X-Requested-With", "Accept"]
}));

// Add request logging middleware for debugging
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path}`);
  console.log('Headers:', {
    authorization: req.headers.authorization ? '***TOKEN_PRESENT***' : 'NO_TOKEN',
    'content-type': req.headers['content-type'],
    origin: req.headers.origin
  });
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/yardsign')
  .then(() => {
    console.log('✅ Connected to MongoDB');
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error);
  });

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  // Join display room when display connects
  socket.on('join-display', (displayId) => {
    socket.join(`display-${displayId}`);
    console.log(`📺 Display ${displayId} joined room`);
  });

  // Handle display pairing
  socket.on('pair-display', (data) => {
    socket.join(`pairing-${data.pairingCode}`);
    console.log(`🔗 Display pairing with code: ${data.pairingCode}`);
  });

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// Make io available to routes
app.set('io', io);

// Add a test auth endpoint for debugging
app.get('/auth/test', authenticateToken, (req, res) => {
  res.json({ 
    message: 'Auth working!', 
    user: req.user,
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/auth', authRoutes); // 🔓 Auth routes are PUBLIC (login/register don't need tokens)
app.use('/menus', authenticateToken, menuRoutes); // 🔒 Protected routes need tokens
app.use('/items', authenticateToken, itemRoutes);
app.use('/displays', authenticateToken, displayRoutes);
app.use('/restaurants', authenticateToken, restaurantRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  console.error('💥 Error:', err.stack);
  
  // Handle JWT errors specifically
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ 
      error: 'Invalid token',
      message: 'The provided token is invalid'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ 
      error: 'Token expired',
      message: 'The provided token has expired'
    });
  }

  res.status(err.status || 500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 Socket.IO server ready`);
  console.log(`🔑 JWT Secret: ${process.env.JWT_SECRET ? 'SET' : 'NOT SET'}`);
});

module.exports = { app, io };