const { query, transaction } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Politician Model
 * Handles all database operations for politicians
 */
class Politician {
  /**
   * Find all politicians with optional filters
   * @param {Object} filters - Filter criteria
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Array>} Array of politicians
   */
  static async findAll(filters = {}, pagination = { limit: 50, offset: 0 }) {
    try {
      const conditions = [];
      const values = [];
      let paramIndex = 1;

      // Build WHERE clause from filters
      if (filters.office) {
        conditions.push(`office = $${paramIndex++}`);
        values.push(filters.office);
      }
      if (filters.party) {
        conditions.push(`party = $${paramIndex++}`);
        values.push(filters.party);
      }
      if (filters.state) {
        conditions.push(`state = $${paramIndex++}`);
        values.push(filters.state);
      }
      if (filters.is_active !== undefined) {
        conditions.push(`is_active = $${paramIndex++}`);
        values.push(filters.is_active);
      }

      const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

      // Add pagination
      const limitClause = `LIMIT $${paramIndex++}`;
      const offsetClause = `OFFSET $${paramIndex++}`;
      values.push(pagination.limit, pagination.offset);

      const sql = `
        SELECT * FROM politicians
        ${whereClause}
        ORDER BY last_name, first_name
        ${limitClause} ${offsetClause}
      `;

      const result = await query(sql, values);
      return result.rows;
    } catch (error) {
      logger.error('Error finding politicians', { error: error.message, filters });
      throw error;
    }
  }

  /**
   * Find politician by ID
   * @param {number} id - Politician ID
   * @returns {Promise<Object|null>} Politician object or null
   */
  static async findById(id) {
    try {
      const sql = 'SELECT * FROM politicians WHERE id = $1';
      const result = await query(sql, [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding politician by ID', { error: error.message, id });
      throw error;
    }
  }

  /**
   * Search politicians by name
   * @param {string} searchTerm - Search term
   * @param {number} limit - Result limit
   * @returns {Promise<Array>} Array of politicians
   */
  static async search(searchTerm, limit = 20) {
    try {
      const sql = `
        SELECT * FROM politicians
        WHERE
          full_name ILIKE $1 OR
          first_name ILIKE $1 OR
          last_name ILIKE $1
        ORDER BY last_name, first_name
        LIMIT $2
      `;
      const result = await query(sql, [`%${searchTerm}%`, limit]);
      return result.rows;
    } catch (error) {
      logger.error('Error searching politicians', { error: error.message, searchTerm });
      throw error;
    }
  }

  /**
   * Create new politician
   * @param {Object} data - Politician data
   * @returns {Promise<Object>} Created politician
   */
  static async create(data) {
    try {
      const sql = `
        INSERT INTO politicians (
          full_name, first_name, last_name, office, party, state,
          district, chamber, profile_image_url, bio, twitter_handle, website_url
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;
      const values = [
        data.full_name,
        data.first_name,
        data.last_name,
        data.office,
        data.party || null,
        data.state || null,
        data.district || null,
        data.chamber || null,
        data.profile_image_url || null,
        data.bio || null,
        data.twitter_handle || null,
        data.website_url || null
      ];
      const result = await query(sql, values);
      logger.info('Politician created', { id: result.rows[0].id, name: data.full_name });
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating politician', { error: error.message, data });
      throw error;
    }
  }

  /**
   * Update politician
   * @param {number} id - Politician ID
   * @param {Object} data - Updated data
   * @returns {Promise<Object|null>} Updated politician or null
   */
  static async update(id, data) {
    try {
      const allowedFields = [
        'full_name', 'first_name', 'last_name', 'office', 'party', 'state',
        'district', 'chamber', 'profile_image_url', 'bio', 'twitter_handle',
        'website_url', 'is_active'
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
        UPDATE politicians
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await query(sql, values);
      logger.info('Politician updated', { id });
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error updating politician', { error: error.message, id, data });
      throw error;
    }
  }

  /**
   * Find or create politician by name
   * @param {Object} data - Politician data
   * @returns {Promise<Object>} Politician object
   */
  static async findOrCreate(data) {
    try {
      // Try to find existing politician
      const searchSql = `
        SELECT * FROM politicians
        WHERE full_name = $1 AND office = $2
        LIMIT 1
      `;
      const existing = await query(searchSql, [data.full_name, data.office]);

      if (existing.rows.length > 0) {
        return existing.rows[0];
      }

      // Create new politician
      return await this.create(data);
    } catch (error) {
      logger.error('Error in findOrCreate politician', { error: error.message, data });
      throw error;
    }
  }

  /**
   * Get politician statistics
   * @param {number} id - Politician ID
   * @returns {Promise<Object>} Statistics object
   */
  static async getStats(id) {
    try {
      const sql = `
        SELECT
          COUNT(*) as total_transactions,
          COUNT(CASE WHEN transaction_type = 'purchase' THEN 1 END) as total_purchases,
          COUNT(CASE WHEN transaction_type = 'sale' THEN 1 END) as total_sales,
          SUM(amount_min) as total_amount_min,
          SUM(amount_max) as total_amount_max,
          MIN(transaction_date) as first_transaction,
          MAX(transaction_date) as latest_transaction
        FROM transactions
        WHERE politician_id = $1
      `;
      const result = await query(sql, [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting politician stats', { error: error.message, id });
      throw error;
    }
  }

  /**
   * Get count of politicians
   * @param {Object} filters - Filter criteria
   * @returns {Promise<number>} Count
   */
  static async count(filters = {}) {
    try {
      const conditions = [];
      const values = [];
      let paramIndex = 1;

      if (filters.office) {
        conditions.push(`office = $${paramIndex++}`);
        values.push(filters.office);
      }
      if (filters.party) {
        conditions.push(`party = $${paramIndex++}`);
        values.push(filters.party);
      }
      if (filters.is_active !== undefined) {
        conditions.push(`is_active = $${paramIndex++}`);
        values.push(filters.is_active);
      }

      const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
      const sql = `SELECT COUNT(*) as count FROM politicians ${whereClause}`;

      const result = await query(sql, values);
      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Error counting politicians', { error: error.message, filters });
      throw error;
    }
  }
}

module.exports = Politician;
