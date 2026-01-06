const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const { optionalAuthenticate } = require('../middleware/auth');
const { dynamicRateLimiter } = require('../middleware/rateLimit');
const { validationRules, validate, sanitizePagination, sanitizeSort } = require('../middleware/validation');
const { cacheMiddleware, cacheKeyGenerators, getCacheTTL } = require('../middleware/cache');
const logger = require('../utils/logger');

/**
 * GET /api/v1/transactions
 * List transactions with extensive filters
 */
router.get(
  '/',
  optionalAuthenticate,
  dynamicRateLimiter,
  validationRules.transactionFilters,
  validate,
  sanitizePagination,
  sanitizeSort(['transaction_date', 'filing_date', 'created_at', 'amount_min']),
  cacheMiddleware(getCacheTTL('transactions'), cacheKeyGenerators.transactions),
  async (req, res) => {
    try {
      const {
        politician_id,
        ticker,
        transaction_type,
        start_date,
        end_date,
        min_amount,
        party,
        sector,
        source
      } = req.query;

      const filters = {};
      if (politician_id) filters.politician_id = parseInt(politician_id);
      if (ticker) filters.ticker = ticker.toUpperCase();
      if (transaction_type) filters.transaction_type = transaction_type;
      if (start_date) filters.start_date = start_date;
      if (end_date) filters.end_date = end_date;
      if (min_amount) filters.min_amount = parseInt(min_amount);
      if (party) filters.party = party;
      if (sector) filters.sector = sector;
      if (source) filters.source = source;

      const pagination = {
        ...req.pagination,
        sortBy: req.sort.sortBy,
        sortOrder: req.sort.sortOrder
      };

      const [transactions, total] = await Promise.all([
        Transaction.findAll(filters, pagination),
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
      logger.error('Error fetching transactions', { error: error.message, filters: req.query });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch transactions'
      });
    }
  }
);

/**
 * GET /api/v1/transactions/feed
 * Get real-time transaction feed
 */
router.get(
  '/feed',
  optionalAuthenticate,
  dynamicRateLimiter,
  async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 100, 200);

      const transactions = await Transaction.getRecentFeed(limit);

      res.json({
        success: true,
        data: transactions,
        count: transactions.length
      });
    } catch (error) {
      logger.error('Error fetching transaction feed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch feed'
      });
    }
  }
);

/**
 * GET /api/v1/transactions/search
 * Search transactions
 */
router.get(
  '/search',
  optionalAuthenticate,
  dynamicRateLimiter,
  validationRules.search,
  validate,
  async (req, res) => {
    try {
      const { q, limit = 50 } = req.query;

      const transactions = await Transaction.search(q, parseInt(limit));

      res.json({
        success: true,
        data: transactions,
        count: transactions.length
      });
    } catch (error) {
      logger.error('Error searching transactions', { error: error.message, query: req.query.q });
      res.status(500).json({
        success: false,
        error: 'Search failed'
      });
    }
  }
);

/**
 * GET /api/v1/transactions/:id
 * Get single transaction detail
 */
router.get(
  '/:id',
  optionalAuthenticate,
  dynamicRateLimiter,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          success: false,
          error: 'Invalid transaction ID'
        });
      }

      const transaction = await Transaction.findById(parseInt(id));

      if (!transaction) {
        return res.status(404).json({
          success: false,
          error: 'Transaction not found'
        });
      }

      res.json({
        success: true,
        data: transaction
      });
    } catch (error) {
      logger.error('Error fetching transaction', { error: error.message, id: req.params.id });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch transaction'
      });
    }
  }
);

module.exports = router;
