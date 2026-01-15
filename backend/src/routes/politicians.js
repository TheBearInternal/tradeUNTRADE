const express = require('express');
const router = express.Router();
const Politician = require('../models/Politician');
const Transaction = require('../models/Transaction');
const { optionalAuthenticate } = require('../middleware/auth');
const { dynamicRateLimiter } = require('../middleware/rateLimit');
const { validationRules, validate, sanitizePagination } = require('../middleware/validation');
const { cacheMiddleware, cacheKeyGenerators, getCacheTTL } = require('../middleware/cache');
const logger = require('../utils/logger');

/**
 * GET /api/v1/politicians
 * List all politicians with optional filters
 */
router.get(
  '/',
  optionalAuthenticate,
  dynamicRateLimiter,
  validationRules.politicianFilters,
  validate,
  sanitizePagination,
  //cacheMiddleware(getCacheTTL('politicians'), cacheKeyGenerators.politicians),
  async (req, res) => {
    try {
      const { office, party, state, sortBy = 'name', sortOrder = 'ASC' } = req.query;

      const filters = {};
      if (office) filters.office = office;
      if (party) filters.party = party;
      if (state) filters.state = state.toUpperCase();
      filters.is_active = true;

      // Validate sort parameters
      const validSortBy = ['name', 'trades'];
      const validSortOrder = ['ASC', 'DESC'];
      const sanitizedSortBy = validSortBy.includes(sortBy) ? sortBy : 'name';
      const sanitizedSortOrder = validSortOrder.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'ASC';

      const paginationOptions = {
        ...req.pagination,
        sortBy: sanitizedSortBy,
        sortOrder: sanitizedSortOrder
      };

      const [politicians, total] = await Promise.all([
        Politician.findAll(filters, paginationOptions),
        Politician.count(filters)
      ]);

      res.json({
        success: true,
        data: politicians,
        pagination: {
          page: req.pagination.page,
          limit: req.pagination.limit,
          total,
          totalPages: Math.ceil(total / req.pagination.limit)
        }
      });
    } catch (error) {
      logger.error('Error fetching politicians', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch politicians'
      });
    }
  }
);

/**
 * GET /api/v1/politicians/search
 * Search politicians by name
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

      const politicians = await Politician.search(q, parseInt(limit));

      res.json({
  success: true,
  data: politicians,
  pagination: {  // ← This should be here now!
    page: 1,
    limit: parseInt(limit),
    total: politicians.length,
    totalPages: 1
  }
});
    } catch (error) {
      logger.error('Error searching politicians', { error: error.message, query: req.query.q });
      res.status(500).json({
        success: false,
        error: 'Search failed'
      });
    }
  }
);

/**
 * GET /api/v1/politicians/:id
 * Get single politician with statistics
 */
router.get(
  '/:id',
  optionalAuthenticate,
  dynamicRateLimiter,
  validationRules.politicianId,
  validate,
  //cacheMiddleware(getCacheTTL('politicians'), cacheKeyGenerators.politicianDetail),
  async (req, res) => {
    try {
      const { id } = req.params;

      const [politician, stats] = await Promise.all([
        Politician.findById(id),
        Politician.getStats(id)
      ]);

      if (!politician) {
        return res.status(404).json({
          success: false,
          error: 'Politician not found'
        });
      }

      res.json({
        success: true,
        data: {
          ...politician,
          stats
        }
      });
    } catch (error) {
      logger.error('Error fetching politician', { error: error.message, id: req.params.id });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch politician'
      });
    }
  }
);

/**
 * GET /api/v1/politicians/:id/transactions
 * Get politician's trading history
 */
router.get(
  '/:id/transactions',
  optionalAuthenticate,
  dynamicRateLimiter,
  validationRules.politicianId,
  validate,
  sanitizePagination,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Verify politician exists
      const politician = await Politician.findById(id);
      if (!politician) {
        return res.status(404).json({
          success: false,
          error: 'Politician not found'
        });
      }

      const filters = { politician_id: parseInt(id) };

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
      logger.error('Error fetching politician transactions', { error: error.message, id: req.params.id });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch transactions'
      });
    }
  }
);

module.exports = router;
