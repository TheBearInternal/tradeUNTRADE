const express = require('express');
const router = express.Router();
const User = require('../models/User');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  authenticate
} = require('../middleware/auth');
const { authRateLimiter } = require('../middleware/rateLimit');
const { validationRules, validate } = require('../middleware/validation');
const logger = require('../utils/logger');

/**
 * POST /api/v1/auth/register
 * Register a new user account
 */
router.post(
  '/register',
  authRateLimiter,
  validationRules.register,
  validate,
  async (req, res) => {
    try {
      const { email, username, password, full_name } = req.body;

      // Create user
      const user = await User.create({
        email,
        username,
        password,
        full_name
      });

      // Generate tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      logger.info('User registered successfully', { userId: user.id, email: user.email });

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            full_name: user.full_name,
            subscription_tier: user.subscription_tier
          },
          accessToken,
          refreshToken
        }
      });
    } catch (error) {
      if (error.message === 'Email already exists') {
        return res.status(409).json({
          success: false,
          error: 'Email already exists'
        });
      }
      if (error.message === 'Username already exists') {
        return res.status(409).json({
          success: false,
          error: 'Username already exists'
        });
      }

      logger.error('Registration error', { error: error.message, stack: error.stack });
      res.status(500).json({
        success: false,
        error: 'Registration failed'
      });
    }
  }
);

/**
 * POST /api/v1/auth/login
 * Authenticate user and return JWT tokens
 */
router.post(
  '/login',
  authRateLimiter,
  validationRules.login,
  validate,
  async (req, res) => {
    try {
      const { email, password } = req.body;

      // Verify credentials
      const user = await User.verifyPassword(email, password);

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        });
      }

      if (!user.is_active) {
        return res.status(403).json({
          success: false,
          error: 'Account is disabled'
        });
      }

      // Generate tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      logger.info('User logged in successfully', { userId: user.id, email: user.email });

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            full_name: user.full_name,
            subscription_tier: user.subscription_tier,
            avatar_url: user.avatar_url
          },
          accessToken,
          refreshToken
        }
      });
    } catch (error) {
      logger.error('Login error', { error: error.message, stack: error.stack });
      res.status(500).json({
        success: false,
        error: 'Login failed'
      });
    }
  }
);

/**
 * POST /api/v1/auth/refresh-token
 * Get new access token using refresh token
 */
router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Get user
    const user = await User.findById(decoded.id);

    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token'
      });
    }

    // Generate new access token
    const accessToken = generateAccessToken(user);

    res.json({
      success: true,
      data: {
        accessToken
      }
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Refresh token expired'
      });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token'
      });
    }

    logger.error('Refresh token error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Token refresh failed'
    });
  }
});

/**
 * GET /api/v1/auth/me
 * Get current user profile
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user
      }
    });
  } catch (error) {
    logger.error('Get profile error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get profile'
    });
  }
});

/**
 * POST /api/v1/auth/logout
 * Logout user (client should discard tokens)
 */
router.post('/logout', authenticate, async (req, res) => {
  try {
    // In a production system, you might want to:
    // 1. Add token to a blacklist in Redis
    // 2. Clear any server-side session data
    // For now, we rely on client-side token removal

    logger.info('User logged out', { userId: req.user.id });

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('Logout error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
  }
});

module.exports = router;
