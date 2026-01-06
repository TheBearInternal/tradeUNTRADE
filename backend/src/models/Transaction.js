const { query, transaction } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Transaction Model
 * Handles all database operations for transactions
 */
class Transaction {
  /**
   * Find all transactions with filters and pagination
   * @param {Object} filters - Filter criteria
   * @param {Object} pagination - Pagination and sorting options
   * @returns {Promise<Array>} Array of transactions
   */
  static async findAll(filters = {}, pagination = { limit: 50, offset: 0, sortBy: 'transaction_date', sortOrder: 'DESC' }) {
    try {
      const conditions = [];
      const values = [];
      let paramIndex = 1;

      // Build WHERE clause from filters
      if (filters.politician_id) {
        conditions.push(`t.politician_id = $${paramIndex++}`);
        values.push(filters.politician_id);
      }
      if (filters.asset_id) {
        conditions.push(`t.asset_id = $${paramIndex++}`);
        values.push(filters.asset_id);
      }
      if (filters.ticker) {
        conditions.push(`a.ticker = $${paramIndex++}`);
        values.push(filters.ticker);
      }
      if (filters.transaction_type) {
        conditions.push(`t.transaction_type = $${paramIndex++}`);
        values.push(filters.transaction_type);
      }
      if (filters.start_date) {
        conditions.push(`t.transaction_date >= $${paramIndex++}`);
        values.push(filters.start_date);
      }
      if (filters.end_date) {
        conditions.push(`t.transaction_date <= $${paramIndex++}`);
        values.push(filters.end_date);
      }
      if (filters.min_amount) {
        conditions.push(`t.amount_min >= $${paramIndex++}`);
        values.push(filters.min_amount);
      }
      if (filters.party) {
        conditions.push(`p.party = $${paramIndex++}`);
        values.push(filters.party);
      }
      if (filters.sector) {
        conditions.push(`a.sector = $${paramIndex++}`);
        values.push(filters.sector);
      }
      if (filters.source) {
        conditions.push(`t.source = $${paramIndex++}`);
        values.push(filters.source);
      }

      const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

      // Validate sort column to prevent SQL injection
      const allowedSortColumns = ['transaction_date', 'filing_date', 'created_at', 'amount_min'];
      const sortBy = allowedSortColumns.includes(pagination.sortBy) ? pagination.sortBy : 'transaction_date';
      const sortOrder = pagination.sortOrder === 'ASC' ? 'ASC' : 'DESC';

      // Add pagination
      values.push(pagination.limit, pagination.offset);

      const sql = `
        SELECT
          t.*,
          p.full_name as politician_name,
          p.party,
          p.state,
          p.office,
          a.ticker,
          a.asset_name,
          a.company_name,
          a.sector,
          a.industry
        FROM transactions t
        INNER JOIN politicians p ON t.politician_id = p.id
        LEFT JOIN assets a ON t.asset_id = a.id
        ${whereClause}
        ORDER BY t.${sortBy} ${sortOrder}
        LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `;

      const result = await query(sql, values);
      return result.rows;
    } catch (error) {
      logger.error('Error finding transactions', { error: error.message, filters });
      throw error;
    }
  }

  /**
   * Find transaction by ID with related data
   * @param {number} id - Transaction ID
   * @returns {Promise<Object|null>} Transaction object or null
   */
  static async findById(id) {
    try {
      const sql = `
        SELECT
          t.*,
          p.full_name as politician_name,
          p.party,
          p.state,
          p.office,
          p.profile_image_url,
          a.ticker,
          a.asset_name,
          a.company_name,
          a.sector,
          a.industry,
          a.current_price
        FROM transactions t
        INNER JOIN politicians p ON t.politician_id = p.id
        LEFT JOIN assets a ON t.asset_id = a.id
        WHERE t.id = $1
      `;
      const result = await query(sql, [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding transaction by ID', { error: error.message, id });
      throw error;
    }
  }

  /**
   * Create new transaction
   * @param {Object} data - Transaction data
   * @returns {Promise<Object>} Created transaction
   */
  static async create(data) {
    try {
      const sql = `
        INSERT INTO transactions (
          politician_id, asset_id, transaction_type, transaction_date,
          filing_date, amount_min, amount_max, amount_range_code,
          asset_description, comment, source, filing_id, filing_url,
          confidence_score, manual_review_needed, verified
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT DO NOTHING
        RETURNING *
      `;
      const values = [
        data.politician_id,
        data.asset_id || null,
        data.transaction_type,
        data.transaction_date,
        data.filing_date || null,
        data.amount_min || null,
        data.amount_max || null,
        data.amount_range_code || null,
        data.asset_description || null,
        data.comment || null,
        data.source,
        data.filing_id || null,
        data.filing_url || null,
        data.confidence_score || 0.5,
        data.manual_review_needed || false,
        data.verified || false
      ];

      const result = await query(sql, values);

      if (result.rows.length > 0) {
        logger.info('Transaction created', { id: result.rows[0].id });
        return result.rows[0];
      } else {
        logger.debug('Duplicate transaction skipped');
        return null;
      }
    } catch (error) {
      logger.error('Error creating transaction', { error: error.message, data });
      throw error;
    }
  }

  /**
   * Bulk create transactions
   * @param {Array} transactions - Array of transaction data
   * @returns {Promise<number>} Number of transactions created
   */
  static async bulkCreate(transactions) {
    try {
      if (!transactions || transactions.length === 0) {
        return 0;
      }

      let created = 0;
      for (const txn of transactions) {
        const result = await this.create(txn);
        if (result) created++;
      }

      logger.info(`Bulk created ${created} transactions out of ${transactions.length}`);
      return created;
    } catch (error) {
      logger.error('Error in bulk create transactions', { error: error.message });
      throw error;
    }
  }

  /**
   * Update transaction
   * @param {number} id - Transaction ID
   * @param {Object} data - Updated data
   * @returns {Promise<Object|null>} Updated transaction or null
   */
  static async update(id, data) {
    try {
      const allowedFields = [
        'asset_id', 'transaction_type', 'transaction_date', 'filing_date',
        'amount_min', 'amount_max', 'amount_range_code', 'asset_description',
        'comment', 'confidence_score', 'manual_review_needed', 'verified'
      ];

      const updates = [];
      const values = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(data)) {
        if (allowedFields.includes(key) && value !== undefined) {
          updates.push(`${key} = $${paramIndex++}`);
          values.push(value);
        }
      }

      if (updates.length === 0) {
        return await this.findById(id);
      }

      values.push(id);
      const sql = `
        UPDATE transactions
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await query(sql, values);
      logger.info('Transaction updated', { id });
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error updating transaction', { error: error.message, id, data });
      throw error;
    }
  }

  /**
   * Get recent transactions feed
   * @param {number} limit - Number of transactions
   * @returns {Promise<Array>} Array of recent transactions
   */
  static async getRecentFeed(limit = 100) {
    try {
      const sql = `
        SELECT
          t.*,
          p.full_name as politician_name,
          p.party,
          p.state,
          p.office,
          p.profile_image_url,
          a.ticker,
          a.asset_name,
          a.company_name,
          a.sector
        FROM transactions t
        INNER JOIN politicians p ON t.politician_id = p.id
        LEFT JOIN assets a ON t.asset_id = a.id
        ORDER BY t.created_at DESC
        LIMIT $1
      `;
      const result = await query(sql, [limit]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting recent feed', { error: error.message });
      throw error;
    }
  }

  /**
   * Search transactions
   * @param {string} searchTerm - Search term
   * @param {number} limit - Result limit
   * @returns {Promise<Array>} Array of transactions
   */
  static async search(searchTerm, limit = 50) {
    try {
      const sql = `
        SELECT
          t.*,
          p.full_name as politician_name,
          p.party,
          p.state,
          a.ticker,
          a.asset_name,
          a.company_name
        FROM transactions t
        INNER JOIN politicians p ON t.politician_id = p.id
        LEFT JOIN assets a ON t.asset_id = a.id
        WHERE
          p.full_name ILIKE $1 OR
          a.ticker ILIKE $1 OR
          a.asset_name ILIKE $1 OR
          a.company_name ILIKE $1
        ORDER BY t.transaction_date DESC
        LIMIT $2
      `;
      const result = await query(sql, [`%${searchTerm}%`, limit]);
      return result.rows;
    } catch (error) {
      logger.error('Error searching transactions', { error: error.message, searchTerm });
      throw error;
    }
  }

  /**
   * Get count of transactions
   * @param {Object} filters - Filter criteria
   * @returns {Promise<number>} Count
   */
  static async count(filters = {}) {
    try {
      const conditions = [];
      const values = [];
      let paramIndex = 1;

      if (filters.politician_id) {
        conditions.push(`politician_id = $${paramIndex++}`);
        values.push(filters.politician_id);
      }
      if (filters.transaction_type) {
        conditions.push(`transaction_type = $${paramIndex++}`);
        values.push(filters.transaction_type);
      }
      if (filters.start_date) {
        conditions.push(`transaction_date >= $${paramIndex++}`);
        values.push(filters.start_date);
      }
      if (filters.end_date) {
        conditions.push(`transaction_date <= $${paramIndex++}`);
        values.push(filters.end_date);
      }

      const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
      const sql = `SELECT COUNT(*) as count FROM transactions ${whereClause}`;

      const result = await query(sql, values);
      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Error counting transactions', { error: error.message, filters });
      throw error;
    }
  }
}

module.exports = Transaction;
