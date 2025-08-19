/**
 * Notification Queue System
 * Handles queuing and processing of notifications using in-memory storage
 */
class NotificationQueue {
  constructor(options = {}) {
    this.queueName = options.queueName || 'notification_queue';
    
    // Configuration
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 60000; // 1 minute
    this.processingTimeout = options.processingTimeout || 300000; // 5 minutes
    
    // In-memory storage
    this.memoryQueue = [];
    this.memoryProcessing = new Map();
    
    this.initialize();
  }

  /**
   * Initialize queue
   */
  async initialize() {
    console.log('📬 Notification queue initialized (memory-only)');
    
    // Start cleanup process for stale processing items
    this.startCleanupProcess();
  }

  /**
   * Add notification to queue
   * @param {Object} notificationData - Notification data
   * @param {Object} options - Queue options
   */
  async add(notificationData, options = {}) {
    try {
      const queueItem = {
        id: this.generateId(),
        ...notificationData,
        addedAt: new Date().toISOString(),
        retryCount: 0,
        priority: this.getPriorityScore(notificationData.priority || 'medium'),
        scheduledFor: options.scheduledFor || new Date().toISOString()
      };

      return await this.addToMemoryQueue(queueItem);

    } catch (error) {
      console.error('❌ Failed to add to queue:', error);
      throw error;
    }
  }

  /**
   * Add to memory queue
   * @param {Object} queueItem - Queue item
   */
  async addToMemoryQueue(queueItem) {
    this.memoryQueue.push(queueItem);
    
    // Sort by priority (higher priority first)
    this.memoryQueue.sort((a, b) => b.priority - a.priority);
    
    console.log(`📬 Added notification ${queueItem.id} to memory queue`);
    return queueItem.id;
  }

  /**
   * Get next items from queue
   * @param {number} count - Number of items to get
   */
  async getNext(count = 1) {
    try {
      return await this.getNextFromMemoryQueue(count);
    } catch (error) {
      console.error('❌ Failed to get next from queue:', error);
      return [];
    }
  }

  /**
   * Get next from memory queue
   * @param {number} count - Number of items to get
   */
  async getNextFromMemoryQueue(count) {
    const now = new Date();
    const readyItems = [];
    
    // Find items ready to be processed
    for (let i = this.memoryQueue.length - 1; i >= 0 && readyItems.length < count; i--) {
      const item = this.memoryQueue[i];
      
      if (new Date(item.scheduledFor) <= now) {
        // Remove from queue and add to processing
        this.memoryQueue.splice(i, 1);
        this.memoryProcessing.set(item.id, {
          ...item,
          processingStartedAt: now.toISOString()
        });
        readyItems.push(item);
      }
    }

    return readyItems;
  }

  /**
   * Mark item as processed
   * @param {string} itemId - Item ID
   */
  async markProcessed(itemId) {
    try {
      this.memoryProcessing.delete(itemId);
      console.log(`✅ Marked notification ${itemId} as processed`);
    } catch (error) {
      console.error('❌ Failed to mark as processed:', error);
    }
  }

  /**
   * Mark item as failed and retry if possible
   * @param {string} itemId - Item ID
   * @param {string} error - Error message
   */
  async markFailed(itemId, error) {
    try {
      const queueItem = this.memoryProcessing.get(itemId);
      this.memoryProcessing.delete(itemId);

      if (!queueItem) {
        console.error(`❌ Queue item not found for failed processing: ${itemId}`);
        return;
      }

      queueItem.retryCount = (queueItem.retryCount || 0) + 1;
      queueItem.lastError = error;
      queueItem.lastFailedAt = new Date().toISOString();

      if (queueItem.retryCount <= this.maxRetries) {
        // Schedule for retry
        queueItem.scheduledFor = new Date(Date.now() + this.retryDelay * queueItem.retryCount).toISOString();
        
        this.memoryQueue.push(queueItem);
        this.memoryQueue.sort((a, b) => b.priority - a.priority);

        console.log(`🔄 Scheduled notification ${itemId} for retry (attempt ${queueItem.retryCount})`);
      } else {
        console.log(`💀 Notification ${itemId} failed after ${queueItem.retryCount} attempts`);
      }

    } catch (error) {
      console.error('❌ Failed to mark as failed:', error);
    }
  }

  /**
   * Get queue size
   */
  async size() {
    return this.memoryQueue.length;
  }

  /**
   * Get queue statistics
   */
  async getStats() {
    try {
      return {
        queueSize: this.memoryQueue.length,
        processingSize: this.memoryProcessing.size,
        retrySize: 0, // Not tracked separately in memory
        deadLetterSize: 0, // Not tracked separately in memory
        useMemoryFallback: true
      };
    } catch (error) {
      console.error('❌ Failed to get queue stats:', error);
      return { error: error.message };
    }
  }

  /**
   * Start cleanup process for stale processing items
   */
  startCleanupProcess() {
    setInterval(async () => {
      try {
        await this.cleanupStaleProcessingItems();
      } catch (error) {
        console.error('❌ Cleanup process error:', error);
      }
    }, 60000); // Run every minute

    console.log('🧹 Queue cleanup process started');
  }

  /**
   * Cleanup stale processing items
   */
  async cleanupStaleProcessingItems() {
    try {
      const cutoffTime = Date.now() - this.processingTimeout;

      // Cleanup memory processing items
      for (const [itemId, item] of this.memoryProcessing.entries()) {
        const processingStartTime = new Date(item.processingStartedAt).getTime();
        if (processingStartTime < cutoffTime) {
          console.log(`🧹 Cleaning up stale processing item: ${itemId}`);
          await this.markFailed(itemId, 'Processing timeout');
        }
      }

    } catch (error) {
      console.error('❌ Failed to cleanup stale processing items:', error);
    }
  }

  /**
   * Utility methods
   */

  /**
   * Generate unique ID
   */
  generateId() {
    return `notif_queue_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Get priority score
   * @param {string} priority - Priority level
   */
  getPriorityScore(priority) {
    const priorityMap = {
      'low': 1,
      'medium': 2,
      'high': 3,
      'critical': 4,
      'emergency': 5
    };
    return priorityMap[priority] || 2;
  }

  /**
   * Close connections
   */
  async close() {
    console.log('✅ Notification queue closed (memory-only)');
  }
}

export default NotificationQueue;