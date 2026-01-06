import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3000';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect(token = null) {
    if (this.socket?.connected) {
      return;
    }

    const options = {
      transports: ['websocket', 'polling'],
    };

    if (token) {
      options.auth = { token };
    }

    this.socket = io(SOCKET_URL, options);

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    // Handle new transactions
    this.socket.on('new_transaction', (transaction) => {
      this.notifyListeners('transaction', transaction);
    });

    // Handle scraper status updates
    this.socket.on('scraper_status', (status) => {
      this.notifyListeners('scraper_status', status);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  subscribe(channel) {
    if (this.socket?.connected) {
      this.socket.emit('subscribe', channel);
    }
  }

  unsubscribe(channel) {
    if (this.socket?.connected) {
      this.socket.emit('unsubscribe', channel);
    }
  }

  // Event listener management
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  notifyListeners(event, data) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(callback => callback(data));
  }

  isConnected() {
    return this.socket?.connected || false;
  }
}

// Export singleton instance
export default new WebSocketService();
