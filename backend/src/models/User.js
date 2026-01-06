const { query } = require('../config/database');
const bcrypt = require('bcrypt');
const logger = require('../utils/logger');

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;

/**
 * User Model
 * Handles all database operations for users
 */
class User {
  /**
   * Find user by ID
   * @param {number} id - User ID
   * @returns {Promise<Object|null>} User object or null (without password hash)
   */
  static async findById(id) {
    try {
      const sql = `
        SELECT id, email, username, full_name, avatar_url, subscription_tier,
               subscription_expires_at, email_verified, two_factor_enabled,
               created_at, last_login_at, is_active
        FROM users
        WHERE id = $1
      `;
      const result = await query(sql, [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding user by ID', { error: error.message, id });
      throw error;
    }
  }

  /**
   * Find user by email (includes password hash for authentication)
   * @param {string} email - User email
   * @returns {Promise<Object|null>} User object or null
   */
  static async findByEmail(email) {
    try {
      const sql = 'SELECT * FROM users WHERE email = $1';
      const result = await query(sql, [email.toLowerCase()]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding user by email', { error: error.message });
      throw error;
    }
  }

  /**
   * Find user by username
   * @param {string} username - Username
   * @returns {Promise<Object|null>} User object or null
   */
  static async findByUsername(username) {
    try {
      const sql = `
        SELECT id, email, username, full_name, avatar_url, subscription_tier,
               subscription_expires_at, email_verified, created_at, is_active
        FROM users
        WHERE username = $1
      `;
      const result = await query(sql, [username]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding user by username', { error: error.message });
      throw error;
    }
  }

  /**
   * Create new user
   * @param {Object} data - User data
   * @returns {Promise<Object>} Created user (without password hash)
   */
  static async create(data) {
    try {
      // Hash password
      const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

      const sql = `
        INSERT INTO users (email, username, password_hash, full_name)
        VALUES ($1, $2, $3, $4)
        RETURNING id, email, username, full_name, subscription_tier, created_at
      `;
      const values = [
        data.email.toLowerCase(),
        data.username,
        passwordHash,
        data.full_name || null
      ];

      const result = await query(sql, values);
      logger.info('User created', { id: result.rows[0].id, email: data.email });
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // Unique constraint violation
        if (error.constraint === 'users_email_key') {
          throw new Error('Email already exists');
        }
        if (error.constraint === 'users_username_key') {
          throw new Error('Username already exists');
        }
      }
      logger.error('Error creating user', { error: error.message, data });
      throw error;
    }
  }

  /**
   * Verify user password
   * @param {string} email - User email
   * @param {string} password - Plain text password
   * @returns {Promise<Object|null>} User object if password correct, null otherwise
   */
  static async verifyPassword(email, password) {
    try {
      const user = await this.findByEmail(email);
      if (!user) {
        return null;
      }

      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        return null;
      }

      // Update last login
      await query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

      // Return user without password hash
      delete user.password_hash;
      return user;
    } catch (error) {
      logger.error('Error verifying password', { error: error.message });
      throw error;
    }
  }

  /**
   * Update user
   * @param {number} id - User ID
   * @param {Object} data - Updated data
   * @returns {Promise<Object|null>} Updated user or null
   */
  static async update(id, data) {
    try {
      const allowedFields = ['full_name', 'avatar_url', 'email_verified', 'two_factor_enabled', 'is_active'];
      const updates = [];
      const values = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(data)) {
        if (allowedFields.includes(key) && value !== undefined) {
          updates.push(`${key} = $${paramIndex++}`);
          values.push(value);
        }
      }

      // Handle password update separately
      if (data.password) {
        const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
        updates.push(`password_hash = $${paramIndex++}`);
        values.push(passwordHash);
      }

      if (updates.length === 0) {
        return await this.findById(id);
      }

      values.push(id);
      const sql = `
        UPDATE users
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, email, username, full_name, avatar_url, subscription_tier,
                  subscription_expires_at, email_verified, two_factor_enabled, is_active
      `;

      const result = await query(sql, values);
      logger.info('User updated', { id });
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error updating user', { error: error.message, id, data });
      throw error;
    }
  }

  /**
   * Update subscription tier
   * @param {number} id - User ID
   * @param {string} tier - Subscription tier
   * @param {Date} expiresAt - Expiration date
   * @returns {Promise<Object|null>} Updated user or null
   */
  static async updateSubscription(id, tier, expiresAt) {
    try {
      const sql = `
        UPDATE users
        SET subscription_tier = $1, subscription_expires_at = $2
        WHERE id = $3
        RETURNING id, email, username, subscription_tier, subscription_expires_at
      `;
      const result = await query(sql, [tier, expiresAt, id]);
      logger.info('User subscription updated', { id, tier });
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error updating subscription', { error: error.message, id, tier });
      throw error;
    }
  }

  /**
   * Delete user
   * @param {number} id - User ID
   * @returns {Promise<boolean>} Success status
   */
  static async delete(id) {
    try {
      const sql = 'DELETE FROM users WHERE id = $1';
      await query(sql, [id]);
      logger.info('User deleted', { id });
      return true;
    } catch (error) {
      logger.error('Error deleting user', { error: error.message, id });
      throw error;
    }
  }
}

module.exports = User;
