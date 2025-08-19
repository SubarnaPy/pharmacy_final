import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import NotificationPreferencesController from '../controllers/NotificationPreferencesController.js';

const router = Router();

/**
 * Get current user's notification preferences
 * @route GET /api/notification-preferences
 * @access Private
 */
router.get('/', authenticate, NotificationPreferencesController.getUserPreferences);

/**
 * Update current user's notification preferences
 * @route PUT /api/notification-preferences
 * @access Private
 */
router.put('/', authenticate, NotificationPreferencesController.updateUserPreferences);

/**
 * Reset current user's notification preferences to defaults
 * @route POST /api/notification-preferences/reset
 * @access Private
 */
router.post('/reset', authenticate, NotificationPreferencesController.resetUserPreferences);

/**
 * Update specific notification type preference
 * @route PATCH /api/notification-preferences/types/:notificationType
 * @access Private
 */
router.patch('/types/:notificationType', authenticate, NotificationPreferencesController.updateNotificationTypePreference);

/**
 * Update specific channel preference
 * @route PATCH /api/notification-preferences/channels/:channel
 * @access Private
 */
router.patch('/channels/:channel', authenticate, NotificationPreferencesController.updateChannelPreference);

/**
 * Get preferences for multiple users (Admin only)
 * @route GET /api/notification-preferences/users
 * @access Private (Admin)
 */
router.get('/users', authenticate, authorize(['admin']), NotificationPreferencesController.getMultipleUserPreferences);

/**
 * Bulk update preferences for multiple users (Admin only)
 * @route PUT /api/notification-preferences/bulk
 * @access Private (Admin)
 */
router.put('/bulk', authenticate, authorize(['admin']), NotificationPreferencesController.bulkUpdatePreferences);

/**
 * Migrate preferences for schema updates (Admin only)
 * @route POST /api/notification-preferences/migrate
 * @access Private (Admin)
 */
router.post('/migrate', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { userId } = req.body;
    const result = await NotificationPreferencesController.migratePreferences(userId);
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('❌ Preferences migration route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to migrate preferences'
    });
  }
});

export default router;