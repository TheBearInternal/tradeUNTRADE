const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Alert Model
 * Handles all database operations for user alerts
 */
class Alert {
  /**
   * Find all alerts for a user
   * @param {number} userId - User ID
   * @returns {Promise<Array>} Array of alerts
   */
  static async findByUserId(userId) {
    try {
      const sql = `
        SELECT
          a.*,
          p.full_name as politician_name,
          p.party,
          p.state,
          ast.ticker,
          ast.asset_name
        FROM alerts a
        LEFT JOIN politicians p ON a.politician_id = p.id
        LEFT JOIN assets ast ON a.asset_id = ast.id
        WHERE a.user_id = $1 AND a.is_active = true
        ORDER BY a.created_at DESC
      `;
      const result = await query(sql, [userId]);
      return result.rows;
    } catch (error) {
      logger.error('Error finding alerts by user ID', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Find alert by ID
   * @param {number} id - Alert ID
   * @returns {Promise<Object|null>} Alert object or null
   */
  static async findById(id) {
    try {
      const sql = 'SELECT * FROM alerts WHERE id = $1';
      const result = await query(sql, [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding alert by ID', { error: error.message, id });
      throw error;
    }
  }

  /**
   * Create new alert
   * @param {Object} data - Alert data
   * @returns {Promise<Object>} Created alert
   */
  static async create(data) {
    try {
      const sql = `
        INSERT INTO alerts (
          user_id, alert_type, politician_id, asset_id, sector,
          notify_email, notify_push, notify_sms,
          min_transaction_amount, transaction_types
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;
      const values = [
        data.user_id,
        data.alert_type,
        data.politician_id || null,
        data.asset_id || null,
        data.sector || null,
        data.notify_email !== undefined ? data.notify_email : true,
        data.notify_push !== undefined ? data.notify_push : false,
        data.notify_sms !== undefined ? data.notify_sms : false,
        data.min_transaction_amount || null,
        data.transaction_types || null
      ];

      const result = await query(sql, values);
      logger.info('Alert created', { id: result.rows[0].id, userId: data.user_id });
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('Alert already exists');
      }
      logger.error('Error creating alert', { error: error.message, data });
      throw error;
    }
  }

  /**
   * Update alert
   * @param {number} id - Alert ID
   * @param {number} userId - User ID (for authorization)
   * @param {Object} data - Updated data
   * @returns {Promise<Object|null>} Updated alert or null
   */
  static async update(id, userId, data) {
    try {
      const allowedFields = [
        'notify_email', 'notify_push', 'notify_sms',
        'min_transaction_amount', 'transaction_types', 'is_active'
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

      values.push(id, userId);
      const sql = `
        UPDATE alerts
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex++} AND user_id = $${paramIndex}
        RETURNING *
      `;

      const result = await query(sql, values);
      if (result.rows[0]) {
        logger.info('Alert updated', { id, userId });
      }
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error updating alert', { error: error.message, id, userId, data });
      throw error;
    }
  }

  /**
   * Delete alert
   * @param {number} id - Alert ID
   * @param {number} userId - User ID (for authorization)
   * @returns {Promise<boolean>} Success status
   */
  static async delete(id, userId) {
    try {
      const sql = 'DELETE FROM alerts WHERE id = $1 AND user_id = $2';
      const result = await query(sql, [id, userId]);
      logger.info('Alert deleted', { id, userId });
      return result.rowCount > 0;
    } catch (error) {
      logger.error('Error deleting alert', { error: error.message, id, userId });
      throw error;
    }
  }

  /**
   * Find matching alerts for a transaction
   * @param {Object} transaction - Transaction data
   * @returns {Promise<Array>} Array of matching alerts with user info
   */
  static async findMatchingAlerts(transaction) {
    try {
      const sql = `
        SELECT a.*, u.email, u.username
        FROM alerts a
        INNER JOIN users u ON a.user_id = u.id
        WHERE a.is_active = true
          AND u.is_active = true
          AND (
            (a.alert_type = 'politician' AND a.politician_id = $1) OR
            (a.alert_type = 'ticker' AND a.asset_id = $2) OR
            (a.alert_type = 'sector' AND a.sector = $3)
          )
          AND (a.min_transaction_amount IS NULL OR $4 >= a.min_transaction_amount)
          AND (a.transaction_types IS NULL OR $5 = ANY(a.transaction_types))
      `;
      const values = [
        transaction.politician_id,
        transaction.asset_id,
        transaction.sector || null,
        transaction.amount_min || 0,
        transaction.transaction_type
      ];

      const result = await query(sql, values);
      return result.rows;
    } catch (error) {
      logger.error('Error finding matching alerts', { error: error.message, transaction });
      throw error;
    }
  }
}

module.exports = Alert;
