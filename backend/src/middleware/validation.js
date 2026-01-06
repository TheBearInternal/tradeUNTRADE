const { validationResult, body, param, query } = require('express-validator');
const logger = require('../utils/logger');

/**
 * Middleware to check validation results
 * Returns 400 with error details if validation fails
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation failed', {
      path: req.path,
      errors: errors.array(),
      body: req.body,
      query: req.query
    });

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

/**
 * Common validation rules
 */
const validationRules = {
  // User registration
  register: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('username')
      .trim()
      .isLength({ min: 3, max: 50 })
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('Username must be 3-50 characters and contain only letters, numbers, underscores, and hyphens'),
    body('password')
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must be at least 8 characters with uppercase, lowercase, and number'),
    body('full_name')
      .optional()
      .trim()
      .isLength({ max: 255 })
  ],

  // User login
  login: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],

  // Politician ID parameter
  politicianId: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Invalid politician ID')
  ],

  // Transaction filters
  transactionFilters: [
    query('politician_id')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Invalid politician ID'),
    query('ticker')
      .optional()
      .trim()
      .isLength({ min: 1, max: 10 })
      .matches(/^[A-Z]+$/)
      .withMessage('Invalid ticker symbol'),
    query('transaction_type')
      .optional()
      .isIn(['purchase', 'sale', 'exchange'])
      .withMessage('Invalid transaction type'),
    query('start_date')
      .optional()
      .isISO8601()
      .withMessage('Invalid start date'),
    query('end_date')
      .optional()
      .isISO8601()
      .withMessage('Invalid end date'),
    query('party')
      .optional()
      .isIn(['Republican', 'Democrat', 'Independent'])
      .withMessage('Invalid party'),
    query('min_amount')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Invalid minimum amount'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Invalid page number')
  ],

  // Politician filters
  politicianFilters: [
    query('office')
      .optional()
      .isIn(['house', 'senate', 'executive'])
      .withMessage('Invalid office'),
    query('party')
      .optional()
      .trim()
      .isLength({ max: 50 }),
    query('state')
      .optional()
      .isLength({ min: 2, max: 2 })
      .matches(/^[A-Z]{2}$/)
      .withMessage('Invalid state code'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Invalid page number')
  ],

  // Asset ticker parameter
  assetTicker: [
    param('ticker')
      .trim()
      .isLength({ min: 1, max: 10 })
      .matches(/^[A-Z]+$/i)
      .withMessage('Invalid ticker symbol')
  ],

  // Alert creation
  createAlert: [
    body('alert_type')
      .isIn(['politician', 'ticker', 'sector'])
      .withMessage('Invalid alert type'),
    body('politician_id')
      .if(body('alert_type').equals('politician'))
      .isInt({ min: 1 })
      .withMessage('Politician ID is required for politician alerts'),
    body('ticker')
      .if(body('alert_type').equals('ticker'))
      .trim()
      .isLength({ min: 1, max: 10 })
      .withMessage('Ticker is required for ticker alerts'),
    body('sector')
      .if(body('alert_type').equals('sector'))
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Sector is required for sector alerts'),
    body('notify_email')
      .optional()
      .isBoolean()
      .withMessage('Invalid notify_email value'),
    body('notify_push')
      .optional()
      .isBoolean()
      .withMessage('Invalid notify_push value'),
    body('min_transaction_amount')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Invalid minimum transaction amount'),
    body('transaction_types')
      .optional()
      .isArray()
      .withMessage('transaction_types must be an array'),
    body('transaction_types.*')
      .optional()
      .isIn(['purchase', 'sale', 'exchange'])
      .withMessage('Invalid transaction type in array')
  ],

  // Alert update
  updateAlert: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Invalid alert ID'),
    body('notify_email')
      .optional()
      .isBoolean(),
    body('notify_push')
      .optional()
      .isBoolean(),
    body('notify_sms')
      .optional()
      .isBoolean(),
    body('min_transaction_amount')
      .optional()
      .isInt({ min: 0 }),
    body('is_active')
      .optional()
      .isBoolean()
  ],

  // Search query
  search: [
    query('q')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search query must be 1-100 characters'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50')
  ],

  // Analytics filters
  analyticsFilters: [
    query('period')
      .optional()
      .isIn(['7d', '30d', '90d', '1y', 'all'])
      .withMessage('Invalid period'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ]
};

/**
 * Sanitize pagination parameters
 * Ensures safe values and prevents abuse
 */
const sanitizePagination = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;

  // Enforce maximum limit
  req.pagination = {
    page: Math.max(1, page),
    limit: Math.min(Math.max(1, limit), 100),
    offset: Math.max(0, (page - 1) * limit)
  };

  next();
};

/**
 * Sanitize sort parameters
 * Prevents SQL injection through sort parameters
 */
const sanitizeSort = (allowedFields = ['created_at', 'updated_at']) => {
  return (req, res, next) => {
    const sortBy = req.query.sort_by || allowedFields[0];
    const sortOrder = req.query.sort_order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Only allow whitelisted sort fields
    req.sort = {
      sortBy: allowedFields.includes(sortBy) ? sortBy : allowedFields[0],
      sortOrder
    };

    next();
  };
};

module.exports = {
  validate,
  validationRules,
  sanitizePagination,
  sanitizeSort
};
