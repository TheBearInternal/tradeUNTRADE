const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { optionalAuthenticate } = require('../middleware/auth');
const { dynamicRateLimiter } = require('../middleware/rateLimit');
const { validationRules, validate } = require('../middleware/validation');
const { cacheMiddleware, cacheKeyGenerators, getCacheTTL } = require('../middleware/cache');
const logger = require('../utils/logger');

/**
 * GET /api/v1/analytics
 * Get comprehensive analytics dashboard data
 */
router.get(
  '/',
  optionalAuthenticate,
  dynamicRateLimiter,
  cacheMiddleware(getCacheTTL('analytics'), cacheKeyGenerators.analytics),
  async (req, res) => {
    try {
      // 1. Overview Stats
      const [politiciansCount, transactionsCount] = await Promise.all([
        query('SELECT COUNT(*) as count FROM politicians'),
        query('SELECT COUNT(*) as count FROM transactions')
      ]);

      // Most active trader (this week)
      const mostActiveTrader = await query(`
        SELECT p.id, p.full_name, COUNT(t.id) as trade_count
        FROM politicians p
        LEFT JOIN transactions t ON p.id = t.politician_id
        WHERE t.transaction_date >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY p.id, p.full_name
        ORDER BY trade_count DESC
        LIMIT 1
      `);

      // Most traded stock (this week) - FIXED JOIN
      const mostTradedStock = await query(`
        SELECT a.ticker, a.asset_name, COUNT(t.id) as trade_count
        FROM assets a
        LEFT JOIN transactions t ON a.id = t.asset_id
        WHERE t.transaction_date >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY a.ticker, a.asset_name
        ORDER BY trade_count DESC
        LIMIT 1
      `);

      // 2. Top Traders (all time)
      const topTraders = await query(`
        SELECT 
          p.id,
          p.full_name,
          p.party,
          COUNT(t.id) as total_trades,
          MAX(t.transaction_date) as latest_transaction
        FROM politicians p
        LEFT JOIN transactions t ON p.id = t.politician_id
        GROUP BY p.id, p.full_name, p.party
        ORDER BY total_trades DESC
        LIMIT 10
      `);

      // 3. Most Traded Stocks - FIXED JOIN
      const mostTradedStocks = await query(`
        SELECT 
          a.ticker,
          a.asset_name,
          a.sector,
          COUNT(t.id) as transaction_count,
          COUNT(DISTINCT t.politician_id) as politician_count
        FROM assets a
        LEFT JOIN transactions t ON a.id = t.asset_id
        GROUP BY a.ticker, a.asset_name, a.sector
        ORDER BY transaction_count DESC
        LIMIT 10
      `);

      // 4. Party Comparison
      const partyStats = await query(`
        SELECT 
          p.party,
          COUNT(t.id) as total_trades,
          COUNT(DISTINCT p.id) as politician_count
        FROM politicians p
        LEFT JOIN transactions t ON p.id = t.politician_id
        WHERE p.party IN ('Democrat', 'Republican')
        GROUP BY p.party
      `);

      // 5. Sector Breakdown - FIXED JOIN
      const sectorStats = await query(`
        SELECT 
          a.sector,
          COUNT(t.id) as transaction_count
        FROM assets a
        LEFT JOIN transactions t ON a.id = t.asset_id
        WHERE a.sector IS NOT NULL
        GROUP BY a.sector
        ORDER BY transaction_count DESC
      `);

      // Format response
      const analytics = {
        overview: {
          totalPoliticians: parseInt(politiciansCount.rows[0]?.count) || 0,
          totalTransactions: parseInt(transactionsCount.rows[0]?.count) || 0,
          mostActiveTrader: mostActiveTrader.rows[0] || null,
          mostTradedStock: mostTradedStock.rows[0] || null
        },
        topTraders: topTraders.rows || [],
        mostTradedStocks: mostTradedStocks.rows || [],
        partyComparison: partyStats.rows || [],
        sectorBreakdown: sectorStats.rows || []
      };

      res.json(analytics);
    } catch (error) {
      logger.error('Error fetching analytics dashboard', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch analytics dashboard'
      });
    }
  }
);

/**
 * GET /api/v1/analytics/trending
 * Get trending trades and politicians
 */
router.get(
  '/trending',
  optionalAuthenticate,
  dynamicRateLimiter,
  validationRules.analyticsFilters,
  validate,
  cacheMiddleware(getCacheTTL('analytics'), cacheKeyGenerators.analytics),
  async (req, res) => {
    try {
      const period = req.query.period || '7d';
      const limit = Math.min(parseInt(req.query.limit) || 10, 50);

      // Calculate date range
      let dateFilter = '';
      if (period !== 'all') {
        const days = parseInt(period);
        dateFilter = `AND t.transaction_date >= CURRENT_DATE - INTERVAL '${days} days'`;
      }

      // Get trending politicians (most active traders)
      const trendingPoliticiansQuery = `
        SELECT
          p.id,
          p.full_name,
          p.party,
          p.state,
          p.office,
          COUNT(t.id) as transaction_count,
          COUNT(CASE WHEN t.transaction_type = 'purchase' THEN 1 END) as purchases,
          COUNT(CASE WHEN t.transaction_type = 'sale' THEN 1 END) as sales,
          SUM(t.amount_min) as total_min_amount,
          SUM(t.amount_max) as total_max_amount
        FROM politicians p
        INNER JOIN transactions t ON p.id = t.politician_id
        WHERE 1=1 ${dateFilter}
        GROUP BY p.id
        ORDER BY transaction_count DESC
        LIMIT $1
      `;

      // Get trending tickers (most traded)
      const trendingTickersQuery = `
        SELECT
          a.ticker,
          a.asset_name,
          a.company_name,
          a.sector,
          COUNT(t.id) as transaction_count,
          COUNT(DISTINCT t.politician_id) as unique_traders,
          COUNT(CASE WHEN t.transaction_type = 'purchase' THEN 1 END) as purchases,
          COUNT(CASE WHEN t.transaction_type = 'sale' THEN 1 END) as sales
        FROM assets a
        INNER JOIN transactions t ON a.id = t.asset_id
        WHERE 1=1 ${dateFilter}
        GROUP BY a.id
        ORDER BY transaction_count DESC
        LIMIT $1
      `;

      const [trendingPoliticians, trendingTickers] = await Promise.all([
        query(trendingPoliticiansQuery, [limit]),
        query(trendingTickersQuery, [limit])
      ]);

      res.json({
        success: true,
        data: {
          politicians: trendingPoliticians.rows,
          tickers: trendingTickers.rows,
          period
        }
      });
    } catch (error) {
      logger.error('Error fetching trending data', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch trending data'
      });
    }
  }
);

/**
 * GET /api/v1/analytics/sectors
 * Get sector breakdown and analysis
 */
router.get(
  '/sectors',
  optionalAuthenticate,
  dynamicRateLimiter,
  validationRules.analyticsFilters,
  validate,
  cacheMiddleware(getCacheTTL('analytics'), cacheKeyGenerators.analytics),
  async (req, res) => {
    try {
      const period = req.query.period || '30d';

      let dateFilter = '';
      if (period !== 'all') {
        const days = parseInt(period);
        dateFilter = `AND t.transaction_date >= CURRENT_DATE - INTERVAL '${days} days'`;
      }

      const sql = `
        SELECT
          a.sector,
          COUNT(t.id) as transaction_count,
          COUNT(DISTINCT t.politician_id) as unique_traders,
          COUNT(CASE WHEN t.transaction_type = 'purchase' THEN 1 END) as purchases,
          COUNT(CASE WHEN t.transaction_type = 'sale' THEN 1 END) as sales,
          SUM(t.amount_min) as total_min_amount,
          SUM(t.amount_max) as total_max_amount
        FROM assets a
        INNER JOIN transactions t ON a.id = t.asset_id
        WHERE a.sector IS NOT NULL ${dateFilter}
        GROUP BY a.sector
        ORDER BY transaction_count DESC
      `;

      const result = await query(sql);

      res.json({
        success: true,
        data: result.rows,
        period
      });
    } catch (error) {
      logger.error('Error fetching sector analytics', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch sector analytics'
      });
    }
  }
);

/**
 * GET /api/v1/analytics/top-traders
 * Get most active traders with performance metrics
 */
router.get(
  '/top-traders',
  optionalAuthenticate,
  dynamicRateLimiter,
  validationRules.analyticsFilters,
  validate,
  cacheMiddleware(getCacheTTL('analytics'), cacheKeyGenerators.analytics),
  async (req, res) => {
    try {
      const period = req.query.period || '90d';
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);

      let dateFilter = '';
      if (period !== 'all') {
        const days = parseInt(period);
        dateFilter = `AND t.transaction_date >= CURRENT_DATE - INTERVAL '${days} days'`;
      }

      const sql = `
        SELECT
          p.id,
          p.full_name,
          p.party,
          p.state,
          p.office,
          p.profile_image_url,
          COUNT(t.id) as total_transactions,
          COUNT(CASE WHEN t.transaction_type = 'purchase' THEN 1 END) as total_purchases,
          COUNT(CASE WHEN t.transaction_type = 'sale' THEN 1 END) as total_sales,
          SUM(t.amount_min) as estimated_volume_min,
          SUM(t.amount_max) as estimated_volume_max,
          COUNT(DISTINCT t.asset_id) as unique_assets
        FROM politicians p
        INNER JOIN transactions t ON p.id = t.politician_id
        WHERE 1=1 ${dateFilter}
        GROUP BY p.id
        ORDER BY total_transactions DESC
        LIMIT $1
      `;

      const result = await query(sql, [limit]);

      res.json({
        success: true,
        data: result.rows,
        period
      });
    } catch (error) {
      logger.error('Error fetching top traders', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch top traders'
      });
    }
  }
);

/**
 * GET /api/v1/analytics/party-comparison
 * Compare trading activity by political party
 */
router.get(
  '/party-comparison',
  optionalAuthenticate,
  dynamicRateLimiter,
  validationRules.analyticsFilters,
  validate,
  cacheMiddleware(getCacheTTL('analytics'), cacheKeyGenerators.analytics),
  async (req, res) => {
    try {
      const period = req.query.period || '90d';

      let dateFilter = '';
      if (period !== 'all') {
        const days = parseInt(period);
        dateFilter = `AND t.transaction_date >= CURRENT_DATE - INTERVAL '${days} days'`;
      }

      const sql = `
        SELECT
          p.party,
          COUNT(t.id) as total_transactions,
          COUNT(DISTINCT p.id) as unique_politicians,
          COUNT(CASE WHEN t.transaction_type = 'purchase' THEN 1 END) as purchases,
          COUNT(CASE WHEN t.transaction_type = 'sale' THEN 1 END) as sales,
          SUM(t.amount_min) as total_min_amount,
          SUM(t.amount_max) as total_max_amount,
          AVG(t.amount_min) as avg_min_amount,
          AVG(t.amount_max) as avg_max_amount
        FROM politicians p
        INNER JOIN transactions t ON p.id = t.politician_id
        WHERE p.party IS NOT NULL ${dateFilter}
        GROUP BY p.party
        ORDER BY total_transactions DESC
      `;

      const result = await query(sql);

      res.json({
        success: true,
        data: result.rows,
        period
      });
    } catch (error) {
      logger.error('Error fetching party comparison', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch party comparison'
      });
    }
  }
);

/**
 * GET /api/v1/analytics/timeline
 * Get transaction activity over time
 */
router.get(
  '/timeline',
  optionalAuthenticate,
  dynamicRateLimiter,
  validationRules.analyticsFilters,
  validate,
  cacheMiddleware(getCacheTTL('analytics'), cacheKeyGenerators.analytics),
  async (req, res) => {
    try {
      const period = req.query.period || '90d';

      let dateFilter = '';
      let groupBy = 'day';

      if (period === '7d') {
        dateFilter = `AND transaction_date >= CURRENT_DATE - INTERVAL '7 days'`;
        groupBy = 'day';
      } else if (period === '30d') {
        dateFilter = `AND transaction_date >= CURRENT_DATE - INTERVAL '30 days'`;
        groupBy = 'day';
      } else if (period === '90d') {
        dateFilter = `AND transaction_date >= CURRENT_DATE - INTERVAL '90 days'`;
        groupBy = 'week';
      } else if (period === '1y') {
        dateFilter = `AND transaction_date >= CURRENT_DATE - INTERVAL '1 year'`;
        groupBy = 'month';
      }

      const sql = `
        SELECT
          DATE_TRUNC('${groupBy}', transaction_date) as period,
          COUNT(*) as transaction_count,
          COUNT(CASE WHEN transaction_type = 'purchase' THEN 1 END) as purchases,
          COUNT(CASE WHEN transaction_type = 'sale' THEN 1 END) as sales,
          SUM(amount_min) as total_min_amount,
          SUM(amount_max) as total_max_amount
        FROM transactions
        WHERE 1=1 ${dateFilter}
        GROUP BY DATE_TRUNC('${groupBy}', transaction_date)
        ORDER BY period ASC
      `;

      const result = await query(sql);

      res.json({
        success: true,
        data: result.rows,
        period,
        groupBy
      });
    } catch (error) {
      logger.error('Error fetching timeline data', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch timeline data'
      });
    }
  }
);

module.exports = router;