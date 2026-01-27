import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
  }

  connect() {
    if (this.socket && this.isConnected) return;
    
    try {
      this.socket = io(process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000', {
        transports: ['websocket', 'polling'],
        withCredentials: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      this.socket.on('connect', () => {
        console.log('Socket connected:', this.socket.id);
        this.isConnected = true;
        this.emitConnectionStatus(true);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        this.isConnected = false;
        this.emitConnectionStatus(false);
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        this.isConnected = false;
        this.emitConnectionStatus(false);
      });

      // Register pre-defined event listeners
      this.setupDefaultListeners();
      
    } catch (error) {
      console.error('Failed to initialize socket:', error);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.listeners.clear();
    }
  }

  setupDefaultListeners() {
    // Email events
    this.socket.on('emailSent', (data) => {
      this.emit('emailSent', data);
    });

    this.socket.on('emailScheduled', (data) => {
      this.emit('emailScheduled', data);
    });

    this.socket.on('emailOpened', (data) => {
      this.emit('emailOpened', data);
    });

    this.socket.on('emailClicked', (data) => {
      this.emit('emailClicked', data);
    });

    this.socket.on('emailBounced', (data) => {
      this.emit('emailBounced', data);
    });

    this.socket.on('emailFailed', (data) => {
      this.emit('emailFailed', data);
    });

    // Real-time updates
    this.socket.on('emailStatusUpdate', (data) => {
      this.emit('emailStatusUpdate', data);
    });

    this.socket.on('documentUpdate', (data) => {
      this.emit('documentUpdate', data);
    });

    this.socket.on('clientUpdate', (data) => {
      this.emit('clientUpdate', data);
    });
  }

  emitConnectionStatus(isConnected) {
    this.emit('connectionStatus', { isConnected });
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    
    // Also subscribe to socket if connected
    if (this.socket) {
      this.socket.on(event, callback);
    }
    
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const listeners = this.listeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
    
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  emit(event, data) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in listener for ${event}:`, error);
        }
      });
    }
  }

  emitToServer(event, data) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Socket not connected, cannot emit:', event);
    }
  }

  // Specific emit methods for common actions
  sendEmailTracking(emailId, action, data = {}) {
    this.emitToServer('trackEmail', {
      emailId,
      action,
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  joinEmailRoom(emailId) {
    this.emitToServer('joinEmailRoom', emailId);
  }

  leaveEmailRoom(emailId) {
    this.emitToServer('leaveEmailRoom', emailId);
  }

  // Utility methods
  getConnectionStatus() {
    return this.isConnected;
  }

  getSocketId() {
    return this.socket?.id;
  }

  reconnect() {
    if (this.socket) {
      this.socket.connect();
    }
  }
}

// Create a singleton instance
const socketService = new SocketService();

export { socketService };
export default socketService;