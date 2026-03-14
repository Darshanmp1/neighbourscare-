const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import routes and middleware
const connectDB = require('./config/db');
const setupSocket = require('./socket');
const authRoutes = require('./routes/auth');
const incidentRoutes = require('./routes/incidents');

// Create Express app
const app = express();

// Create HTTP server
const server = http.createServer(app);

// Create Socket.IO server
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Setup Socket.IO with authentication
const socketManager = setupSocket(io);

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));

// Attach socket.io to request object
app.use((req, res, next) => {
  req.io = io;
  req.socketManager = socketManager;
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/incidents', incidentRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`
Server running in ${process.env.NODE_ENV} mode on port ${PORT}
MongoDB connection: ${process.env.MONGODB_URI}
CORS origin: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}
Alert radius: ${process.env.ALERT_RADIUS_METERS || 5000}m
`);
});