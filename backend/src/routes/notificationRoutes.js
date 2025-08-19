import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import EmailTrackingService from '../services/notifications/EmailTrackingService.js';
import Notification from '../models/Notification.js';
import NotificationAnalytics from '../models/NotificationAnalytics.js';
import NotificationController from '../controllers/NotificationController.js';
import AdminNotificationController from '../controllers/AdminNotificationController.js';

const router = Router();

// Initialize notification controllers
const notificationController = new NotificationController();
// Compatibility route: some clients request /notifications/user — map it to the same handler
router.get('/user', authenticate, notificationController.getUserNotifications.bind(notificationController));

const adminNotificationController = new AdminNotificationController();

// Initialize email tracking service
const emailTrackingService = new EmailTrackingService();

// ===== USER-FACING NOTIFICATION APIs =====

/**
 * Get notification counts for user (used by sidebar)
 * @route GET /api/notifications/notification-counts
 * @access Private
 */
router.get('/notification-counts', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id || req.user.userId;
    
    const unreadCount = await Notification.countDocuments({
      'recipients.userId': userId,
      'recipients.readAt': { $exists: false }
    });
    
    // Get counts by category for sidebar badges
    const categoryCounts = await Notification.aggregate([
      {
        $match: {
          'recipients.userId': userId,
          'recipients.readAt': { $exists: false }
        }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Format counts for sidebar
    const counts = {
      notifications: unreadCount,
      'prescription-requests': 0,
      appointments: 0,
      reminders: 0,
      'order-tracking': 0
    };
    
    // Map notification types to sidebar categories
    categoryCounts.forEach(item => {
      switch (item._id) {
        case 'prescription_uploaded':
        case 'prescription_ready':
          counts['prescription-requests'] += item.count;
          break;
        case 'appointment_reminder':
        case 'appointment_scheduled':
          counts.appointments += item.count;
          break;
        case 'order_confirmed':
        case 'order_delivered':
        case 'order_out_for_delivery':
          counts['order-tracking'] += item.count;
          break;
        default:
          // Keep in general notifications
          break;
      }
    });
    
    res.json({
      success: true,
      data: counts
    });
  } catch (error) {
    console.error('❌ Get notification counts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get notification counts'
    });
  }
});

/**
 * Get notification statistics for user
 * @route GET /api/notifications/stats
 * @access Private
 */
router.get('/stats', authenticate, notificationController.getNotificationStats.bind(notificationController));

/**
 * Search notifications
 * @route GET /api/notifications/search
 * @access Private
 */
router.get('/search', authenticate, notificationController.searchNotifications.bind(notificationController));

/**
 * Mark multiple notifications as read
 * @route POST /api/notifications/mark-read
 * @access Private
 */
router.post('/mark-read', authenticate, notificationController.markMultipleAsRead.bind(notificationController));

/**
 * Mark all notifications as read
 * @route POST /api/notifications/mark-all-read
 * @access Private
 */
router.post('/mark-all-read', authenticate, notificationController.markAllAsRead.bind(notificationController));

/**
 * Get user notifications with pagination and filtering
 * @route GET /api/notifications
 * @access Private
 */
router.get('/', authenticate, notificationController.getUserNotifications.bind(notificationController));

/**
 * Get single notification details
 * @route GET /api/notifications/:notificationId
 * @access Private
 * NOTE: Constrain :notificationId to 24-hex ObjectId to avoid accidental matching of literal paths (e.g. 'user')
 */
router.get('/:notificationId([0-9a-fA-F]{24})', authenticate, notificationController.getNotificationById.bind(notificationController));

/**
 * Mark notification as read
 * @route POST /api/notifications/:notificationId/read
 * @access Private
 */
router.post('/:notificationId/read', authenticate, notificationController.markAsRead.bind(notificationController));

/**
 * Record notification action
 * @route POST /api/notifications/:notificationId/action
 * @access Private
 */
router.post('/:notificationId/action', authenticate, notificationController.recordAction.bind(notificationController));

/**
 * Delete notification (soft delete - mark as dismissed)
 * @route DELETE /api/notifications/:notificationId
 * @access Private
 */
router.delete('/:notificationId', authenticate, notificationController.deleteNotification.bind(notificationController));

// ===== ADMIN NOTIFICATION MANAGEMENT APIs =====

/**
 * Get system-wide notification overview
 * @route GET /api/notifications/admin/overview
 * @access Private (Admin)
 */
router.get('/admin/overview', authenticate, authorize(['admin']), adminNotificationController.getSystemOverview.bind(adminNotificationController));

/**
 * Get all notifications with admin filters
 * @route GET /api/notifications/admin/all
 * @access Private (Admin)
 */
router.get('/admin/all', authenticate, authorize(['admin']), adminNotificationController.getAllNotifications.bind(adminNotificationController));

/**
 * Send bulk notification to multiple users
 * @route POST /api/notifications/admin/bulk
 * @access Private (Admin)
 */
router.post('/admin/bulk', authenticate, authorize(['admin']), adminNotificationController.sendBulkNotification.bind(adminNotificationController));

/**
 * Send notification to all users of a specific role
 * @route POST /api/notifications/admin/broadcast
 * @access Private (Admin)
 */
router.post('/admin/broadcast', authenticate, authorize(['admin']), adminNotificationController.broadcastNotification.bind(adminNotificationController));

/**
 * Send emergency notification with preference override
 * @route POST /api/notifications/admin/emergency-override
 * @access Private (Admin)
 */
router.post('/admin/emergency-override', authenticate, authorize(['admin']), adminNotificationController.emergencyOverride.bind(adminNotificationController));

/**
 * Get notification templates
 * @route GET /api/notifications/admin/templates
 * @access Private (Admin)
 */
router.get('/admin/templates', authenticate, authorize(['admin']), adminNotificationController.getNotificationTemplates.bind(adminNotificationController));

/**
 * Create or update notification template
 * @route POST /api/notifications/admin/templates
 * @access Private (Admin)
 */
router.post('/admin/templates', authenticate, authorize(['admin']), adminNotificationController.createOrUpdateTemplate.bind(adminNotificationController));

/**
 * Delete notification template
 * @route DELETE /api/notifications/admin/templates/:templateId
 * @access Private (Admin)
 */
router.delete('/admin/templates/:templateId', authenticate, authorize(['admin']), adminNotificationController.deleteTemplate.bind(adminNotificationController));

/**
 * Get user notification preferences (admin view)
 * @route GET /api/notifications/admin/preferences/:userId
 * @access Private (Admin)
 */
router.get('/admin/preferences/:userId', authenticate, authorize(['admin']), adminNotificationController.getUserPreferences.bind(adminNotificationController));

/**
 * Update user notification preferences (admin override)
 * @route PUT /api/notifications/admin/preferences/:userId
 * @access Private (Admin)
 */
router.put('/admin/preferences/:userId', authenticate, authorize(['admin']), adminNotificationController.updateUserPreferences.bind(adminNotificationController));

/**
 * Retry failed notification delivery
 * @route POST /api/notifications/admin/:notificationId/retry
 * @access Private (Admin)
 */
router.post('/admin/:notificationId/retry', authenticate, authorize(['admin']), adminNotificationController.retryNotification.bind(adminNotificationController));

/**
 * Cancel scheduled notification
 * @route POST /api/notifications/admin/:notificationId/cancel
 * @access Private (Admin)
 */
router.post('/admin/:notificationId/cancel', authenticate, authorize(['admin']), adminNotificationController.cancelNotification.bind(adminNotificationController));

// ===== EMAIL TRACKING AND WEBHOOK APIs =====

/**
 * Email tracking pixel endpoint
 * @route GET /api/notifications/track/open/:trackingId.png
 * @access Public
 */
router.get('/track/open/:trackingId.png', async (req, res) => {
  try {
    const { trackingId } = req.params;
    
    // Track the email open
    const result = await emailTrackingService.trackEmailOpen(trackingId);
    
    // Return a 1x1 transparent pixel
    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    );
    
    res.set({
      'Content-Type': 'image/png',
      'Content-Length': pixel.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    res.send(pixel);
    
  } catch (error) {
    console.error('❌ Email tracking pixel error:', error);
    
    // Still return a pixel even on error
    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    );
    
    res.set({
      'Content-Type': 'image/png',
      'Content-Length': pixel.length
    });
    
    res.send(pixel);
  }
});

/**
 * Email click tracking endpoint
 * @route GET /api/notifications/track/click/:clickId
 * @access Public
 */
router.get('/track/click/:clickId', async (req, res) => {
  try {
    const { clickId } = req.params;
    
    // Track the email click
    const result = await emailTrackingService.trackEmailClick(clickId);
    
    if (result.success && result.redirectUrl) {
      // Redirect to the original URL
      res.redirect(302, result.redirectUrl);
    } else {
      res.status(404).json({
        success: false,
        message: 'Invalid or expired tracking link'
      });
    }
    
  } catch (error) {
    console.error('❌ Email click tracking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process click tracking'
    });
  }
});

/**
 * Unsubscribe endpoint
 * @route GET /api/notifications/unsubscribe/:token
 * @access Public
 */
router.get('/unsubscribe/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    // Handle unsubscribe
    const result = await emailTrackingService.handleUnsubscribe(token);
    
    if (result.success) {
      // Return a simple HTML page confirming unsubscribe
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Unsubscribed Successfully</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
            .success { color: #28a745; }
            .container { text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="success">✓ Unsubscribed Successfully</h1>
            <p>You have been successfully unsubscribed from ${result.notificationType === 'all' ? 'all notifications' : result.notificationType + ' notifications'}.</p>
            <p>If you change your mind, you can update your notification preferences in your account settings.</p>
          </div>
        </body>
        </html>
      `;
      
      res.send(html);
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'Failed to process unsubscribe request'
      });
    }
    
  } catch (error) {
    console.error('❌ Unsubscribe error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process unsubscribe request'
    });
  }
});

/**
 * SendGrid webhook endpoint
 * @route POST /api/notifications/webhooks/sendgrid
 * @access Public (webhook)
 */
router.post('/webhooks/sendgrid', async (req, res) => {
  try {
    const webhookData = req.body;
    
    // Verify webhook signature if configured
    if (process.env.SENDGRID_WEBHOOK_SECRET) {
      const signature = req.headers['x-twilio-email-event-webhook-signature'];
      // Add signature verification logic here if needed
    }
    
    // Process webhook
    const result = await emailTrackingService.handleDeliveryWebhook('sendgrid', webhookData);
    
    if (result.success) {
      res.status(200).json({ success: true, processed: result.eventsProcessed });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
    
  } catch (error) {
    console.error('❌ SendGrid webhook error:', error);
    res.status(500).json({ success: false, error: 'Webhook processing failed' });
  }
});

/**
 * AWS SES webhook endpoint
 * @route POST /api/notifications/webhooks/aws-ses
 * @access Public (webhook)
 */
router.post('/webhooks/aws-ses', async (req, res) => {
  try {
    const webhookData = req.body;
    
    // Handle SNS subscription confirmation
    if (webhookData.Type === 'SubscriptionConfirmation') {
      // In production, you would verify and confirm the subscription
      console.log('📧 AWS SES SNS subscription confirmation received');
      res.status(200).json({ success: true, message: 'Subscription confirmed' });
      return;
    }
    
    // Process webhook
    const result = await emailTrackingService.handleDeliveryWebhook('aws-ses', webhookData);
    
    if (result.success) {
      res.status(200).json({ success: true, processed: result.eventsProcessed });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
    
  } catch (error) {
    console.error('❌ AWS SES webhook error:', error);
    res.status(500).json({ success: false, error: 'Webhook processing failed' });
  }
});

/**
 * Get email delivery analytics
 * @route GET /api/notifications/analytics/email
 * @access Private (Admin)
 */
router.get('/analytics/email', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      provider,
      notificationType,
      userRole
    } = req.query;
    
    const filters = {};
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    if (provider) filters.provider = provider;
    if (notificationType) filters.notificationType = notificationType;
    if (userRole) filters.userRole = userRole;
    
    const report = await emailTrackingService.generateDeliveryReport(filters);
    
    res.json({
      success: true,
      data: report
    });
    
  } catch (error) {
    console.error('❌ Email analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate email analytics report'
    });
  }
});

/**
 * Get real-time email delivery statistics
 * @route GET /api/notifications/analytics/email/realtime
 * @access Private (Admin)
 */
router.get('/analytics/email/realtime', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const stats = emailTrackingService.getRealtimeStats();
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('❌ Real-time email stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get real-time email statistics'
    });
  }
});



/**
 * Test email tracking (development only)
 * @route POST /api/notifications/test/email-tracking
 * @access Private (Admin, development only)
 */
if (process.env.NODE_ENV === 'development') {
  router.post('/test/email-tracking', authenticate, authorize(['admin']), async (req, res) => {
    try {
      const { messageId, userId, notificationId } = req.body;
      
      // Generate test tracking URLs
      const trackingPixelUrl = emailTrackingService.generateTrackingPixelUrl(
        messageId || 'test-message-' + Date.now(),
        userId || req.user.id,
        notificationId || 'test-notification-' + Date.now()
      );
      
      const trackableLink = emailTrackingService.generateTrackableLink(
        'https://example.com/test-link',
        messageId || 'test-message-' + Date.now(),
        userId || req.user.id,
        notificationId || 'test-notification-' + Date.now()
      );
      
      const unsubscribeLink = emailTrackingService.generateUnsubscribeLink(
        userId || req.user.id,
        'test_notifications'
      );
      
      res.json({
        success: true,
        data: {
          trackingPixelUrl,
          trackableLink,
          unsubscribeLink
        }
      });
      
    } catch (error) {
      console.error('❌ Test email tracking error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate test tracking URLs'
      });
    }
  });
}

export default router;