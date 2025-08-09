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
      "http://localhost:5176",
      "http://localhost:5175", 
      "http://localhost:5174",
      "http://localhost:5173",
      "http://localhost:3000"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
  }
});

// CORS middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - Origin: ${req.headers.origin}`);
  
  // Allow multiple origins for development
  const allowedOrigins = [
    "http://localhost:5176",
    "http://localhost:5175", 
    "http://localhost:5174",
    "http://localhost:5173",
    "http://localhost:3000"
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    res.status(200).end();
    return;
  }
  
  next();
});

app.use(cors({
  origin: [
    "http://localhost:5176",
    "http://localhost:5175", 
    "http://localhost:5174",
    "http://localhost:5173",
    "http://localhost:3000"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Origin", "X-Requested-With", "Accept"]
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/yardsign')
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Join display room when display connects
  socket.on('join-display', (displayId) => {
    socket.join(`display-${displayId}`);
    console.log(`Display ${displayId} joined room`);
  });

  // Handle display pairing
  socket.on('pair-display', (data) => {
    socket.join(`pairing-${data.pairingCode}`);
    console.log(`Display pairing with code: ${data.pairingCode}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Make io available to routes
app.set('io', io);

// Routes
app.use('/auth', authRoutes);
app.use('/menus', menuRoutes);
app.use('/items', itemRoutes);
app.use('/displays', displayRoutes);
app.use('/restaurants', restaurantRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
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
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.IO server ready`);
});

module.exports = { app, io }; 