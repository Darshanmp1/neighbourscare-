import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
  }

  connect(token) {
    if (this.socket) {
      this.disconnect();
    }

    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

    this.socket = io(SOCKET_URL, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      console.log('Connected to socket server');
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      console.log('Disconnected from socket server');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      toast.error('Connection error. Please refresh the page.');
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Volunteer location updates
  updateVolunteerLocation(location) {
    if (this.socket && this.isConnected) {
      this.socket.emit('volunteer:location', location);
    }
  }

  // Listen for new incidents
  onNewIncident(callback) {
    if (this.socket) {
      this.socket.on('incident:new', callback);
    }
  }

  // Listen for incident status updates
  onIncidentStatusUpdate(callback) {
    if (this.socket) {
      this.socket.on('incident:statusUpdate', callback);
    }
  }

  // Listen for volunteer updates
  onVolunteerUpdate(callback) {
    if (this.socket) {
      this.socket.on('volunteer:update', callback);
    }
  }

  // Remove event listeners
  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  // Join rooms (for specific incident notifications)
  joinRoom(room) {
    if (this.socket && this.isConnected) {
      this.socket.emit('join:room', room);
    }
  }

  leaveRoom(room) {
    if (this.socket && this.isConnected) {
      this.socket.emit('leave:room', room);
    }
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;