import express from 'express';
import rateLimit from 'express-rate-limit';
import { authLimiter as sharedAuthLimiter, generalLimiter as sharedGeneralLimiter } from '../middleware/security.js';
import authController from '../controllers/authController.js';
import twoFactorController from '../controllers/twoFactorController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
// import { validateRequest } from '../middleware/validationMiddleware.js';
// import { body, query } from 'express-validator';
import User from '../models/User.js';

const router = express.Router();

// Rate limiting for authentication routes (env-configurable via shared middleware)
const authLimiter = sharedAuthLimiter;
const generalLimiter = sharedGeneralLimiter;

// Validation rules
// All validation rules are disabled. All fields are optional, no validation enforced for registration, login, password reset, or any authentication route.

// Authentication Routes
router.post('/register', authLimiter, authController.register);
// In development, relax login rate limiting to reduce 429s
const loginHandlers = [authController.login];
if (process.env.NODE_ENV !== 'development') {
  loginHandlers.unshift(authLimiter);
}
router.post('/login', ...loginHandlers);
router.post('/refresh-token', generalLimiter, authController.refreshToken);

router.post('/logout', 
  authenticate, 
  authController.logout
);

// Email verification routes
router.get('/verify-email', generalLimiter, authController.verifyEmail);

router.post('/resend-verification', generalLimiter, authController.resendEmailVerification);

// Password reset routes
router.post('/request-password-reset', generalLimiter, authController.requestPasswordReset);

router.post('/reset-password', authLimiter, authController.resetPassword);

router.post('/change-password', authenticate, authController.changePassword);

// Two-Factor Authentication Routes
router.post('/2fa/setup', 
  authenticate, 
  twoFactorController.setupTwoFactor
);

router.post('/2fa/verify-setup', authenticate, twoFactorController.verifyTwoFactorSetup);

router.post('/2fa/disable', authenticate, twoFactorController.disableTwoFactor);

router.post('/2fa/backup-codes', authenticate, twoFactorController.generateNewBackupCodes);

router.get('/2fa/status', 
  authenticate, 
  twoFactorController.getTwoFactorStatus
);

// Emergency access routes
router.post('/emergency-access/request', authLimiter, twoFactorController.sendEmergencyAccess);

router.post('/emergency-access/verify', authLimiter, twoFactorController.verifyEmergencyAccess);

// Protected route to get current user
router.get('/me', 
  authenticate, 
  async (req, res) => {
    try {
      // req.user is already the full user object from the auth middleware
      const user = await User.findById(req.user._id)
        .select('-password -twoFactorAuth.secret')
        .populate('doctorProfile');
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      res.status(200).json({
        success: true,
        data: { user }
      });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user profile'
      });
    }
  }
);

// Admin only test route
router.get('/admin-only', 
  authenticate, 
  authorize(['admin']), 
  (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Admin access granted',
      data: {
        user: req.user
      }
    });
  }
);

// Pharmacy only test route
router.get('/pharmacy-only', 
  authenticate, 
  authorize(['pharmacy', 'admin']), 
  (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Pharmacy access granted',
      data: {
        user: req.user
      }
    });
  }
);

export default router;
