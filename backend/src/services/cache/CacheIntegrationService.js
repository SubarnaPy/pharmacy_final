// Cache integration service without Redis dependency
import notificationQueueOptimizer from './NotificationQueueOptimizer.js';
import databaseQueryOptimizer from './DatabaseQueryOptimizer.js';
import connectionPoolManager from './ConnectionPoolManager.js';
import logger from '../LoggerService.js';

class CacheIntegrationService {
  constructor() {
    this.isInitialized = false;
    this.services = {
      // Redis disabled - using in-memory alternatives
      queue: notificationQueueOptimizer,
      database: databaseQueryOptimizer,
      connections: connectionPoolManager
    };
    this.performanceMetrics = {
      cacheHitRate: 0,
      averageResponseTime: 0,
      totalRequests: 0,
      errorRate: 0
    };
    
    // In-memory cache for notification data
    this.notificationCache = new Map();
    this.maxCacheSize = 10000;
    
    // Periodic cleanup
    setInterval(() => {
      this.cleanupCache();
    }, 300000); // Every 5 minutes
  }

  async initialize() {
    try {
      logger.info('Initializing cache integration service (in-memory mode)...');

      // Redis cache service is disabled
      logger.info('Redis cache service disabled - using in-memory caching');

      // Initialize notification queue optimizer
      const queueInitialized = await this.services.queue.initialize();
      if (!queueInitialized) {
        throw new Error('Failed to initialize notification queue optimizer');
      }

      // Initialize connection pool manager
      const poolInitialized = await this.services.connections.initialize();
      if (!poolInitialized) {
        throw new Error('Failed to initialize connection pool manager');
      }

      // Start performance monitoring
      this.startPerformanceMonitoring();

      this.isInitialized = true;
      logger.info('Cache integration service initialized successfully');
      return true;
    } catch (error) {
      logger.error('Failed to initialize cache integration service:', error);
      return false;
    }
  }

  // Unified caching interface for notifications (in-memory)
  async cacheNotificationData(key, data, ttl = 3600) {
    try {
      // Store in in-memory cache with expiration
      const expirationTime = Date.now() + (ttl * 1000);
      this.notificationCache.set(key, {
        data: data,
        expires: expirationTime
      });
      
      // Limit cache size
      if (this.notificationCache.size > this.maxCacheSize) {
        this.cleanupCache();
      }
      
      return true;
    } catch (error) {
      logger.error(`Error caching notification data ${key}:`, error);
      return false;
    }
  }

  async getCachedNotificationData(key) {
    try {
      const cached = this.notificationCache.get(key);
      
      if (!cached) {
        return null;
      }
      
      // Check if expired
      if (Date.now() > cached.expires) {
        this.notificationCache.delete(key);
        return null;
      }
      
      return cached.data;
    } catch (error) {
      logger.error(`Error getting cached notification data ${key}:`, error);
      return null;
    }
  }

  // Enhanced user preferences caching
  async getUserPreferencesWithCache(userId) {
    try {
      // Fallback to optimized database query (Redis disabled)
      const preferences = await this.services.database.getOptimizedUserPreferences(userId);
      return preferences;
    } catch (error) {
      logger.error(`Error getting user preferences for ${userId}:`, error);
      return null;
    }
  }

  async updateUserPreferencesWithCache(userId, preferences) {
    try {
      // Invalidate related query cache
      await this.services.database.invalidateUserCache(userId);
      
      logger.info(`Updated cached user preferences for ${userId}`);
      return true;
    } catch (error) {
      logger.error(`Error updating user preferences cache for ${userId}:`, error);
      return false;
    }
  }

  // Enhanced template caching
  async getTemplateWithCache(templateKey) {
    try {
      // Fallback to optimized database query (Redis disabled)
      const templates = await this.services.database.getOptimizedNotificationTemplates({
        key: templateKey
      });
      
      if (templates && templates.length > 0) {
        return templates[0];
      }
      
      return null;
    } catch (error) {
      logger.error(`Error getting template ${templateKey}:`, error);
      return null;
    }
  }

  async invalidateTemplateCache(templateKey) {
    try {
      await this.services.database.invalidateTemplateCache();
      
      logger.info(`Invalidated template cache: ${templateKey || 'all'}`);
      return true;
    } catch (error) {
      logger.error(`Error invalidating template cache:`, error);
      return false;
    }
  }

  // Queue management with caching
  async addNotificationToQueue(notification, priority = 'medium') {
    try {
      const queueId = await this.services.queue.addToQueue(notification, priority);
      return queueId;
    } catch (error) {
      logger.error('Error adding notification to queue:', error);
      throw error;
    }
  }

  async getQueueStatsWithCache() {
    try {
      // Get fresh stats (Redis disabled)
      const stats = await this.services.queue.getQueueStats();
      return stats;
    } catch (error) {
      logger.error('Error getting queue stats:', error);
      return null;
    }
  }

  // Connection pool integration
  async getConnectionWithCache(poolName) {
    try {
      const connection = await this.services.connections.acquireConnection(poolName);
      return connection;
    } catch (error) {
      logger.error(`Error getting connection from pool ${poolName}:`, error);
      throw error;
    }
  }

  async releaseConnectionWithCache(poolName, connection) {
    try {
      await this.services.connections.releaseConnection(poolName, connection);
      return true;
    } catch (error) {
      logger.error(`Error releasing connection to pool ${poolName}:`, error);
      return false;
    }
  }

  // Performance optimization
  async optimizePerformance() {
    try {
      const optimizations = [];

      // Optimize queue performance
      const queueOptimization = await this.services.queue.optimizeQueuePerformance();
      optimizations.push({
        service: 'queue',
        ...queueOptimization
      });

      // Optimize database queries
      const dbOptimization = await this.services.database.optimizeConnections();
      optimizations.push({
        service: 'database',
        ...dbOptimization
      });

      // Get connection pool stats
      const poolStats = await this.services.connections.getAllPoolStats();
      optimizations.push({
        service: 'connections',
        stats: poolStats
      });

      logger.info('Performance optimization completed', { optimizations });
      return optimizations;
    } catch (error) {
      logger.error('Error during performance optimization:', error);
      return [];
    }
  }

      // Performance monitoring
  startPerformanceMonitoring() {
    setInterval(async () => {
      await this.collectPerformanceMetrics();
    }, 60000); // Every minute
  }

  async collectPerformanceMetrics() {
    try {
      const metrics = {
        timestamp: new Date(),
        redis: { status: 'disabled' }, // Redis disabled
        cache: {
          size: this.notificationCache.size,
          maxSize: this.maxCacheSize,
          utilization: (this.notificationCache.size / this.maxCacheSize) * 100
        },
        queue: await this.services.queue.getQueueStats(),
        database: await this.services.database.getPerformanceMetrics(),
        connections: await this.services.connections.getAllPoolStats()
      };

      // Calculate overall performance metrics
      this.performanceMetrics = {
        cacheHitRate: metrics.database.cacheHitRate || 0,
        averageResponseTime: this.calculateAverageResponseTime(metrics),
        totalRequests: metrics.database.totalQueries || 0,
        errorRate: this.calculateErrorRate(metrics)
      };

      logger.debug('Performance metrics collected', this.performanceMetrics);
    } catch (error) {
      logger.error('Error collecting performance metrics:', error);
    }
  }

  calculateAverageResponseTime(metrics) {
    // Calculate weighted average response time across services
    let totalTime = 0;
    let totalRequests = 0;

    if (metrics.database && metrics.database.queryStats) {
      for (const [, stats] of Object.entries(metrics.database.queryStats)) {
        totalTime += stats.totalTime || 0;
        totalRequests += stats.count || 0;
      }
    }

    return totalRequests > 0 ? totalTime / totalRequests : 0;
  }

  calculateErrorRate(metrics) {
    let totalErrors = 0;
    let totalRequests = 0;

    // Queue errors
    if (metrics.queue && metrics.queue.processing) {
      totalRequests += metrics.queue.processing.totalProcessed || 0;
    }

    // Database errors
    if (metrics.database) {
      totalRequests += metrics.database.totalQueries || 0;
    }

    // Connection pool errors
    if (metrics.connections) {
      for (const [, poolStats] of Object.entries(metrics.connections)) {
        totalErrors += poolStats.stats.errors || 0;
        totalRequests += poolStats.stats.acquired || 0;
      }
    }

    return totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;
  }

  // Cache cleanup method
  cleanupCache() {
    try {
      const now = Date.now();
      let removedCount = 0;
      
      // Remove expired entries
      for (const [key, value] of this.notificationCache.entries()) {
        if (now > value.expires) {
          this.notificationCache.delete(key);
          removedCount++;
        }
      }
      
      // If still too large, remove oldest entries
      if (this.notificationCache.size > this.maxCacheSize) {
        const entries = Array.from(this.notificationCache.entries());
        const toRemove = this.notificationCache.size - this.maxCacheSize + 100; // Remove extra to avoid frequent cleanup
        
        for (let i = 0; i < toRemove && i < entries.length; i++) {
          this.notificationCache.delete(entries[i][0]);
          removedCount++;
        }
      }
      
      if (removedCount > 0) {
        logger.debug(`Cleaned up ${removedCount} cache entries`);
      }
    } catch (error) {
      logger.error('Error during cache cleanup:', error);
    }
  }

  // Health check
  async healthCheck() {
    try {
      const health = {
        status: 'healthy',
        services: {},
        overall: {
          cacheHitRate: this.performanceMetrics.cacheHitRate,
          averageResponseTime: this.performanceMetrics.averageResponseTime,
          errorRate: this.performanceMetrics.errorRate
        }
      };

      // Check Redis (disabled)
      health.services.redis = { status: 'disabled' };

      // Check queue
      health.services.queue = await this.services.queue.getQueueStats();

      // Check database optimizer
      health.services.database = await this.services.database.getPerformanceMetrics();

      // Check connection pools
      health.services.connections = await this.services.connections.getAllPoolStats();

      if (this.performanceMetrics.errorRate > 5) {
        health.status = 'unhealthy';
      }

      return health;
    } catch (error) {
      logger.error('Error during health check:', error);
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  // Cleanup and shutdown
  async shutdown() {
    try {
      logger.info('Shutting down cache integration service...');

      // Shutdown all services
      await this.services.connections.shutdown();

      this.isInitialized = false;
      logger.info('Cache integration service shutdown complete');
    } catch (error) {
      logger.error('Error during cache integration service shutdown:', error);
    }
  }

  // Utility methods
  async clearAllCaches() {
    try {
      await this.services.database.clearMemoryCache();
      
      logger.info('All caches cleared');
      return true;
    } catch (error) {
      logger.error('Error clearing caches:', error);
      return false;
    }
  }

  async getSystemStats() {
    return {
      initialized: this.isInitialized,
      performance: this.performanceMetrics,
      health: await this.healthCheck()
    };
  }
}

export default new CacheIntegrationService();