const { getCache, setCache, deleteCache, deleteCachePattern } = require('../config/redis');
const logger = require('../utils/logger');

/**
 * Cache middleware for GET requests
 * @param {number} ttl - Time to live in seconds
 * @param {Function} keyGenerator - Function to generate cache key from request
 * @returns {Function} Express middleware
 */
const cacheMiddleware = (ttl = 300, keyGenerator = null) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    try {
      // Generate cache key
      let cacheKey;
      if (keyGenerator) {
        cacheKey = keyGenerator(req);
      } else {
        // Default: use path and query string
        const queryString = JSON.stringify(req.query);
        cacheKey = `cache:${req.path}:${queryString}`;
      }

      // Try to get from cache
      const cachedData = await getCache(cacheKey);
      if (cachedData) {
        logger.debug('Cache hit', { key: cacheKey });
        return res.json({
          success: true,
          data: cachedData,
          cached: true
        });
      }

      // Cache miss - store original res.json
      const originalJson = res.json.bind(res);

      // Override res.json to cache the response
      res.json = function(data) {
        // Only cache successful responses
        if (data.success !== false && res.statusCode === 200) {
          setCache(cacheKey, data.data || data, ttl)
            .catch(err => logger.error('Cache set error', { error: err.message }));
        }
        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error', { error: error.message });
      // Continue without caching on error
      next();
    }
  };
};

/**
 * Invalidate cache for specific patterns
 * @param {string} pattern - Cache key pattern
 * @returns {Promise<number>} Number of keys deleted
 */
const invalidateCache = async (pattern) => {
  try {
    const count = await deleteCachePattern(pattern);
    logger.info('Cache invalidated', { pattern, count });
    return count;
  } catch (error) {
    logger.error('Cache invalidation error', { error: error.message, pattern });
    return 0;
  }
};

/**
 * Cache key generators for different endpoints
 */
const cacheKeyGenerators = {
  politicians: (req) => {
    const filters = JSON.stringify({
      office: req.query.office,
      party: req.query.party,
      state: req.query.state,
      page: req.query.page
    });
    return `cache:politicians:${filters}`;
  },

  transactions: (req) => {
    const filters = JSON.stringify({
      politician_id: req.query.politician_id,
      ticker: req.query.ticker,
      transaction_type: req.query.transaction_type,
      party: req.query.party,
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      page: req.query.page
    });
    return `cache:transactions:${filters}`;
  },

  politicianDetail: (req) => {
    return `cache:politician:${req.params.id}`;
  },

  assetDetail: (req) => {
    return `cache:asset:${req.params.ticker}`;
  },

  analytics: (req) => {
    const params = JSON.stringify(req.query);
    return `cache:analytics:${req.path}:${params}`;
  }
};

/**
 * Get cache TTL values from environment
 */
const getCacheTTL = (type) => {
  const ttls = {
    politicians: parseInt(process.env.CACHE_TTL_POLITICIANS) || 3600,
    transactions: parseInt(process.env.CACHE_TTL_TRANSACTIONS) || 300,
    assets: parseInt(process.env.CACHE_TTL_ASSETS) || 1800,
    analytics: parseInt(process.env.CACHE_TTL_ANALYTICS) || 600
  };

  return ttls[type] || 300;
};

/**
 * Cache invalidation middleware for POST/PUT/DELETE requests
 * Automatically invalidates related caches
 */
const autoInvalidateCache = (patterns) => {
  return async (req, res, next) => {
    // Store original methods
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    // Override response methods to invalidate cache after successful operations
    const invalidateAfterResponse = (data) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Only invalidate on successful responses
        setImmediate(async () => {
          for (const pattern of patterns) {
            await invalidateCache(pattern);
          }
        });
      }
      return data;
    };

    res.json = function(data) {
      invalidateAfterResponse(data);
      return originalJson(data);
    };

    res.send = function(data) {
      invalidateAfterResponse(data);
      return originalSend(data);
    };

    next();
  };
};

module.exports = {
  cacheMiddleware,
  invalidateCache,
  cacheKeyGenerators,
  getCacheTTL,
  autoInvalidateCache
};
