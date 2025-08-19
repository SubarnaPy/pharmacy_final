import EnhancedNotificationService from './EnhancedNotificationService.js';
import NotificationQueue from './NotificationQueue.js';
import NotificationMiddleware from '../../middleware/NotificationMiddleware.js';
import EmailServiceManager from './EmailServiceManager.js';
import SMSServiceManager from './SMSServiceManager.js';

// Import existing services that might be needed
import emailService from '../emailService.js';
import smsService from '../smsService.js';

/**
 * Initialize Enhanced Notification System
 * Sets up all components and integrates with existing services
 */
class NotificationSystemInitializer {
  constructor() {
    this.enhancedNotificationService = null;
    this.notificationMiddleware = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the complete notification system
   * @param {Object} options - Initialization options
   */
  async initialize(options = {}) {
    try {
      console.log('🚀 Initializing Enhanced Notification System...');

      // Initialize Enhanced Notification Service
      this.enhancedNotificationService = new EnhancedNotificationService({
        webSocketService: options.webSocketService,
        emailService: emailService,
        smsService: smsService,
        ...options.serviceOptions
      });

      // Initialize Notification Middleware
      this.notificationMiddleware = new NotificationMiddleware(this.enhancedNotificationService);

      // Wait for service initialization
      await this.enhancedNotificationService.initialize();

      this.isInitialized = true;
      console.log('✅ Enhanced Notification System initialized successfully');

      return {
        service: this.enhancedNotificationService,
        middleware: this.notificationMiddleware,
        queue: this.enhancedNotificationService.notificationQueue
      };

    } catch (error) {
      console.error('❌ Failed to initialize Enhanced Notification System:', error);
      throw error;
    }
  }

  /**
   * Get middleware function for Express app
   */
  getMiddleware() {
    if (!this.isInitialized) {
      throw new Error('Notification system not initialized. Call initialize() first.');
    }
    return this.notificationMiddleware.middleware();
  }

  /**
   * Get notification service instance
   */
  getService() {
    if (!this.isInitialized) {
      throw new Error('Notification system not initialized. Call initialize() first.');
    }
    return this.enhancedNotificationService;
  }

  /**
   * Get system health status
   */
  async getHealthStatus() {
    if (!this.isInitialized) {
      return { status: 'not_initialized' };
    }

    try {
      const serviceStats = this.enhancedNotificationService.getStats();
      const middlewareStats = this.notificationMiddleware.getStats();
      const queueStats = await this.enhancedNotificationService.notificationQueue.getStats();

      return {
        status: 'healthy',
        service: serviceStats,
        middleware: middlewareStats,
        queue: queueStats,
        timestamp: new Date()
      };

    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    try {
      console.log('🛑 Shutting down Enhanced Notification System...');

      if (this.enhancedNotificationService) {
        // Close queue connections
        await this.enhancedNotificationService.notificationQueue.close();
      }

      this.isInitialized = false;
      console.log('✅ Enhanced Notification System shutdown complete');

    } catch (error) {
      console.error('❌ Error during notification system shutdown:', error);
    }
  }
}

// Create singleton instance
const notificationSystemInitializer = new NotificationSystemInitializer();

// Export both the initializer and individual components
export default notificationSystemInitializer;
export { 
  EnhancedNotificationService, 
  NotificationQueue, 
  NotificationMiddleware,
  EmailServiceManager,
  SMSServiceManager,
  notificationSystemInitializer
};