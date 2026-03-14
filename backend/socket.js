const socketAuth = require('./middleware/socketAuth');

// Store connected users: { userId: { socketId, location } }
const connectedUsers = new Map();

const setupSocket = (io) => {
  // Use authentication middleware
  io.use(socketAuth);

  io.on('connection', async (socket) => {
    try {
      const userId = socket.userId;
      
      // Store user connection
      connectedUsers.set(userId, {
        socketId: socket.id,
        location: socket.user.location
      });

      console.log(`User ${userId} connected with socket ${socket.id}`);

      // Join private room for user
      socket.join(userId);

      // Handle location updates from volunteers
      if (socket.user.role === 'volunteer') {
        socket.on('volunteer:location', async ({ lat, lng }) => {
          try {
            // Update user location in database
            await socket.user.update({
              location: {
                type: 'Point',
                coordinates: [lng, lat]
              }
            });

            // Update connected users map
            connectedUsers.set(userId, {
              socketId: socket.id,
              location: { type: 'Point', coordinates: [lng, lat] }
            });
          } catch (error) {
            console.error('Error updating volunteer location:', error);
          }
        });
      }

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`User ${userId} disconnected`);
        connectedUsers.delete(userId);
      });

    } catch (error) {
      console.error('Socket connection error:', error);
    }
  });

  return {
    connectedUsers,
    // Helper function to get online volunteers near a location
    getNearbyOnlineVolunteers: (location, radius) => {
      const nearbyUsers = [];
      const radiusInMeters = radius || process.env.ALERT_RADIUS_METERS || 5000;

      connectedUsers.forEach((userData, userId) => {
        if (userData.location && userData.location.coordinates) {
          const distance = calculateDistance(
            location.coordinates[1], // lat
            location.coordinates[0], // lng
            userData.location.coordinates[1],
            userData.location.coordinates[0]
          );

          if (distance <= radiusInMeters) {
            nearbyUsers.push({
              userId,
              socketId: userData.socketId,
              distance
            });
          }
        }
      });

      return nearbyUsers;
    }
  };
};

// Haversine formula to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

module.exports = setupSocket;