import User from '../models/User.js';
import { twoFactorUtils, sessionUtils } from '../utils/authUtils.js';
import AppError from '../utils/AppError.js';
import { sendEmail } from '../services/emailService.js';
import { sendSMS } from '../services/smsService.js';

/**
 * Setup Two-Factor Authentication
 */
export const setupTwoFactor = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    // Find user
    const user = await User.findById(userId);

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    if (user.twoFactorEnabled) {
      return next(new AppError('Two-factor authentication is already enabled', 400));
    }

    // Generate 2FA secret
    const secret = twoFactorUtils.generateSecret(user.email);

    // Generate QR code
    const qrCode = await twoFactorUtils.generateQRCode(secret);

    // Generate backup codes
    const backupCodes = twoFactorUtils.generateBackupCodes();

    // Store secret temporarily (not enabled until verified)
    user.twoFactorSecret = secret.base32;
    user.twoFactorBackupCodes = backupCodes.map(code => ({
      code,
      used: false
    }));
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Two-factor authentication setup initiated',
      data: {
        qrCode,
        secret: secret.base32,
        backupCodes,
        manualEntryKey: secret.base32
      }
    });

  } catch (error) {
    console.error('2FA setup error:', error);
    next(new AppError('Failed to setup two-factor authentication', 500));
  }
};

/**
 * Verify and enable Two-Factor Authentication
 */
export const verifyTwoFactorSetup = async (req, res, next) => {
  try {
    const { token } = req.body;
    const userId = req.user.userId;

    if (!token) {
      return next(new AppError('Authentication token is required', 400));
    }

    // Find user
    const user = await User.findById(userId);

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    if (!user.twoFactorSecret) {
      return next(new AppError('Two-factor authentication setup not initiated', 400));
    }

    if (user.twoFactorEnabled) {
      return next(new AppError('Two-factor authentication is already enabled', 400));
    }

    // Verify the token
    const isTokenValid = twoFactorUtils.verifyToken(token, user.twoFactorSecret);

    if (!isTokenValid) {
      return next(new AppError('Invalid authentication token', 400));
    }

    // Enable 2FA
    user.twoFactorEnabled = true;
    user.twoFactorEnabledAt = new Date();
    await user.save();

    // Send confirmation email
    try {
      await sendEmail({
        to: user.email,
        subject: 'Two-Factor Authentication Enabled',
        template: 'twoFactorEnabled',
        data: {
          firstName: user.firstName,
          enabledAt: new Date().toLocaleString()
        }
      });
    } catch (emailError) {
      console.error('Failed to send 2FA confirmation email:', emailError);
    }

    res.status(200).json({
      success: true,
      message: 'Two-factor authentication enabled successfully'
    });

  } catch (error) {
    console.error('2FA verification error:', error);
    next(new AppError('Failed to verify two-factor authentication', 500));
  }
};

/**
 * Disable Two-Factor Authentication
 */
export const disableTwoFactor = async (req, res, next) => {
  try {
    const { password, token } = req.body;
    const userId = req.user.userId;

    if (!password) {
      return next(new AppError('Password is required to disable 2FA', 400));
    }

    // Find user and include password
    const user = await User.findById(userId).select('+password');

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    if (!user.twoFactorEnabled) {
      return next(new AppError('Two-factor authentication is not enabled', 400));
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return next(new AppError('Invalid password', 400));
    }

    // Verify 2FA token if provided, or require it
    if (!token) {
      return next(new AppError('Two-factor authentication token is required', 400));
    }

    const isTokenValid = twoFactorUtils.verifyToken(token, user.twoFactorSecret);

    if (!isTokenValid) {
      // Check if it's a backup code
      const backupCodeIndex = user.twoFactorBackupCodes.findIndex(
        code => code.code === token && !code.used
      );

      if (backupCodeIndex === -1) {
        return next(new AppError('Invalid authentication token', 400));
      }

      // Mark backup code as used
      user.twoFactorBackupCodes[backupCodeIndex].used = true;
      user.twoFactorBackupCodes[backupCodeIndex].usedAt = new Date();
    }

    // Disable 2FA
    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.twoFactorBackupCodes = [];
    user.twoFactorEnabledAt = undefined;
    await user.save();

    // Send confirmation email
    try {
      await sendEmail({
        to: user.email,
        subject: 'Two-Factor Authentication Disabled',
        template: 'twoFactorDisabled',
        data: {
          firstName: user.firstName,
          disabledAt: new Date().toLocaleString()
        }
      });
    } catch (emailError) {
      console.error('Failed to send 2FA disabled email:', emailError);
    }

    res.status(200).json({
      success: true,
      message: 'Two-factor authentication disabled successfully'
    });

  } catch (error) {
    console.error('2FA disable error:', error);
    next(new AppError('Failed to disable two-factor authentication', 500));
  }
};

/**
 * Generate new backup codes
 */
export const generateNewBackupCodes = async (req, res, next) => {
  try {
    const { password, token } = req.body;
    const userId = req.user.userId;

    if (!password) {
      return next(new AppError('Password is required', 400));
    }

    // Find user and include password
    const user = await User.findById(userId).select('+password');

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    if (!user.twoFactorEnabled) {
      return next(new AppError('Two-factor authentication is not enabled', 400));
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return next(new AppError('Invalid password', 400));
    }

    // Verify 2FA token
    if (!token) {
      return next(new AppError('Two-factor authentication token is required', 400));
    }

    const isTokenValid = twoFactorUtils.verifyToken(token, user.twoFactorSecret);

    if (!isTokenValid) {
      return next(new AppError('Invalid authentication token', 400));
    }

    // Generate new backup codes
    const newBackupCodes = twoFactorUtils.generateBackupCodes();

    // Replace old backup codes
    user.twoFactorBackupCodes = newBackupCodes.map(code => ({
      code,
      used: false
    }));
    await user.save();

    res.status(200).json({
      success: true,
      message: 'New backup codes generated successfully',
      data: {
        backupCodes: newBackupCodes
      }
    });

  } catch (error) {
    console.error('Backup codes generation error:', error);
    next(new AppError('Failed to generate new backup codes', 500));
  }
};

/**
 * Get Two-Factor Authentication status
 */
export const getTwoFactorStatus = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    // Find user
    const user = await User.findById(userId);

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    const status = {
      enabled: user.twoFactorEnabled,
      enabledAt: user.twoFactorEnabledAt,
      backupCodesCount: user.twoFactorBackupCodes ? user.twoFactorBackupCodes.filter(code => !code.used).length : 0,
      hasSetupInProgress: !!user.twoFactorSecret && !user.twoFactorEnabled
    };

    res.status(200).json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('2FA status error:', error);
    next(new AppError('Failed to get two-factor authentication status', 500));
  }
};

/**
 * Send emergency access code via SMS
 */
export const sendEmergencyAccess = async (req, res, next) => {
  try {
    const { email, phoneNumber } = req.body;

    if (!email || !phoneNumber) {
      return next(new AppError('Email and phone number are required', 400));
    }

    // Find user
    const user = await User.findOne({ 
      email: email.toLowerCase(),
      phoneNumber: phoneNumber
    });

    if (!user) {
      // Don't reveal whether user exists
      return res.status(200).json({
        success: true,
        message: 'If the provided information matches our records, an emergency access code has been sent.'
      });
    }

    if (!user.twoFactorEnabled) {
      return res.status(200).json({
        success: true,
        message: 'If the provided information matches our records, an emergency access code has been sent.'
      });
    }

    // Generate emergency access code
    const emergencyCode = twoFactorUtils.generateEmergencyCode();
    const { token: emergencyToken, expires: emergencyExpires } = 
      sessionUtils.generateVerificationToken(1); // 1 hour expiry

    // Store emergency access details
    user.emergencyAccessCode = emergencyCode;
    user.emergencyAccessToken = emergencyToken;
    user.emergencyAccessExpires = emergencyExpires;
    await user.save();

    // Send SMS with emergency code
    try {
      await sendSMS({
        to: user.phoneNumber,
        message: `Your emergency access code is: ${emergencyCode}. This code expires in 1 hour. Do not share this code with anyone.`
      });
    } catch (smsError) {
      console.error('Failed to send emergency SMS:', smsError);
      return next(new AppError('Failed to send emergency access code', 500));
    }

    res.status(200).json({
      success: true,
      message: 'If the provided information matches our records, an emergency access code has been sent.',
      data: {
        emergencyToken // Frontend needs this to verify the emergency code
      }
    });

  } catch (error) {
    console.error('Emergency access error:', error);
    next(new AppError('Failed to process emergency access request', 500));
  }
};

/**
 * Verify emergency access code and temporarily disable 2FA
 */
export const verifyEmergencyAccess = async (req, res, next) => {
  try {
    const { emergencyToken, emergencyCode, newPassword } = req.body;

    if (!emergencyToken || !emergencyCode || !newPassword) {
      return next(new AppError('Emergency token, code, and new password are required', 400));
    }

    // Find user with valid emergency access
    const user = await User.findOne({
      emergencyAccessToken: emergencyToken,
      emergencyAccessCode: emergencyCode,
      emergencyAccessExpires: { $gt: new Date() }
    });

    if (!user) {
      return next(new AppError('Invalid or expired emergency access code', 400));
    }

    // Validate new password
    const passwordValidation = passwordUtils.validate(newPassword);
    if (!passwordValidation.isValid) {
      return next(new AppError(passwordValidation.errors.join(', '), 400));
    }

    // Update password and temporarily disable 2FA
    user.password = newPassword;
    user.passwordChangedAt = new Date();
    user.twoFactorEnabled = false;
    user.emergencyAccessCode = undefined;
    user.emergencyAccessToken = undefined;
    user.emergencyAccessExpires = undefined;
    
    // Clear login attempts
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    
    await user.save();

    // Send security alert email
    try {
      await sendEmail({
        to: user.email,
        subject: 'Security Alert: Emergency Access Used',
        template: 'emergencyAccessUsed',
        data: {
          firstName: user.firstName,
          accessTime: new Date().toLocaleString(),
          ipAddress: req.ip
        }
      });
    } catch (emailError) {
      console.error('Failed to send emergency access alert:', emailError);
    }

    res.status(200).json({
      success: true,
      message: 'Emergency access verified. Two-factor authentication has been temporarily disabled. Please re-enable it as soon as possible.'
    });

  } catch (error) {
    console.error('Emergency access verification error:', error);
    next(new AppError('Failed to verify emergency access', 500));
  }
};

export default {
  setupTwoFactor,
  verifyTwoFactorSetup,
  disableTwoFactor,
  generateNewBackupCodes,
  getTwoFactorStatus,
  sendEmergencyAccess,
  verifyEmergencyAccess
};
