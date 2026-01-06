const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Asset Model
 * Handles all database operations for assets (stocks/tickers)
 */
class Asset {
  /**
   * Find all assets with pagination
   * @param {Object} filters - Filter criteria
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Array>} Array of assets
   */
  static async findAll(filters = {}, pagination = { limit: 100, offset: 0 }) {
    try {
      const conditions = [];
      const values = [];
      let paramIndex = 1;

      if (filters.asset_type) {
        conditions.push(`asset_type = $${paramIndex++}`);
        values.push(filters.asset_type);
      }
      if (filters.sector) {
        conditions.push(`sector = $${paramIndex++}`);
        values.push(filters.sector);
      }
      if (filters.exchange) {
        conditions.push(`exchange = $${paramIndex++}`);
        values.push(filters.exchange);
      }

      const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
      values.push(pagination.limit, pagination.offset);

      const sql = `
        SELECT * FROM assets
        ${whereClause}
        ORDER BY ticker
        LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `;

      const result = await query(sql, values);
      return result.rows;
    } catch (error) {
      logger.error('Error finding assets', { error: error.message, filters });
      throw error;
    }
  }

  /**
   * Find asset by ticker
   * @param {string} ticker - Stock ticker symbol
   * @returns {Promise<Object|null>} Asset object or null
   */
  static async findByTicker(ticker) {
    try {
      const sql = 'SELECT * FROM assets WHERE ticker = $1';
      const result = await query(sql, [ticker.toUpperCase()]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding asset by ticker', { error: error.message, ticker });
      throw error;
    }
  }

  /**
   * Find asset by ID
   * @param {number} id - Asset ID
   * @returns {Promise<Object|null>} Asset object or null
   */
  static async findById(id) {
    try {
      const sql = 'SELECT * FROM assets WHERE id = $1';
      const result = await query(sql, [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding asset by ID', { error: error.message, id });
      throw error;
    }
  }

  /**
   * Create new asset
   * @param {Object} data - Asset data
   * @returns {Promise<Object>} Created asset
   */
  static async create(data) {
    try {
      const sql = `
        INSERT INTO assets (
          ticker, asset_name, asset_type, company_name, sector,
          industry, exchange, current_price, market_cap
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (ticker) DO UPDATE SET
          asset_name = EXCLUDED.asset_name,
          company_name = EXCLUDED.company_name,
          sector = EXCLUDED.sector,
          industry = EXCLUDED.industry,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `;
      const values = [
        data.ticker.toUpperCase(),
        data.asset_name || null,
        data.asset_type || 'stock',
        data.company_name || null,
        data.sector || null,
        data.industry || null,
        data.exchange || null,
        data.current_price || null,
        data.market_cap || null
      ];

      const result = await query(sql, values);
      logger.info('Asset created/updated', { ticker: data.ticker });
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating asset', { error: error.message, data });
      throw error;
    }
  }

  /**
   * Update asset price
   * @param {string} ticker - Stock ticker
   * @param {number} price - Current price
   * @returns {Promise<Object|null>} Updated asset or null
   */
  static async updatePrice(ticker, price) {
    try {
      const sql = `
        UPDATE assets
        SET current_price = $1, last_price_update = CURRENT_TIMESTAMP
        WHERE ticker = $2
        RETURNING *
      `;
      const result = await query(sql, [price, ticker.toUpperCase()]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error updating asset price', { error: error.message, ticker, price });
      throw error;
    }
  }

  /**
   * Find or create asset
   * @param {Object} data - Asset data
   * @returns {Promise<Object>} Asset object
   */
  static async findOrCreate(data) {
    try {
      if (!data.ticker) {
        return null;
      }

      const existing = await this.findByTicker(data.ticker);
      if (existing) {
        return existing;
      }

      return await this.create(data);
    } catch (error) {
      logger.error('Error in findOrCreate asset', { error: error.message, data });
      throw error;
    }
  }

  /**
   * Get asset with transaction statistics
   * @param {string} ticker - Stock ticker
   * @returns {Promise<Object|null>} Asset with stats or null
   */
  static async getWithStats(ticker) {
    try {
      const sql = `
        SELECT
          a.*,
          COUNT(t.id) as transaction_count,
          COUNT(DISTINCT t.politician_id) as unique_traders,
          COUNT(CASE WHEN t.transaction_type = 'purchase' THEN 1 END) as purchases,
          COUNT(CASE WHEN t.transaction_type = 'sale' THEN 1 END) as sales,
          MAX(t.transaction_date) as latest_transaction
        FROM assets a
        LEFT JOIN transactions t ON a.id = t.asset_id
        WHERE a.ticker = $1
        GROUP BY a.id
      `;
      const result = await query(sql, [ticker.toUpperCase()]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting asset with stats', { error: error.message, ticker });
      throw error;
    }
  }

  /**
   * Get most traded assets
   * @param {number} limit - Number of results
   * @param {string} period - Time period (7d, 30d, 90d, all)
   * @returns {Promise<Array>} Array of assets with trade counts
   */
  static async getMostTraded(limit = 20, period = '30d') {
    try {
      let dateFilter = '';
      if (period !== 'all') {
        const days = parseInt(period);
        dateFilter = `AND t.transaction_date >= CURRENT_DATE - INTERVAL '${days} days'`;
      }

      const sql = `
        SELECT
          a.*,
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
      const result = await query(sql, [limit]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting most traded assets', { error: error.message });
      throw error;
    }
  }

  /**
   * Search assets
   * @param {string} searchTerm - Search term
   * @param {number} limit - Result limit
   * @returns {Promise<Array>} Array of assets
   */
  static async search(searchTerm, limit = 20) {
    try {
      const sql = `
        SELECT * FROM assets
        WHERE
          ticker ILIKE $1 OR
          asset_name ILIKE $1 OR
          company_name ILIKE $1
        ORDER BY ticker
        LIMIT $2
      `;
      const result = await query(sql, [`%${searchTerm}%`, limit]);
      return result.rows;
    } catch (error) {
      logger.error('Error searching assets', { error: error.message, searchTerm });
      throw error;
    }
  }
}

module.exports = Asset;
