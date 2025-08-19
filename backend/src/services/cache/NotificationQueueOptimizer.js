// import redisCacheService from './RedisCacheService.js';
import logger from '../LoggerService.js';

class NotificationQueueOptimizer {
  constructor() {
    this.batchSize = parseInt(process.env.NOTIFICATION_BATCH_SIZE) || 100;
    this.batchTimeout = parseInt(process.env.NOTIFICATION_BATCH_TIMEOUT) || 5000; // 5 seconds
    this.priorityQueues = {
      emergency: [],
      critical: [],
      high: [],
      medium: [],
      low: []
    };
    this.batchTimers = {};
    this.processingStats = {
      totalProcessed: 0,
      batchesProcessed: 0,
      averageBatchSize: 0,
      lastProcessedAt: null
    };
  }

  async initialize() {
    try {
      // Load any persisted queue data from Redis
      await this.loadPersistedQueues();
      
      // Start periodic queue processing
      this.startQueueProcessor();
      
      logger.info('Notification queue optimizer initialized');
      return true;
    } catch (error) {
      logger.error('Failed to initialize notification queue optimizer:', error);
      return false;
    }
  }

  async addToQueue(notification, priority = 'medium') {
    try {
      // Validate priority
      if (!this.priorityQueues[priority]) {
        priority = 'medium';
      }

      // Add timestamp and unique ID
      const queueItem = {
        ...notification,
        queuedAt: new Date(),
        queueId: this.generateQueueId(),
        priority
      };

      // Add to appropriate priority queue
      this.priorityQueues[priority].push(queueItem);

      // Persist to Redis for durability
      await this.persistQueue(priority);

      // Check if we should trigger immediate processing
      if (priority === 'emergency' || priority === 'critical') {
        await this.processQueue(priority, true); // Force immediate processing
      } else {
        this.scheduleBatchProcessing(priority);
      }

      logger.debug(`Added notification to ${priority} queue`, { 
        notificationId: queueItem.queueId,
        queueSize: this.priorityQueues[priority].length 
      });

      return queueItem.queueId;
    } catch (error) {
      logger.error('Error adding notification to queue:', error);
      throw error;
    }
  }

  async processQueue(priority, forceImmediate = false) {
    const queue = this.priorityQueues[priority];
    if (queue.length === 0) {
      return { processed: 0, errors: 0 };
    }

    try {
      let batch;
      let processed = 0;
      let errors = 0;

      // For emergency/critical, process all immediately
      if (forceImmediate || priority === 'emergency' || priority === 'critical') {
        batch = queue.splice(0);
      } else {
        // For other priorities, process in batches
        batch = queue.splice(0, this.batchSize);
      }

      if (batch.length === 0) {
        return { processed: 0, errors: 0 };
      }

      logger.info(`Processing ${batch.length} notifications from ${priority} queue`);

      // Group notifications by type for batch processing
      const groupedNotifications = this.groupNotificationsByType(batch);

      // Process each group
      for (const [type, notifications] of Object.entries(groupedNotifications)) {
        try {
          await this.processBatchByType(type, notifications);
          processed += notifications.length;
        } catch (error) {
          logger.error(`Error processing batch of type ${type}:`, error);
          errors += notifications.length;
          
          // Re-queue failed notifications with lower priority
          await this.requeueFailedNotifications(notifications, priority);
        }
      }

      // Update processing stats
      this.updateProcessingStats(processed, 1, batch.length);

      // Persist updated queue
      await this.persistQueue(priority);

      logger.info(`Processed ${processed} notifications, ${errors} errors from ${priority} queue`);

      return { processed, errors };
    } catch (error) {
      logger.error(`Error processing ${priority} queue:`, error);
      throw error;
    }
  }

  groupNotificationsByType(notifications) {
    const grouped = {};
    
    notifications.forEach(notification => {
      const type = notification.type || 'default';
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(notification);
    });

    return grouped;
  }

  async processBatchByType(type, notifications) {
    // This would integrate with the actual notification service
    // For now, we'll simulate processing
    const processingTime = notifications.length * 10; // 10ms per notification
    
    return new Promise((resolve) => {
      setTimeout(() => {
        logger.debug(`Processed batch of ${notifications.length} ${type} notifications`);
        resolve();
      }, processingTime);
    });
  }

  async requeueFailedNotifications(notifications, originalPriority) {
    // Lower the priority for failed notifications
    const newPriority = this.lowerPriority(originalPriority);
    
    for (const notification of notifications) {
      notification.retryCount = (notification.retryCount || 0) + 1;
      notification.lastFailedAt = new Date();
      
      // Don't retry more than 3 times
      if (notification.retryCount <= 3) {
        await this.addToQueue(notification, newPriority);
      } else {
        logger.warn('Notification exceeded retry limit, discarding', {
          queueId: notification.queueId,
          type: notification.type
        });
      }
    }
  }

  lowerPriority(currentPriority) {
    const priorityOrder = ['emergency', 'critical', 'high', 'medium', 'low'];
    const currentIndex = priorityOrder.indexOf(currentPriority);
    
    if (currentIndex < priorityOrder.length - 1) {
      return priorityOrder[currentIndex + 1];
    }
    
    return 'low'; // Lowest priority
  }

  scheduleBatchProcessing(priority) {
    // Clear existing timer for this priority
    if (this.batchTimers[priority]) {
      clearTimeout(this.batchTimers[priority]);
    }

    // Schedule new batch processing
    this.batchTimers[priority] = setTimeout(async () => {
      await this.processQueue(priority);
      delete this.batchTimers[priority];
    }, this.batchTimeout);
  }

  startQueueProcessor() {
    // Process queues periodically in priority order
    setInterval(async () => {
      const priorities = ['emergency', 'critical', 'high', 'medium', 'low'];
      
      for (const priority of priorities) {
        if (this.priorityQueues[priority].length > 0) {
          await this.processQueue(priority);
        }
      }
    }, 30000); // Every 30 seconds
  }

  async persistQueue(priority) {
    try {
      const key = `notification_queue:${priority}`;
      await redisCacheService.set(key, this.priorityQueues[priority], 86400); // 24 hours
    } catch (error) {
      logger.error(`Error persisting ${priority} queue:`, error);
    }
  }

  async loadPersistedQueues() {
    try {
      const priorities = Object.keys(this.priorityQueues);
      
      for (const priority of priorities) {
        const key = `notification_queue:${priority}`;
        const persistedQueue = await redisCacheService.get(key);
        
        if (persistedQueue && Array.isArray(persistedQueue)) {
          this.priorityQueues[priority] = persistedQueue;
          logger.info(`Loaded ${persistedQueue.length} notifications from ${priority} queue`);
        }
      }
    } catch (error) {
      logger.error('Error loading persisted queues:', error);
    }
  }

  generateQueueId() {
    return `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  updateProcessingStats(processed, batches, batchSize) {
    this.processingStats.totalProcessed += processed;
    this.processingStats.batchesProcessed += batches;
    this.processingStats.averageBatchSize = 
      this.processingStats.totalProcessed / this.processingStats.batchesProcessed;
    this.processingStats.lastProcessedAt = new Date();
  }

  // Queue management methods
  async getQueueStats() {
    const stats = {
      queues: {},
      processing: this.processingStats,
      totalQueued: 0
    };

    for (const [priority, queue] of Object.entries(this.priorityQueues)) {
      stats.queues[priority] = {
        count: queue.length,
        oldestItem: queue.length > 0 ? queue[0].queuedAt : null
      };
      stats.totalQueued += queue.length;
    }

    return stats;
  }

  async clearQueue(priority) {
    if (this.priorityQueues[priority]) {
      this.priorityQueues[priority] = [];
      await this.persistQueue(priority);
      
      // Clear any pending batch timer
      if (this.batchTimers[priority]) {
        clearTimeout(this.batchTimers[priority]);
        delete this.batchTimers[priority];
      }
      
      return true;
    }
    return false;
  }

  async clearAllQueues() {
    const priorities = Object.keys(this.priorityQueues);
    
    for (const priority of priorities) {
      await this.clearQueue(priority);
    }
    
    return true;
  }

  // Performance optimization methods
  async optimizeQueuePerformance() {
    const stats = await this.getQueueStats();
    const recommendations = [];

    // Check for queue buildup
    if (stats.totalQueued > 1000) {
      recommendations.push({
        type: 'queue_buildup',
        message: 'High queue volume detected, consider increasing batch size or processing frequency',
        currentCount: stats.totalQueued,
        recommendedAction: 'increase_batch_size'
      });
    }

    // Check for old items in queue
    for (const [priority, queueInfo] of Object.entries(stats.queues)) {
      if (queueInfo.oldestItem) {
        const age = Date.now() - new Date(queueInfo.oldestItem).getTime();
        if (age > 300000) { // 5 minutes
          recommendations.push({
            type: 'stale_queue_items',
            message: `Old items detected in ${priority} queue`,
            priority,
            age: `${Math.round(age / 1000)}s`,
            recommendedAction: 'increase_processing_frequency'
          });
        }
      }
    }

    return {
      stats,
      recommendations,
      optimizationApplied: await this.applyOptimizations(recommendations)
    };
  }

  async applyOptimizations(recommendations) {
    const applied = [];

    for (const rec of recommendations) {
      switch (rec.recommendedAction) {
        case 'increase_batch_size':
          if (this.batchSize < 500) {
            this.batchSize = Math.min(this.batchSize * 1.5, 500);
            applied.push(`Increased batch size to ${this.batchSize}`);
          }
          break;
          
        case 'increase_processing_frequency':
          // Force process the affected queue
          if (rec.priority) {
            await this.processQueue(rec.priority, true);
            applied.push(`Force processed ${rec.priority} queue`);
          }
          break;
      }
    }

    return applied;
  }
}

export default new NotificationQueueOptimizer();