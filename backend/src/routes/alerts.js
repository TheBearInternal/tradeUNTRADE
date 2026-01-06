const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');
const Asset = require('../models/Asset');
const { authenticate } = require('../middleware/auth');
const { dynamicRateLimiter } = require('../middleware/rateLimit');
const { validationRules, validate } = require('../middleware/validation');
const logger = require('../utils/logger');

/**
 * GET /api/v1/alerts
 * Get all alerts for authenticated user
 */
router.get(
  '/',
  authenticate,
  dynamicRateLimiter,
  async (req, res) => {
    try {
      const alerts = await Alert.findByUserId(req.user.id);

      res.json({
        success: true,
        data: alerts,
        count: alerts.length
      });
    } catch (error) {
      logger.error('Error fetching alerts', { error: error.message, userId: req.user.id });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch alerts'
      });
    }
  }
);

/**
 * POST /api/v1/alerts
 * Create new alert
 */
router.post(
  '/',
  authenticate,
  dynamicRateLimiter,
  validationRules.createAlert,
  validate,
  async (req, res) => {
    try {
      const {
        alert_type,
        politician_id,
        ticker,
        sector,
        notify_email,
        notify_push,
        notify_sms,
        min_transaction_amount,
        transaction_types
      } = req.body;

      const alertData = {
        user_id: req.user.id,
        alert_type,
        notify_email,
        notify_push,
        notify_sms,
        min_transaction_amount,
        transaction_types
      };

      // Handle different alert types
      if (alert_type === 'politician') {
        alertData.politician_id = politician_id;
      } else if (alert_type === 'ticker') {
        // Find or create asset
        const asset = await Asset.findOrCreate({ ticker: ticker.toUpperCase() });
        if (!asset) {
          return res.status(400).json({
            success: false,
            error: 'Invalid ticker symbol'
          });
        }
        alertData.asset_id = asset.id;
      } else if (alert_type === 'sector') {
        alertData.sector = sector;
      }

      const alert = await Alert.create(alertData);

      logger.info('Alert created', { alertId: alert.id, userId: req.user.id, type: alert_type });

      res.status(201).json({
        success: true,
        data: alert
      });
    } catch (error) {
      if (error.message === 'Alert already exists') {
        return res.status(409).json({
          success: false,
          error: 'Alert already exists'
        });
      }

      logger.error('Error creating alert', { error: error.message, userId: req.user.id });
      res.status(500).json({
        success: false,
        error: 'Failed to create alert'
      });
    }
  }
);

/**
 * PUT /api/v1/alerts/:id
 * Update alert
 */
router.put(
  '/:id',
  authenticate,
  dynamicRateLimiter,
  validationRules.updateAlert,
  validate,
  async (req, res) => {
    try {
      const { id } = req.params;
      const {
        notify_email,
        notify_push,
        notify_sms,
        min_transaction_amount,
        transaction_types,
        is_active
      } = req.body;

      const updateData = {};
      if (notify_email !== undefined) updateData.notify_email = notify_email;
      if (notify_push !== undefined) updateData.notify_push = notify_push;
      if (notify_sms !== undefined) updateData.notify_sms = notify_sms;
      if (min_transaction_amount !== undefined) updateData.min_transaction_amount = min_transaction_amount;
      if (transaction_types !== undefined) updateData.transaction_types = transaction_types;
      if (is_active !== undefined) updateData.is_active = is_active;

      const alert = await Alert.update(parseInt(id), req.user.id, updateData);

      if (!alert) {
        return res.status(404).json({
          success: false,
          error: 'Alert not found or unauthorized'
        });
      }

      logger.info('Alert updated', { alertId: id, userId: req.user.id });

      res.json({
        success: true,
        data: alert
      });
    } catch (error) {
      logger.error('Error updating alert', { error: error.message, alertId: req.params.id, userId: req.user.id });
      res.status(500).json({
        success: false,
        error: 'Failed to update alert'
      });
    }
  }
);

/**
 * DELETE /api/v1/alerts/:id
 * Delete alert
 */
router.delete(
  '/:id',
  authenticate,
  dynamicRateLimiter,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          success: false,
          error: 'Invalid alert ID'
        });
      }

      const success = await Alert.delete(parseInt(id), req.user.id);

      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'Alert not found or unauthorized'
        });
      }

      logger.info('Alert deleted', { alertId: id, userId: req.user.id });

      res.json({
        success: true,
        message: 'Alert deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting alert', { error: error.message, alertId: req.params.id, userId: req.user.id });
      res.status(500).json({
        success: false,
        error: 'Failed to delete alert'
      });
    }
  }
);

module.exports = router;
