import EventEmitter from 'events';
import Notification from '../../models/Notification.js';
import NotificationTemplate from '../../models/NotificationTemplate.js';
import UserNotificationPreferences from '../../models/UserNotificationPreferences.js';
import NotificationAnalytics from '../../models/NotificationAnalytics.js';
import NotificationQueue from './NotificationQueue.js';
import ChannelManager from './ChannelManager.js';
import EnhancedWebSocketNotificationService from '../realtime/EnhancedWebSocketNotificationService.js';

/**
 * Enhanced Notification Service
 * Comprehensive notification system with multi-channel delivery, templates, and analytics
 */
class EnhancedNotificationService extends EventEmitter {
    constructor(options = {}) {
        super();

        this.webSocketService = options.webSocketService || null;
        this.emailService = options.emailService || null;
        this.smsService = options.smsService || null;

        // Initialize enhanced WebSocket notification service if WebSocket service is available
        if (this.webSocketService) {
            this.enhancedWebSocketService = new EnhancedWebSocketNotificationService(this.webSocketService);

            // Setup event listeners for enhanced WebSocket service
            this.enhancedWebSocketService.on('notificationAcknowledged', (data) => {
                this.handleNotificationAcknowledged(data);
            });

            this.enhancedWebSocketService.on('notificationRead', (data) => {
                this.handleNotificationRead(data);
            });

            this.enhancedWebSocketService.on('userDisconnected', (data) => {
                console.log(`🔌 User disconnected: ${data.userId} (${data.userRole})`);
            });

            this.enhancedWebSocketService.on('userReconnected', (data) => {
                console.log(`🔄 User reconnected: ${data.userId}`);
            });
        } else {
            this.enhancedWebSocketService = null;
        }

        // Initialize notification queue
        this.notificationQueue = new NotificationQueue();

        // Initialize channel manager with enhanced WebSocket service
        this.channelManager = new ChannelManager({
            webSocketService: this.enhancedWebSocketService || this.webSocketService,
            emailService: this.emailService,
            smsService: this.smsService,
            maxRetries: options.maxRetries || 3,
            baseDelay: options.baseDelay || 1000,
            maxDelay: options.maxDelay || 30000
        });

        // Template cache for performance
        this.templateCache = new Map();
        this.preferencesCache = new Map();

        // Analytics tracking
        this.analyticsBuffer = new Map(); // Daily analytics buffer

        this.initialize();
        console.log('✅ Enhanced Notification Service initialized');
    }

    /**
     * Initialize the service
     */
    async initialize() {
        try {
            // Start background processors
            this.startQueueProcessor();
            this.startAnalyticsProcessor();
            this.startScheduledNotificationProcessor();

            // Setup event listeners
            this.setupEventListeners();

            // Load default templates if none exist
            await this.ensureDefaultTemplates();

            console.log('✅ Enhanced Notification Service fully initialized');
        } catch (error) {
            console.error('❌ Failed to initialize Enhanced Notification Service:', error);
            throw error;
        }
    }

    /**
     * Create and store a notification
     * @param {Object} notificationData - Notification data
     * @returns {Object} Created notification
     */
    async createNotification(notificationData) {
        try {
            const {
                type,
                recipients = [],
                content,
                contextData = {},
                relatedEntities = [],
                scheduledFor = null,
                expiresAt = null,
                createdBy = null,
                templateId = null,
                priority = 'medium',
                category = 'medical'
            } = notificationData;

            console.log(`📝 Creating notification: ${type} for ${recipients.length} recipients`);

            // Create notification document
            const notification = new Notification({
                type,
                category,
                priority,
                recipients: recipients.map(recipient => ({
                    userId: recipient.userId,
                    userRole: recipient.userRole,
                    deliveryChannels: recipient.deliveryChannels || ['websocket'],
                    deliveryStatus: {
                        websocket: { status: 'pending' },
                        email: { status: 'pending' },
                        sms: { status: 'pending' }
                    }
                })),
                content,
                templateId,
                contextData,
                relatedEntities,
                scheduledFor,
                expiresAt: expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days default
                analytics: {
                    totalRecipients: recipients.length,
                    deliveredCount: 0,
                    readCount: 0,
                    actionCount: 0,
                    bounceCount: 0,
                    unsubscribeCount: 0
                },
                createdBy
            });

            // Save to database
            const savedNotification = await notification.save();

            // Queue for immediate delivery if not scheduled
            if (!scheduledFor || scheduledFor <= new Date()) {
                await this.queueNotificationForDelivery(savedNotification);
            }

            // Update analytics
            this.updateAnalytics('created', type, recipients.length);

            console.log(`✅ Notification created: ${savedNotification._id}`);
            return savedNotification;

        } catch (error) {
            console.error('❌ Failed to create notification:', error);
            throw error;
        }
    }

    /**
     * Send notification to specific user
     * @param {string} userId - User ID
     * @param {string} type - Notification type
     * @param {Object} data - Notification data
     * @param {Object} options - Additional options
     */
    async sendNotification(userId, type, data, options = {}) {
        try {
            // Get user role (this would typically come from user service)
            const userRole = options.userRole || 'patient';

            const recipients = [{
                userId,
                userRole,
                deliveryChannels: options.channels || ['websocket']
            }];

            const notificationData = {
                type,
                recipients,
                content: {
                    title: options.title || 'Notification',
                    message: options.message || 'You have a new notification',
                    actionUrl: options.actionUrl,
                    actionText: options.actionText,
                    metadata: data
                },
                contextData: data,
                priority: options.priority || 'medium',
                category: options.category || 'medical',
                createdBy: options.createdBy
            };

            return await this.createNotification(notificationData);

        } catch (error) {
            console.error('❌ Failed to send notification:', error);
            throw error;
        }
    }

    /**
     * Send bulk notifications
     * @param {Array} recipients - Array of recipient objects
     * @param {string} type - Notification type
     * @param {Object} data - Notification data
     * @param {Object} options - Additional options
     */
    async sendBulkNotification(recipients, type, data, options = {}) {
        try {
            console.log(`📢 Sending bulk notification: ${type} to ${recipients.length} recipients`);

            const notificationData = {
                type,
                recipients,
                content: {
                    title: options.title || 'Notification',
                    message: options.message || 'You have a new notification',
                    actionUrl: options.actionUrl,
                    actionText: options.actionText,
                    metadata: data
                },
                contextData: data,
                priority: options.priority || 'medium',
                category: options.category || 'medical',
                createdBy: options.createdBy
            };

            return await this.createNotification(notificationData);

        } catch (error) {
            console.error('❌ Failed to send bulk notification:', error);
            throw error;
        }
    }

    /**
     * Send role-based notification
     * @param {string} role - User role
     * @param {string} type - Notification type
     * @param {Object} data - Notification data
     * @param {Object} options - Additional options
     */
    async sendRoleBasedNotification(role, type, data, options = {}) {
        try {
            // This would typically query the user database to get all users with the specified role
            // For now, we'll use the WebSocket service to get connected users
            let recipients = [];

            if (this.webSocketService) {
                const connectedUsers = this.webSocketService.getConnectedUsersByRole(role);
                recipients = connectedUsers.map(user => ({
                    userId: user.userId,
                    userRole: role,
                    deliveryChannels: options.channels || ['websocket']
                }));
            }

            if (recipients.length > 0) {
                return await this.sendBulkNotification(recipients, type, data, options);
            } else {
                console.log(`⚠️ No recipients found for role: ${role}`);
                return null;
            }

        } catch (error) {
            console.error('❌ Failed to send role-based notification:', error);
            throw error;
        }
    }

    /**
     * Queue notification for delivery
     * @param {Object} notification - Notification document
     */
    async queueNotificationForDelivery(notification) {
        try {
            // Add to queue for each recipient
            for (const recipient of notification.recipients) {
                await this.notificationQueue.add({
                    notificationId: notification._id,
                    recipientId: recipient.userId,
                    channels: recipient.deliveryChannels,
                    priority: notification.priority,
                    scheduledFor: notification.scheduledFor
                });
            }

            console.log(`📬 Queued notification ${notification._id} for delivery`);

        } catch (error) {
            console.error('❌ Failed to queue notification:', error);
            throw error;
        }
    }

    /**
     * Get notification template
     * @param {string} type - Notification type
     * @param {string} channel - Delivery channel
     * @param {string} userRole - User role
     * @param {string} language - Language preference
     */
    async getNotificationTemplate(type, channel, userRole, language = 'en') {
        try {
            const cacheKey = `${type}_${channel}_${userRole}_${language}`;

            // Check cache first
            if (this.templateCache.has(cacheKey)) {
                return this.templateCache.get(cacheKey);
            }

            // Query database
            const template = await NotificationTemplate.findOne({
                type,
                isActive: true,
                'variants.channel': channel,
                'variants.userRole': userRole,
                'variants.language': language
            });

            if (template) {
                const variant = template.variants.find(v =>
                    v.channel === channel &&
                    v.userRole === userRole &&
                    v.language === language
                );

                if (variant) {
                    // Cache the result
                    this.templateCache.set(cacheKey, { template, variant });
                    return { template, variant };
                }
            }

            // Return null if no template found
            return null;

        } catch (error) {
            console.error('❌ Failed to get notification template:', error);
            return null;
        }
    }

    /**
     * Update user notification preferences
     * @param {string} userId - User ID
     * @param {Object} preferences - Notification preferences
     */
    async updateUserPreferences(userId, preferences) {
        try {
            const updatedPreferences = await UserNotificationPreferences.findOneAndUpdate(
                { userId },
                preferences,
                { upsert: true, new: true }
            );

            // Update cache
            this.preferencesCache.set(userId, updatedPreferences);

            console.log(`🔧 Updated notification preferences for user ${userId}`);
            return updatedPreferences;

        } catch (error) {
            console.error('❌ Failed to update user preferences:', error);
            throw error;
        }
    }

    /**
     * Get user notification preferences
     * @param {string} userId - User ID
     */
    async getUserPreferences(userId) {
        try {
            // Check cache first
            if (this.preferencesCache.has(userId)) {
                return this.preferencesCache.get(userId);
            }

            // Query database
            let preferences = await UserNotificationPreferences.findOne({ userId });

            // Create default preferences if none exist
            if (!preferences) {
                preferences = UserNotificationPreferences.getDefaultPreferences(userId);
                await preferences.save();
            }

            // Cache the result
            this.preferencesCache.set(userId, preferences);

            return preferences;

        } catch (error) {
            console.error('❌ Failed to get user preferences:', error);
            return UserNotificationPreferences.getDefaultPreferences(userId);
        }
    }

    /**
     * Start queue processor
     */
    startQueueProcessor() {
        // Process notifications every 5 seconds
        setInterval(async () => {
            try {
                await this.processNotificationQueue();
            } catch (error) {
                console.error('❌ Queue processor error:', error);
            }
        }, 5000);

        console.log('🔄 Notification queue processor started');
    }

    /**
     * Start analytics processor
     */
    startAnalyticsProcessor() {
        // Process analytics every hour
        setInterval(async () => {
            try {
                await this.processAnalytics();
            } catch (error) {
                console.error('❌ Analytics processor error:', error);
            }
        }, 60 * 60 * 1000); // 1 hour

        console.log('📊 Analytics processor started');
    }

    /**
     * Start scheduled notification processor
     */
    startScheduledNotificationProcessor() {
        // Check for scheduled notifications every minute
        setInterval(async () => {
            try {
                await this.processScheduledNotifications();
            } catch (error) {
                console.error('❌ Scheduled notification processor error:', error);
            }
        }, 60 * 1000); // 1 minute

        console.log('⏰ Scheduled notification processor started');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for delivery status updates
        this.on('deliveryStatusUpdate', this.handleDeliveryStatusUpdate.bind(this));

        // Listen for user interactions
        this.on('notificationRead', this.handleNotificationRead.bind(this));
        this.on('notificationAction', this.handleNotificationAction.bind(this));

        console.log('👂 Event listeners setup complete');
    }

    /**
     * Process notification queue
     */
    async processNotificationQueue() {
        try {
            const queuedNotifications = await this.notificationQueue.getNext(10); // Process 10 at a time

            for (const queueItem of queuedNotifications) {
                await this.deliverQueuedNotification(queueItem);
            }

        } catch (error) {
            console.error('❌ Failed to process notification queue:', error);
        }
    }

    /**
     * Deliver queued notification
     * @param {Object} queueItem - Queue item
     */
    async deliverQueuedNotification(queueItem) {
        try {
            const { notificationId, recipientId, channels } = queueItem;

            // Get notification from database
            const notification = await Notification.findById(notificationId);
            if (!notification) {
                console.error(`❌ Notification not found: ${notificationId}`);
                return;
            }

            // Get recipient from notification
            const recipient = notification.recipients.find(r => r.userId.toString() === recipientId);
            if (!recipient) {
                console.error(`❌ Recipient not found: ${recipientId}`);
                return;
            }

            // Get user preferences
            const preferences = await this.getUserPreferences(recipientId);

            // Check if notification should be sent based on preferences
            if (!this.shouldSendNotification(preferences, notification.type, notification.priority)) {
                console.log(`🔕 Notification blocked by preferences: ${notification.type} for user ${recipientId}`);
                return;
            }

            // Filter channels based on preferences
            const enabledChannels = channels.filter(channel =>
                this.isChannelEnabled(preferences, channel, notification.category)
            );

            if (enabledChannels.length === 0) {
                console.log(`🔕 No enabled channels for user ${recipientId}`);
                return;
            }

            // Use ChannelManager for delivery with fallback and retry logic
            const deliveryResult = await this.channelManager.deliverNotification(
                notification,
                enabledChannels,
                preferences
            );

            // Update delivery status based on results
            for (const [channel, result] of Object.entries(deliveryResult.channels)) {
                const status = result.success ? 'delivered' : 'failed';
                const error = result.success ? null : result.error;

                await this.updateDeliveryStatus(
                    notification._id,
                    recipient.userId,
                    channel,
                    status,
                    error
                );
            }

            // Mark as processed in queue
            await this.notificationQueue.markProcessed(queueItem.id);

            console.log(`📊 Delivery completed for notification ${notificationId} with status: ${deliveryResult.overallStatus}`);

        } catch (error) {
            console.error('❌ Failed to deliver queued notification:', error);

            // Mark as failed in queue for retry
            await this.notificationQueue.markFailed(queueItem.id, error.message);
        }
    }

    /**
     * Deliver notification through specific channel
     * @param {Object} notification - Notification document
     * @param {Object} recipient - Recipient object
     * @param {string} channel - Delivery channel
     */
    async deliverThroughChannel(notification, recipient, channel) {
        try {
            switch (channel) {
                case 'websocket':
                    await this.deliverWebSocketNotification(notification, recipient);
                    break;
                case 'email':
                    await this.deliverEmailNotification(notification, recipient);
                    break;
                case 'sms':
                    await this.deliverSMSNotification(notification, recipient);
                    break;
                default:
                    console.error(`❌ Unknown delivery channel: ${channel}`);
            }
        } catch (error) {
            console.error(`❌ Failed to deliver through ${channel}:`, error);

            // Update delivery status
            await this.updateDeliveryStatus(notification._id, recipient.userId, channel, 'failed', error.message);
        }
    }

    /**
     * Deliver WebSocket notification
     * @param {Object} notification - Notification document
     * @param {Object} recipient - Recipient object
     */
    async deliverWebSocketNotification(notification, recipient) {
        try {
            if (this.webSocketService) {
                const payload = {
                    id: notification._id,
                    type: notification.type,
                    title: notification.content.title,
                    message: notification.content.message,
                    priority: notification.priority,
                    createdAt: notification.createdAt,
                    actionUrl: notification.content.actionUrl,
                    actionText: notification.content.actionText,
                    metadata: notification.content.metadata
                };

                this.webSocketService.sendNotificationToUser(recipient.userId.toString(), payload);

                // Update delivery status
                await this.updateDeliveryStatus(notification._id, recipient.userId, 'websocket', 'delivered');

                console.log(`📬 WebSocket notification delivered to user ${recipient.userId}`);
            } else {
                console.log(`⚠️ WebSocket service not available for user ${recipient.userId}`);
            }
        } catch (error) {
            console.error('❌ Failed to deliver WebSocket notification:', error);
            throw error;
        }
    }

    /**
     * Deliver email notification
     * @param {Object} notification - Notification document
     * @param {Object} recipient - Recipient object
     */
    async deliverEmailNotification(notification, recipient) {
        try {
            // Get email template
            const templateData = await this.getNotificationTemplate(
                notification.type,
                'email',
                recipient.userRole
            );

            if (templateData && this.emailService) {
                const { template, variant } = templateData;

                // Render email content
                const emailContent = this.renderTemplate(variant.htmlBody || variant.body, notification.contextData);
                const subject = this.renderTemplate(variant.subject || notification.content.title, notification.contextData);

                // Send email
                await this.emailService.sendEmail({
                    to: recipient.email, // This would come from user data
                    subject,
                    html: emailContent,
                    text: this.renderTemplate(variant.body, notification.contextData)
                });

                // Update delivery status
                await this.updateDeliveryStatus(notification._id, recipient.userId, 'email', 'sent');

                console.log(`📧 Email notification sent to user ${recipient.userId}`);
            } else {
                console.log(`⚠️ Email template or service not available for ${notification.type}`);
            }
        } catch (error) {
            console.error('❌ Failed to deliver email notification:', error);
            throw error;
        }
    }

    /**
     * Deliver SMS notification
     * @param {Object} notification - Notification document
     * @param {Object} recipient - Recipient object
     */
    async deliverSMSNotification(notification, recipient) {
        try {
            // Get SMS template
            const templateData = await this.getNotificationTemplate(
                notification.type,
                'sms',
                recipient.userRole
            );

            if (templateData && this.smsService) {
                const { template, variant } = templateData;

                // Render SMS content
                const message = this.renderTemplate(variant.body, notification.contextData);

                // Send SMS
                await this.smsService.sendSMS({
                    to: recipient.phone, // This would come from user data
                    message: message.substring(0, 160) // SMS character limit
                });

                // Update delivery status
                await this.updateDeliveryStatus(notification._id, recipient.userId, 'sms', 'sent');

                console.log(`📱 SMS notification sent to user ${recipient.userId}`);
            } else {
                console.log(`⚠️ SMS template or service not available for ${notification.type}`);
            }
        } catch (error) {
            console.error('❌ Failed to deliver SMS notification:', error);
            throw error;
        }
    }

    /**
     * Update delivery status
     * @param {string} notificationId - Notification ID
     * @param {string} userId - User ID
     * @param {string} channel - Delivery channel
     * @param {string} status - Delivery status
     * @param {string} error - Error message (optional)
     */
    async updateDeliveryStatus(notificationId, userId, channel, status, error = null) {
        try {
            const updateQuery = {};
            updateQuery[`recipients.$.deliveryStatus.${channel}.status`] = status;
            updateQuery[`recipients.$.deliveryStatus.${channel}.deliveredAt`] = new Date();

            if (error) {
                updateQuery[`recipients.$.deliveryStatus.${channel}.error`] = error;
            }

            await Notification.updateOne(
                {
                    _id: notificationId,
                    'recipients.userId': userId
                },
                { $set: updateQuery }
            );

            // Update analytics
            this.updateAnalytics('delivered', null, 1, channel);

        } catch (error) {
            console.error('❌ Failed to update delivery status:', error);
        }
    }

    /**
     * Utility methods
     */

    /**
     * Render template with data
     * @param {string} template - Template string
     * @param {Object} data - Data object
     * @returns {string} - Rendered string
     */
    renderTemplate(template, data) {
        if (!template) return '';

        return template.replace(/\{(\w+)\}/g, (match, key) => {
            return data[key] !== undefined ? data[key] : match;
        });
    }

    /**
     * Check if notification should be sent based on preferences
     * @param {Object} preferences - User preferences
     * @param {string} type - Notification type
     * @param {string} priority - Notification priority
     * @returns {boolean} - Should send notification
     */
    shouldSendNotification(preferences, type, priority) {
        if (!preferences.globalSettings.enabled) {
            return false;
        }

        // Check quiet hours
        if (preferences.globalSettings.quietHours.enabled) {
            const now = new Date();
            const currentTime = now.getHours() * 100 + now.getMinutes();
            const startTime = this.parseTime(preferences.globalSettings.quietHours.startTime);
            const endTime = this.parseTime(preferences.globalSettings.quietHours.endTime);

            if (this.isInQuietHours(currentTime, startTime, endTime) && priority !== 'critical' && priority !== 'emergency') {
                return false;
            }
        }

        // Check specific notification type preferences
        if (preferences.notificationTypes[type] && !preferences.notificationTypes[type].enabled) {
            return false;
        }

        return true;
    }

    /**
     * Check if channel is enabled for user
     * @param {Object} preferences - User preferences
     * @param {string} channel - Channel name
     * @param {string} category - Notification category
     * @returns {boolean} - Is channel enabled
     */
    isChannelEnabled(preferences, channel, category) {
        if (!preferences.channels[channel] || !preferences.channels[channel].enabled) {
            return false;
        }

        if (preferences.categories[category] && !preferences.categories[category].enabled) {
            return false;
        }

        return true;
    }

    /**
     * Parse time string to minutes
     * @param {string} timeStr - Time string (HH:MM)
     * @returns {number} - Time in HHMM format
     */
    parseTime(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 100 + minutes;
    }

    /**
     * Check if current time is in quiet hours
     * @param {number} currentTime - Current time in HHMM format
     * @param {number} startTime - Start time in HHMM format
     * @param {number} endTime - End time in HHMM format
     * @returns {boolean} - Is in quiet hours
     */
    isInQuietHours(currentTime, startTime, endTime) {
        if (startTime <= endTime) {
            return currentTime >= startTime && currentTime <= endTime;
        } else {
            // Quiet hours span midnight
            return currentTime >= startTime || currentTime <= endTime;
        }
    }

    /**
     * Update analytics
     * @param {string} action - Action type
     * @param {string} type - Notification type
     * @param {number} count - Count
     * @param {string} channel - Channel (optional)
     */
    updateAnalytics(action, type, count, channel = null) {
        try {
            const today = new Date().toISOString().split('T')[0];

            if (!this.analyticsBuffer.has(today)) {
                this.analyticsBuffer.set(today, {
                    totalSent: 0,
                    totalDelivered: 0,
                    totalRead: 0,
                    totalActioned: 0,
                    totalFailed: 0,
                    channels: { websocket: 0, email: 0, sms: 0 },
                    types: new Map()
                });
            }

            const dayAnalytics = this.analyticsBuffer.get(today);

            switch (action) {
                case 'created':
                    dayAnalytics.totalSent += count;
                    break;
                case 'delivered':
                    dayAnalytics.totalDelivered += count;
                    if (channel) {
                        dayAnalytics.channels[channel] = (dayAnalytics.channels[channel] || 0) + count;
                    }
                    break;
                case 'read':
                    dayAnalytics.totalRead += count;
                    break;
                case 'action':
                    dayAnalytics.totalActioned += count;
                    break;
                case 'failed':
                    dayAnalytics.totalFailed += count;
                    break;
            }

            if (type) {
                dayAnalytics.types.set(type, (dayAnalytics.types.get(type) || 0) + count);
            }

        } catch (error) {
            console.error('❌ Failed to update analytics:', error);
        }
    }

    /**
     * Process analytics buffer
     */
    async processAnalytics() {
        try {
            for (const [date, analytics] of this.analyticsBuffer.entries()) {
                const dateObj = new Date(date);

                // Update or create daily analytics
                await NotificationAnalytics.findOneAndUpdate(
                    { date: dateObj },
                    {
                        $inc: {
                            totalSent: analytics.totalSent,
                            totalDelivered: analytics.totalDelivered,
                            totalRead: analytics.totalRead,
                            totalActioned: analytics.totalActioned,
                            totalFailed: analytics.totalFailed,
                            'channelMetrics.websocket.delivered': analytics.channels.websocket || 0,
                            'channelMetrics.email.delivered': analytics.channels.email || 0,
                            'channelMetrics.sms.delivered': analytics.channels.sms || 0
                        }
                    },
                    { upsert: true }
                );

                // Clear processed analytics
                this.analyticsBuffer.delete(date);
            }

            console.log('📊 Analytics processed successfully');

        } catch (error) {
            console.error('❌ Failed to process analytics:', error);
        }
    }

    /**
     * Process scheduled notifications
     */
    async processScheduledNotifications() {
        try {
            const now = new Date();

            // Find notifications scheduled for now or earlier
            const scheduledNotifications = await Notification.find({
                scheduledFor: { $lte: now },
                'recipients.deliveryStatus.websocket.status': 'pending'
            }).limit(50);

            for (const notification of scheduledNotifications) {
                await this.queueNotificationForDelivery(notification);

                // Clear scheduled time
                await Notification.updateOne(
                    { _id: notification._id },
                    { $unset: { scheduledFor: 1 } }
                );
            }

            if (scheduledNotifications.length > 0) {
                console.log(`⏰ Processed ${scheduledNotifications.length} scheduled notifications`);
            }

        } catch (error) {
            console.error('❌ Failed to process scheduled notifications:', error);
        }
    }

    /**
     * Ensure default templates exist
     */
    async ensureDefaultTemplates() {
        try {
            const templateCount = await NotificationTemplate.countDocuments();

            if (templateCount === 0) {
                console.log('📝 Creating default notification templates...');
                await this.createDefaultTemplates();
            }

        } catch (error) {
            console.error('❌ Failed to ensure default templates:', error);
        }
    }

    /**
     * Create default templates
     */
    async createDefaultTemplates() {
        // This would create default templates for common notification types
        // Implementation would be extensive, so keeping it simple for now
        console.log('📝 Default templates creation would be implemented here');
    }

    /**
     * Event handlers
     */

    handleDeliveryStatusUpdate(data) {
        console.log('📊 Delivery status updated:', data);
    }

    handleNotificationRead(data) {
        this.updateAnalytics('read', data.type, 1);
        console.log('👁️ Notification read:', data);
    }

    handleNotificationAction(data) {
        this.updateAnalytics('action', data.type, 1);
        console.log('🎯 Notification action taken:', data);
    }

    /**
     * Handle notification acknowledged from enhanced WebSocket service
     * @param {Object} data - Acknowledgment data
     */
    handleNotificationAcknowledged(data) {
        try {
            const { notificationId, userId, deliveryId, timestamp } = data;

            // Update delivery analytics
            this.updateAnalytics('delivered', null, 1, 'websocket');

            console.log(`✅ Notification ${notificationId} acknowledged by user ${userId}`);

            // Emit event for other components
            this.emit('notificationAcknowledged', data);

        } catch (error) {
            console.error('❌ Failed to handle notification acknowledged:', error);
        }
    }

    /**
     * Get service statistics
     */
    getStats() {
        return {
            templateCacheSize: this.templateCache.size,
            preferencesCacheSize: this.preferencesCache.size,
            analyticsBufferSize: this.analyticsBuffer.size,
            queueSize: this.notificationQueue.size(),
            timestamp: new Date()
        };
    }
}

export default EnhancedNotificationService;