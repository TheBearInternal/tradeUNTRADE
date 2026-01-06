const rateLimit = require('express-rate-limit');
const { client: redisClient } = require('../config/redis');
const logger = require('../utils/logger');

/**
 * Custom rate limit store using Redis
 */
class RedisStore {
  constructor(options) {
    this.prefix = options.prefix || 'rl:';
    this.windowMs = options.windowMs;
  }

  async increment(key) {
    const redisKey = this.prefix + key;
    try {
      const current = await redisClient.incr(redisKey);
      if (current === 1) {
        // First request, set expiry
        await redisClient.expire(redisKey, Math.ceil(this.windowMs / 1000));
      }
      return {
        totalHits: current,
        resetTime: new Date(Date.now() + this.windowMs)
      };
    } catch (error) {
      logger.error('Redis rate limit error', { error: error.message });
      // Fallback: allow request if Redis fails
      return { totalHits: 0, resetTime: new Date() };
    }
  }

  async decrement(key) {
    const redisKey = this.prefix + key;
    try {
      await redisClient.decr(redisKey);
    } catch (error) {
      logger.error('Redis rate limit decrement error', { error: error.message });
    }
  }

  async resetKey(key) {
    const redisKey = this.prefix + key;
    try {
      await redisClient.del(redisKey);
    } catch (error) {
      logger.error('Redis rate limit reset error', { error: error.message });
    }
  }
}

/**
 * Rate limit configuration based on subscription tier
 */
const getRateLimitConfig = (tier = 'free') => {
  const configs = {
    free: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS_FREE) || 100
    },
    pro: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS_PRO) || 500
    },
    premium: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS_PREMIUM) || 2000
    }
  };

  return configs[tier] || configs.free;
};

/**
 * Create rate limiter middleware
 * @param {string} tier - Subscription tier (free, pro, premium)
 * @returns {Function} Express middleware
 */
const createRateLimiter = (tier = 'free') => {
  const config = getRateLimitConfig(tier);

  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      prefix: `rl:${tier}:`,
      windowMs: config.windowMs
    }),
    keyGenerator: (req) => {
      // Use user ID if authenticated, otherwise use IP
      return req.user ? `user:${req.user.id}` : `ip:${req.ip}`;
    },
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        tier,
        user: req.user?.id,
        ip: req.ip,
        path: req.path
      });
      res.status(429).json({
        success: false,
        error: 'Too many requests',
        message: `Rate limit exceeded. Maximum ${config.max} requests per ${config.windowMs / 60000} minutes.`,
        tier,
        upgrade_message: tier === 'free' ? 'Upgrade to Pro for higher limits' : undefined
      });
    },
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/health' || req.path === '/api/health';
    }
  });
};

/**
 * Dynamic rate limiter based on user's subscription tier
 */
const dynamicRateLimiter = (req, res, next) => {
  const tier = req.user?.subscription_tier || 'free';
  const limiter = createRateLimiter(tier);
  limiter(req, res, next);
};

/**
 * Strict rate limiter for authentication endpoints
 */
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `auth:${req.ip}`;
  },
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      path: req.path
    });
    res.status(429).json({
      success: false,
      error: 'Too many authentication attempts',
      message: 'Please try again later'
    });
  }
});

module.exports = {
  createRateLimiter,
  dynamicRateLimiter,
  authRateLimiter,
  getRateLimitConfig
};
