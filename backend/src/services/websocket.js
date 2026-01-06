const { Server } = require('socket.io');
const logger = require('../utils/logger');
const { authenticate } = require('../middleware/auth');

/**
 * Initialize WebSocket server for real-time updates
 * @param {Object} httpServer - HTTP server instance
 * @returns {Object} Socket.IO instance
 */
const initWebSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.WS_CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:19006'],
      credentials: true,
      methods: ['GET', 'POST']
    },
    path: '/socket.io/',
    transports: ['websocket', 'polling']
  });

  // Connection counter
  let connectedClients = 0;

  // Middleware to authenticate socket connections (optional)
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (token) {
        // Verify token if provided
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id;
        socket.authenticated = true;
        logger.debug('Authenticated WebSocket connection', { userId: decoded.id });
      } else {
        // Allow unauthenticated connections
        socket.authenticated = false;
      }

      next();
    } catch (error) {
      // Allow connection even if auth fails
      socket.authenticated = false;
      next();
    }
  });

  // Handle connections
  io.on('connection', (socket) => {
    connectedClients++;
    logger.info('WebSocket client connected', {
      socketId: socket.id,
      authenticated: socket.authenticated,
      userId: socket.userId,
      totalClients: connectedClients
    });

    // Handle subscription to channels
    socket.on('subscribe', (channel) => {
      try {
        // Validate channel format
        const validChannels = ['all', 'politician:', 'ticker:', 'sector:', 'party:'];
        const isValid = validChannels.some(prefix =>
          channel === prefix.slice(0, -1) || channel.startsWith(prefix)
        );

        if (!isValid) {
          socket.emit('error', { message: 'Invalid channel' });
          return;
        }

        socket.join(channel);
        logger.debug('Client subscribed to channel', {
          socketId: socket.id,
          channel
        });

        socket.emit('subscribed', { channel });
      } catch (error) {
        logger.error('Subscription error', {
          error: error.message,
          socketId: socket.id,
          channel
        });
        socket.emit('error', { message: 'Subscription failed' });
      }
    });

    // Handle unsubscribe
    socket.on('unsubscribe', (channel) => {
      try {
        socket.leave(channel);
        logger.debug('Client unsubscribed from channel', {
          socketId: socket.id,
          channel
        });

        socket.emit('unsubscribed', { channel });
      } catch (error) {
        logger.error('Unsubscribe error', {
          error: error.message,
          socketId: socket.id,
          channel
        });
      }
    });

    // Handle ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong');
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      connectedClients--;
      logger.info('WebSocket client disconnected', {
        socketId: socket.id,
        reason,
        totalClients: connectedClients
      });
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error('WebSocket error', {
        socketId: socket.id,
        error: error.message
      });
    });
  });

  // Function to broadcast new transaction
  const broadcastTransaction = (transaction) => {
    try {
      // Broadcast to 'all' channel
      io.to('all').emit('new_transaction', transaction);

      // Broadcast to politician-specific channel
      if (transaction.politician_id) {
        io.to(`politician:${transaction.politician_id}`).emit('new_transaction', transaction);
      }

      // Broadcast to ticker-specific channel
      if (transaction.ticker) {
        io.to(`ticker:${transaction.ticker}`).emit('new_transaction', transaction);
      }

      // Broadcast to sector channel
      if (transaction.sector) {
        io.to(`sector:${transaction.sector}`).emit('new_transaction', transaction);
      }

      // Broadcast to party channel
      if (transaction.party) {
        io.to(`party:${transaction.party}`).emit('new_transaction', transaction);
      }

      logger.debug('Transaction broadcasted', {
        transactionId: transaction.id,
        channels: ['all', `politician:${transaction.politician_id}`, `ticker:${transaction.ticker}`]
      });
    } catch (error) {
      logger.error('Broadcast error', {
        error: error.message,
        transactionId: transaction?.id
      });
    }
  };

  // Function to broadcast scraper status updates
  const broadcastScraperStatus = (status) => {
    try {
      io.to('all').emit('scraper_status', status);
      logger.debug('Scraper status broadcasted', { status });
    } catch (error) {
      logger.error('Scraper status broadcast error', { error: error.message });
    }
  };

  // Function to get connection stats
  const getStats = () => {
    return {
      connectedClients,
      rooms: Array.from(io.sockets.adapter.rooms.keys())
    };
  };

  // Attach broadcast functions to io instance
  io.broadcastTransaction = broadcastTransaction;
  io.broadcastScraperStatus = broadcastScraperStatus;
  io.getStats = getStats;

  return io;
};

module.exports = initWebSocket;
