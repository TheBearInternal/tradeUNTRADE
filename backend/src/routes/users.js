const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');
const { authenticate } = require('../middleware/auth');
const { body } = require('express-validator');
const { validate } = require('../middleware/validation');
const logger = require('../utils/logger');

/**
 * PATCH /api/v1/users/password
 * Change user password
 */
router.patch(
  '/password',
  authenticate,
  [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('New password must be at least 8 characters with uppercase, lowercase, and number'),
  ],
  validate,
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;

      // Get user with password hash
      const userWithPassword = await User.findByEmail(req.user.email);

      if (!userWithPassword) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Verify current password
      const isValid = await bcrypt.compare(currentPassword, userWithPassword.password_hash);

      if (!isValid) {
        return res.status(401).json({
          success: false,
          error: 'Current password is incorrect'
        });
      }

      // Check that new password is different from current
      const isSamePassword = await bcrypt.compare(newPassword, userWithPassword.password_hash);
      if (isSamePassword) {
        return res.status(400).json({
          success: false,
          error: 'New password must be different from current password'
        });
      }

      // Update password
      await User.update(userId, { password: newPassword });

      logger.info('Password changed successfully', { userId });

      res.json({
        success: true,
        message: 'Password updated successfully'
      });
    } catch (error) {
      logger.error('Password change error', {
        error: error.message,
        userId: req.user?.id,
        stack: error.stack
      });
      res.status(500).json({
        success: false,
        error: 'Failed to change password'
      });
    }
  }
);

/**
 * PATCH /api/v1/users/preferences
 * Update user preferences
 */
router.patch(
  '/preferences',
  authenticate,
  [
    body('emailNotifications')
      .optional()
      .isBoolean()
      .withMessage('emailNotifications must be a boolean'),
    body('defaultView')
      .optional()
      .isIn(['recent_transactions', 'top_traders', 'most_traded_stocks'])
      .withMessage('Invalid default view option'),
  ],
  validate,
  async (req, res) => {
    try {
      const { emailNotifications, defaultView } = req.body;
      const userId = req.user.id;

      // Build update object
      const updates = {};
      if (emailNotifications !== undefined) {
        updates.email_notifications = emailNotifications;
      }
      if (defaultView !== undefined) {
        updates.default_view = defaultView;
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No preferences provided to update'
        });
      }

      // Update preferences in database
      const { query } = require('../config/database');

      const fields = Object.keys(updates);
      const values = Object.values(updates);
      const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');

      const sql = `
        UPDATE users
        SET ${setClause}
        WHERE id = $${fields.length + 1}
        RETURNING id, email, username, full_name, email_notifications, default_view
      `;

      const result = await query(sql, [...values, userId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      logger.info('User preferences updated', { userId, updates });

      res.json({
        success: true,
        message: 'Preferences saved successfully',
        data: {
          preferences: {
            emailNotifications: result.rows[0].email_notifications,
            defaultView: result.rows[0].default_view
          }
        }
      });
    } catch (error) {
      logger.error('Preferences update error', {
        error: error.message,
        userId: req.user?.id,
        stack: error.stack
      });
      res.status(500).json({
        success: false,
        error: 'Failed to update preferences'
      });
    }
  }
);

/**
 * DELETE /api/v1/users/account
 * Delete user account
 */
router.delete(
  '/account',
  authenticate,
  async (req, res) => {
    try {
      const userId = req.user.id;

      // Soft delete - mark account as inactive instead of hard delete
      // This preserves referential integrity for transactions, alerts, etc.
      const { query } = require('../config/database');

      const sql = `
        UPDATE users
        SET is_active = false,
            email = CONCAT(email, '_deleted_', id, '_', EXTRACT(EPOCH FROM NOW())),
            username = CONCAT(username, '_deleted_', id, '_', EXTRACT(EPOCH FROM NOW()))
        WHERE id = $1
        RETURNING id
      `;

      const result = await query(sql, [userId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      logger.info('User account deleted', { userId });

      res.json({
        success: true,
        message: 'Account deleted successfully'
      });
    } catch (error) {
      logger.error('Account deletion error', {
        error: error.message,
        userId: req.user?.id,
        stack: error.stack
      });
      res.status(500).json({
        success: false,
        error: 'Failed to delete account'
      });
    }
  }
);

module.exports = router;
