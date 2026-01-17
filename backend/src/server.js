require('dotenv').config();
const express = require('express');
const http = require('http');
const helmet = require('helmet');
const cors = require('cors');
const logger = require('./utils/logger');
const { pool } = require('./config/database');
const { client: redisClient } = require('./config/redis');

// Import routes
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const politiciansRoutes = require('./routes/politicians');
const transactionsRoutes = require('./routes/transactions');
const assetsRoutes = require('./routes/assets');
const alertsRoutes = require('./routes/alerts');
const analyticsRoutes = require('./routes/analytics');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Port configuration
const PORT = process.env.PORT || 3000;
const API_VERSION = process.env.API_VERSION || 'v1';

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3001', 'http://localhost:19006'],
  credentials: process.env.CORS_CREDENTIALS === 'true' || true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.http(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`, {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
  });
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await pool.query('SELECT 1');

    // Check Redis connection
    await redisClient.ping();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        redis: 'connected'
      }
    });
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// API routes
app.use(`/api/${API_VERSION}/auth`, authRoutes);
app.use(`/api/${API_VERSION}/users`, usersRoutes);
app.use(`/api/${API_VERSION}/politicians`, politiciansRoutes);
app.use(`/api/${API_VERSION}/transactions`, transactionsRoutes);
app.use(`/api/${API_VERSION}/assets`, assetsRoutes);
app.use(`/api/${API_VERSION}/alerts`, alertsRoutes);
app.use(`/api/${API_VERSION}/analytics`, analyticsRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Congressional Trading Tracker API',
    version: API_VERSION,
    status: 'running',
    endpoints: {
      health: '/health',
      auth: `/api/${API_VERSION}/auth`,
      users: `/api/${API_VERSION}/users`,
      politicians: `/api/${API_VERSION}/politicians`,
      transactions: `/api/${API_VERSION}/transactions`,
      assets: `/api/${API_VERSION}/assets`,
      alerts: `/api/${API_VERSION}/alerts`,
      analytics: `/api/${API_VERSION}/analytics`
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  // Don't leak error details in production
  const errorMessage = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;

  res.status(err.status || 500).json({
    success: false,
    error: errorMessage
  });
});

// Initialize WebSocket server (imported separately to avoid circular deps)
let io;
try {
  const initWebSocket = require('./services/websocket');
  io = initWebSocket(server);
  logger.info('WebSocket server initialized');
} catch (error) {
  logger.warn('WebSocket initialization skipped', { error: error.message });
}

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    logger.info('Database connection established');

    // Test Redis connection
    await redisClient.ping();
    logger.info('Redis connection established');

    // Start HTTP server
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`, {
        environment: process.env.NODE_ENV,
        port: PORT,
        apiVersion: API_VERSION
      });
    });
  } catch (error) {
    logger.error('Failed to start server', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down gracefully...');

  server.close(async () => {
    try {
      await pool.end();
      await redisClient.quit();
      logger.info('Server shut down successfully');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', { error: error.message });
      process.exit(1);
    }
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', {
    error: error.message,
    stack: error.stack
  });
  shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', {
    reason,
    promise
  });
});

// Start the server
startServer();

// Export for testing
module.exports = { app, server };
