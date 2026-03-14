const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Socket.IO authentication middleware
const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    // Remove 'Bearer ' if present
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;

    try {
      // Verify token
      const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET);
      
      // Get user from token
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return next(new Error('Authentication error: Invalid token'));
      }

      // Update last seen
      await user.updateLastSeen();
      
      // Attach user to socket
      socket.user = user;
      socket.userId = user._id.toString();
      
      next();
    } catch (error) {
      return next(new Error('Authentication error: Invalid token'));
    }
  } catch (error) {
    return next(new Error('Authentication error: Server error'));
  }
};

module.exports = socketAuth;