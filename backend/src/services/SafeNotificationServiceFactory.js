import EnhancedNotificationService from '../services/notifications/EnhancedNotificationService.js';
import mongoose from 'mongoose';

/**
 * Safe Notification Service Factory
 * Creates notification services only after database connection is established
 */
class SafeNotificationServiceFactory {
    constructor() {
        this.serviceInstances = new Map();
        this.isInitialized = false;
    }

    /**
     * Wait for database connection before creating notification service
     */
    async waitForDatabaseConnection(maxWaitTime = 10000) {
        const startTime = Date.now();
        
        while (mongoose.connection.readyState !== 1) {
            if (Date.now() - startTime > maxWaitTime) {
                throw new Error('Database connection timeout exceeded');
            }
            
            console.log('⏳ Waiting for database connection...');
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        console.log('✅ Database connection confirmed');
        return true;
    }

    /**
     * Create a safe notification service instance
     */
    async createNotificationService(controllerId = 'default', options = {}) {
        try {
            // Check if service already exists for this controller
            if (this.serviceInstances.has(controllerId)) {
                return this.serviceInstances.get(controllerId);
            }

            // Wait for database connection
            await this.waitForDatabaseConnection();

            // Create enhanced notification service with safe initialization
            const notificationService = new EnhancedNotificationService({
                ...options,
                skipInitialTemplateCreation: false, // Allow template creation
                skipBackgroundProcesses: false      // Allow background processes
            });

            // Initialize manually with error handling
            try {
                await notificationService.initialize();
                console.log(`✅ Notification service initialized for controller: ${controllerId}`);
            } catch (initError) {
                console.warn(`⚠️ Notification service partial initialization for ${controllerId}:`, initError.message);
                // Continue with basic service functionality even if full initialization fails
            }

            // Store service instance
            this.serviceInstances.set(controllerId, notificationService);
            
            return notificationService;

        } catch (error) {
            console.error(`❌ Failed to create notification service for ${controllerId}:`, error.message);
            
            // Return a mock service that logs notifications but doesn't fail
            return this.createMockService(controllerId);
        }
    }

    /**
     * Create a mock notification service for fallback
     */
    createMockService(controllerId) {
        console.log(`🔄 Creating mock notification service for ${controllerId}`);
        
        return {
            async sendNotification(userId, type, data, options = {}) {
                console.log(`📧 [MOCK] Notification for ${userId}:`, { type, data, options });
                return { success: true, mockService: true };
            },

            async sendBulkNotification(recipients, type, data, options = {}) {
                console.log(`📧 [MOCK] Bulk notification to ${recipients.length} recipients:`, { type, data, options });
                return { success: true, mockService: true };
            },

            async sendRoleBasedNotification(role, type, data, options = {}) {
                console.log(`📧 [MOCK] Role-based notification to ${role}:`, { type, data, options });
                return { success: true, mockService: true };
            },

            async createNotification(notificationData) {
                console.log(`📧 [MOCK] Create notification:`, notificationData);
                return { success: true, mockService: true };
            }
        };
    }

    /**
     * Get existing service or create new one
     */
    async getService(controllerId = 'default', options = {}) {
        if (this.serviceInstances.has(controllerId)) {
            return this.serviceInstances.get(controllerId);
        }
        
        return await this.createNotificationService(controllerId, options);
    }

    /**
     * Clear all service instances (useful for testing)
     */
    clearServices() {
        this.serviceInstances.clear();
        this.isInitialized = false;
    }
}

// Export singleton instance
const safeNotificationFactory = new SafeNotificationServiceFactory();
export default safeNotificationFactory;
