const redis = require('redis');
const logger = require('../utils/logger');

// Redis client configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB) || 0,
  retry_strategy: (options) => {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      logger.error('Redis connection refused');
      return new Error('Redis server connection refused');
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      logger.error('Redis retry time exhausted');
      return new Error('Redis retry time exhausted');
    }
    if (options.attempt > 10) {
      return undefined;
    }
    // Reconnect after
    return Math.min(options.attempt * 100, 3000);
  }
};

// Create Redis client
const client = redis.createClient(redisConfig);

// Handle connection events
client.on('connect', () => {
  logger.info('Redis client connected');
});

client.on('ready', () => {
  logger.info('Redis client ready');
});

client.on('error', (err) => {
  logger.error('Redis client error', { error: err.message, stack: err.stack });
});

client.on('end', () => {
  logger.info('Redis client disconnected');
});

// Connect to Redis
(async () => {
  try {
    await client.connect();
  } catch (error) {
    logger.error('Failed to connect to Redis', { error: error.message });
  }
})();

/**
 * Get cached value
 * @param {string} key - Cache key
 * @returns {Promise<*>} Cached value or null
 */
const getCache = async (key) => {
  try {
    const value = await client.get(key);
    if (value) {
      return JSON.parse(value);
    }
    return null;
  } catch (error) {
    logger.error('Redis GET error', { key, error: error.message });
    return null;
  }
};

/**
 * Set cached value with TTL
 * @param {string} key - Cache key
 * @param {*} value - Value to cache
 * @param {number} ttl - Time to live in seconds
 * @returns {Promise<boolean>} Success status
 */
const setCache = async (key, value, ttl = 3600) => {
  try {
    await client.setEx(key, ttl, JSON.stringify(value));
    return true;
  } catch (error) {
    logger.error('Redis SET error', { key, error: error.message });
    return false;
  }
};

/**
 * Delete cached value
 * @param {string} key - Cache key
 * @returns {Promise<boolean>} Success status
 */
const deleteCache = async (key) => {
  try {
    await client.del(key);
    return true;
  } catch (error) {
    logger.error('Redis DEL error', { key, error: error.message });
    return false;
  }
};

/**
 * Delete all keys matching a pattern
 * @param {string} pattern - Key pattern (e.g., 'user:*')
 * @returns {Promise<number>} Number of keys deleted
 */
const deleteCachePattern = async (pattern) => {
  try {
    const keys = await client.keys(pattern);
    if (keys.length === 0) return 0;
    await client.del(keys);
    return keys.length;
  } catch (error) {
    logger.error('Redis pattern delete error', { pattern, error: error.message });
    return 0;
  }
};

/**
 * Check if key exists
 * @param {string} key - Cache key
 * @returns {Promise<boolean>} Existence status
 */
const exists = async (key) => {
  try {
    const result = await client.exists(key);
    return result === 1;
  } catch (error) {
    logger.error('Redis EXISTS error', { key, error: error.message });
    return false;
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  await client.quit();
  logger.info('Redis client disconnected on app termination');
  process.exit(0);
});

module.exports = {
  client,
  getCache,
  setCache,
  deleteCache,
  deleteCachePattern,
  exists
};
