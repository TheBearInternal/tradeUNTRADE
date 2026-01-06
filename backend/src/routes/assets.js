const express = require('express');
const router = express.Router();
const Asset = require('../models/Asset');
const Transaction = require('../models/Transaction');
const { optionalAuthenticate } = require('../middleware/auth');
const { dynamicRateLimiter } = require('../middleware/rateLimit');
const { validationRules, validate, sanitizePagination } = require('../middleware/validation');
const { cacheMiddleware, cacheKeyGenerators, getCacheTTL } = require('../middleware/cache');
const logger = require('../utils/logger');

/**
 * GET /api/v1/assets
 * List all assets/tickers
 */
router.get(
  '/',
  optionalAuthenticate,
  dynamicRateLimiter,
  sanitizePagination,
  cacheMiddleware(getCacheTTL('assets')),
  async (req, res) => {
    try {
      const { asset_type, sector, exchange } = req.query;

      const filters = {};
      if (asset_type) filters.asset_type = asset_type;
      if (sector) filters.sector = sector;
      if (exchange) filters.exchange = exchange;

      const [assets, total] = await Promise.all([
        Asset.findAll(filters, req.pagination),
        Asset.count ? Asset.count(filters) : 0
      ]);

      res.json({
        success: true,
        data: assets,
        pagination: {
          page: req.pagination.page,
          limit: req.pagination.limit,
          total,
          totalPages: total > 0 ? Math.ceil(total / req.pagination.limit) : 0
        }
      });
    } catch (error) {
      logger.error('Error fetching assets', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch assets'
      });
    }
  }
);

/**
 * GET /api/v1/assets/most-traded
 * Get most traded assets
 */
router.get(
  '/most-traded',
  optionalAuthenticate,
  dynamicRateLimiter,
  async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const period = req.query.period || '30d';

      const assets = await Asset.getMostTraded(limit, period);

      res.json({
        success: true,
        data: assets,
        count: assets.length
      });
    } catch (error) {
      logger.error('Error fetching most traded assets', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch most traded assets'
      });
    }
  }
);

/**
 * GET /api/v1/assets/search
 * Search assets by ticker or name
 */
router.get(
  '/search',
  optionalAuthenticate,
  dynamicRateLimiter,
  validationRules.search,
  validate,
  async (req, res) => {
    try {
      const { q, limit = 20 } = req.query;

      const assets = await Asset.search(q, parseInt(limit));

      res.json({
        success: true,
        data: assets,
        count: assets.length
      });
    } catch (error) {
      logger.error('Error searching assets', { error: error.message, query: req.query.q });
      res.status(500).json({
        success: false,
        error: 'Search failed'
      });
    }
  }
);

/**
 * GET /api/v1/assets/:ticker
 * Get single asset with company info and statistics
 */
router.get(
  '/:ticker',
  optionalAuthenticate,
  dynamicRateLimiter,
  validationRules.assetTicker,
  validate,
  cacheMiddleware(getCacheTTL('assets'), cacheKeyGenerators.assetDetail),
  async (req, res) => {
    try {
      const { ticker } = req.params;

      const asset = await Asset.getWithStats(ticker);

      if (!asset) {
        return res.status(404).json({
          success: false,
          error: 'Asset not found'
        });
      }

      res.json({
        success: true,
        data: asset
      });
    } catch (error) {
      logger.error('Error fetching asset', { error: error.message, ticker: req.params.ticker });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch asset'
      });
    }
  }
);

/**
 * GET /api/v1/assets/:ticker/transactions
 * Get transactions for a specific ticker
 */
router.get(
  '/:ticker/transactions',
  optionalAuthenticate,
  dynamicRateLimiter,
  validationRules.assetTicker,
  validate,
  sanitizePagination,
  async (req, res) => {
    try {
      const { ticker } = req.params;

      // Verify asset exists
      const asset = await Asset.findByTicker(ticker);
      if (!asset) {
        return res.status(404).json({
          success: false,
          error: 'Asset not found'
        });
      }

      const filters = { asset_id: asset.id };

      // Add additional filters from query
      if (req.query.transaction_type) filters.transaction_type = req.query.transaction_type;
      if (req.query.start_date) filters.start_date = req.query.start_date;
      if (req.query.end_date) filters.end_date = req.query.end_date;

      const [transactions, total] = await Promise.all([
        Transaction.findAll(filters, {
          ...req.pagination,
          sortBy: 'transaction_date',
          sortOrder: 'DESC'
        }),
        Transaction.count(filters)
      ]);

      res.json({
        success: true,
        data: transactions,
        pagination: {
          page: req.pagination.page,
          limit: req.pagination.limit,
          total,
          totalPages: Math.ceil(total / req.pagination.limit)
        }
      });
    } catch (error) {
      logger.error('Error fetching asset transactions', { error: error.message, ticker: req.params.ticker });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch transactions'
      });
    }
  }
);

module.exports = router;
