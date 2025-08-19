// import redisCacheService from './RedisCacheService.js';
import logger from '../LoggerService.js';

class DatabaseQueryOptimizer {
  constructor() {
    this.queryCache = new Map();
    this.queryStats = new Map();
    this.slowQueryThreshold = parseInt(process.env.SLOW_QUERY_THRESHOLD) || 1000; // 1 second
    this.cacheHitRate = 0;
    this.totalQueries = 0;
    this.cachedQueries = 0;
  }

  // Query result caching
  async getCachedQuery(queryKey, queryFn, ttl = 300) {
    this.totalQueries++;
    
    try {
      // Check Redis cache first
      const cachedResult = await redisCacheService.get(`query:${queryKey}`);
      if (cachedResult) {
        this.cachedQueries++;
        this.updateCacheHitRate();
        logger.debug(`Cache hit for query: ${queryKey}`);
        return cachedResult;
      }

      // Check in-memory cache
      if (this.queryCache.has(queryKey)) {
        const cached = this.queryCache.get(queryKey);
        if (Date.now() - cached.timestamp < ttl * 1000) {
          this.cachedQueries++;
          this.updateCacheHitRate();
          logger.debug(`Memory cache hit for query: ${queryKey}`);
          return cached.data;
        } else {
          this.queryCache.delete(queryKey);
        }
      }

      // Execute query and cache result
      const startTime = Date.now();
      const result = await queryFn();
      const executionTime = Date.now() - startTime;

      // Track query performance
      this.trackQueryPerformance(queryKey, executionTime);

      // Cache the result
      await this.cacheQueryResult(queryKey, result, ttl);

      logger.debug(`Query executed and cached: ${queryKey} (${executionTime}ms)`);
      return result;
    } catch (error) {
      logger.error(`Error in cached query ${queryKey}:`, error);
      throw error;
    }
  }

  async cacheQueryResult(queryKey, result, ttl) {
    try {
      // Cache in Redis
      await redisCacheService.set(`query:${queryKey}`, result, ttl);
      
      // Cache in memory for faster access
      this.queryCache.set(queryKey, {
        data: result,
        timestamp: Date.now()
      });

      // Limit memory cache size
      if (this.queryCache.size > 1000) {
        const oldestKey = this.queryCache.keys().next().value;
        this.queryCache.delete(oldestKey);
      }
    } catch (error) {
      logger.error(`Error caching query result for ${queryKey}:`, error);
    }
  }

  // Notification-specific optimized queries
  async getOptimizedUserNotifications(userId, options = {}) {
    const queryKey = `user_notifications:${userId}:${JSON.stringify(options)}`;
    
    return await this.getCachedQuery(queryKey, async () => {
      // This would be the actual database query
      // Optimized with proper indexing and pagination
      const query = {
        'recipients.userId': userId,
        ...(options.unreadOnly && { 'recipients.readAt': { $exists: false } }),
        ...(options.category && { category: options.category }),
        ...(options.priority && { priority: options.priority })
      };

      const sort = { createdAt: -1 };
      const limit = options.limit || 50;
      const skip = options.skip || 0;

      // Simulate database query
      return {
        notifications: [],
        total: 0,
        hasMore: false
      };
    }, 300); // 5 minutes cache
  }

  async getOptimizedNotificationTemplates(filters = {}) {
    const queryKey = `notification_templates:${JSON.stringify(filters)}`;
    
    return await this.getCachedQuery(queryKey, async () => {
      // Optimized template query with indexing
      const query = {
        isActive: true,
        ...(filters.type && { type: filters.type }),
        ...(filters.channel && { 'variants.channel': filters.channel }),
        ...(filters.userRole && { 'variants.userRole': filters.userRole })
      };

      // Simulate database query
      return [];
    }, 3600); // 1 hour cache
  }

  async getOptimizedUserPreferences(userId) {
    const queryKey = `user_preferences_db:${userId}`;
    
    return await this.getCachedQuery(queryKey, async () => {
      // Optimized user preferences query
      // This would use proper indexing on userId
      return {};
    }, 1800); // 30 minutes cache
  }

  async getOptimizedNotificationAnalytics(filters = {}) {
    const queryKey = `notification_analytics:${JSON.stringify(filters)}`;
    
    return await this.getCachedQuery(queryKey, async () => {
      // Optimized analytics aggregation query
      const pipeline = [
        {
          $match: {
            ...(filters.dateFrom && { date: { $gte: new Date(filters.dateFrom) } }),
            ...(filters.dateTo && { date: { $lte: new Date(filters.dateTo) } }),
            ...(filters.channel && { [`channelMetrics.${filters.channel}`]: { $exists: true } })
          }
        },
        {
          $group: {
            _id: null,
            totalSent: { $sum: '$totalSent' },
            totalDelivered: { $sum: '$totalDelivered' },
            totalRead: { $sum: '$totalRead' },
            avgDeliveryTime: { $avg: '$performance.averageDeliveryTime' }
          }
        }
      ];

      // Simulate aggregation query
      return {
        totalSent: 0,
        totalDelivered: 0,
        totalRead: 0,
        avgDeliveryTime: 0
      };
    }, 600); // 10 minutes cache
  }

  // Query performance tracking
  trackQueryPerformance(queryKey, executionTime) {
    if (!this.queryStats.has(queryKey)) {
      this.queryStats.set(queryKey, {
        count: 0,
        totalTime: 0,
        avgTime: 0,
        maxTime: 0,
        minTime: Infinity,
        slowQueries: 0
      });
    }

    const stats = this.queryStats.get(queryKey);
    stats.count++;
    stats.totalTime += executionTime;
    stats.avgTime = stats.totalTime / stats.count;
    stats.maxTime = Math.max(stats.maxTime, executionTime);
    stats.minTime = Math.min(stats.minTime, executionTime);

    if (executionTime > this.slowQueryThreshold) {
      stats.slowQueries++;
      logger.warn(`Slow query detected: ${queryKey} (${executionTime}ms)`);
    }

    this.queryStats.set(queryKey, stats);
  }

  updateCacheHitRate() {
    this.cacheHitRate = (this.cachedQueries / this.totalQueries) * 100;
  }

  // Cache invalidation
  async invalidateQueryCache(pattern) {
    try {
      // Clear Redis cache
      await redisCacheService.flushPattern(`query:${pattern}`);
      
      // Clear memory cache
      for (const key of this.queryCache.keys()) {
        if (key.includes(pattern)) {
          this.queryCache.delete(key);
        }
      }
      
      logger.info(`Invalidated query cache for pattern: ${pattern}`);
      return true;
    } catch (error) {
      logger.error(`Error invalidating query cache for pattern ${pattern}:`, error);
      return false;
    }
  }

  async invalidateUserCache(userId) {
    await this.invalidateQueryCache(`user_notifications:${userId}`);
    await this.invalidateQueryCache(`user_preferences_db:${userId}`);
  }

  async invalidateTemplateCache() {
    await this.invalidateQueryCache('notification_templates');
  }

  async invalidateAnalyticsCache() {
    await this.invalidateQueryCache('notification_analytics');
  }

  // Database connection optimization
  async optimizeConnections() {
    const recommendations = [];
    
    // Analyze query patterns
    const queryAnalysis = this.analyzeQueryPatterns();
    
    if (queryAnalysis.slowQueries > 0) {
      recommendations.push({
        type: 'slow_queries',
        count: queryAnalysis.slowQueries,
        message: 'Consider adding database indexes for slow queries',
        queries: queryAnalysis.slowestQueries
      });
    }

    if (this.cacheHitRate < 70) {
      recommendations.push({
        type: 'low_cache_hit_rate',
        rate: this.cacheHitRate,
        message: 'Consider increasing cache TTL or optimizing cache keys'
      });
    }

    return {
      cacheHitRate: this.cacheHitRate,
      totalQueries: this.totalQueries,
      cachedQueries: this.cachedQueries,
      queryStats: Object.fromEntries(this.queryStats),
      recommendations
    };
  }

  analyzeQueryPatterns() {
    let totalSlowQueries = 0;
    const slowestQueries = [];

    for (const [queryKey, stats] of this.queryStats.entries()) {
      totalSlowQueries += stats.slowQueries;
      
      if (stats.maxTime > this.slowQueryThreshold) {
        slowestQueries.push({
          query: queryKey,
          maxTime: stats.maxTime,
          avgTime: stats.avgTime,
          count: stats.count
        });
      }
    }

    // Sort by max time descending
    slowestQueries.sort((a, b) => b.maxTime - a.maxTime);

    return {
      slowQueries: totalSlowQueries,
      slowestQueries: slowestQueries.slice(0, 10) // Top 10 slowest
    };
  }

  // Batch query optimization
  async batchQuery(queries) {
    const results = {};
    const uncachedQueries = [];

    // Check cache for all queries first
    for (const { key, queryFn, ttl } of queries) {
      const cached = await redisCacheService.get(`query:${key}`);
      if (cached) {
        results[key] = cached;
        this.cachedQueries++;
      } else {
        uncachedQueries.push({ key, queryFn, ttl });
      }
    }

    // Execute uncached queries in parallel
    if (uncachedQueries.length > 0) {
      const promises = uncachedQueries.map(async ({ key, queryFn, ttl }) => {
        const startTime = Date.now();
        const result = await queryFn();
        const executionTime = Date.now() - startTime;

        this.trackQueryPerformance(key, executionTime);
        await this.cacheQueryResult(key, result, ttl || 300);

        return { key, result };
      });

      const uncachedResults = await Promise.all(promises);
      uncachedResults.forEach(({ key, result }) => {
        results[key] = result;
      });
    }

    this.totalQueries += queries.length;
    this.updateCacheHitRate();

    return results;
  }

  // Performance monitoring
  async getPerformanceMetrics() {
    return {
      cacheHitRate: this.cacheHitRate,
      totalQueries: this.totalQueries,
      cachedQueries: this.cachedQueries,
      memoryCacheSize: this.queryCache.size,
      queryStats: Object.fromEntries(this.queryStats),
      slowQueryThreshold: this.slowQueryThreshold
    };
  }

  // Cleanup methods
  clearMemoryCache() {
    this.queryCache.clear();
    logger.info('Memory query cache cleared');
  }

  resetStats() {
    this.queryStats.clear();
    this.totalQueries = 0;
    this.cachedQueries = 0;
    this.cacheHitRate = 0;
    logger.info('Query performance stats reset');
  }
}

export default new DatabaseQueryOptimizer();