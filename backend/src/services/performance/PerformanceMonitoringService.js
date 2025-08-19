// import redisCacheService from '../cache/RedisCacheService.js';
import logger from '../LoggerService.js';

class PerformanceMonitoringService {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        averageResponseTime: 0,
        responseTimeHistory: []
      },
      notifications: {
        sent: 0,
        delivered: 0,
        failed: 0,
        averageDeliveryTime: 0,
        deliveryTimeHistory: []
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0,
        averageRetrievalTime: 0
      },
      database: {
        queries: 0,
        slowQueries: 0,
        averageQueryTime: 0,
        connectionPoolUsage: 0
      },
      system: {
        memoryUsage: 0,
        cpuUsage: 0,
        activeConnections: 0,
        queueSize: 0
      }
    };
    
    this.thresholds = {
      responseTime: parseInt(process.env.RESPONSE_TIME_THRESHOLD) || 1000, // 1 second
      deliveryTime: parseInt(process.env.DELIVERY_TIME_THRESHOLD) || 5000, // 5 seconds
      cacheHitRate: parseFloat(process.env.CACHE_HIT_RATE_THRESHOLD) || 80, // 80%
      queryTime: parseInt(process.env.QUERY_TIME_THRESHOLD) || 500, // 500ms
      memoryUsage: parseFloat(process.env.MEMORY_USAGE_THRESHOLD) || 80, // 80%
      cpuUsage: parseFloat(process.env.CPU_USAGE_THRESHOLD) || 80, // 80%
      errorRate: parseFloat(process.env.ERROR_RATE_THRESHOLD) || 5 // 5%
    };
    
    this.alerts = [];
    this.isMonitoring = false;
    this.monitoringInterval = null;
    this.metricsHistory = [];
    this.maxHistorySize = 1000;
  }

  async initialize() {
    try {
      logger.info('Initializing performance monitoring service...');
      
      // Start system monitoring
      this.startSystemMonitoring();
      
      // Load historical metrics from cache
      await this.loadHistoricalMetrics();
      
      this.isMonitoring = true;
      logger.info('Performance monitoring service initialized');
      return true;
    } catch (error) {
      logger.error('Failed to initialize performance monitoring service:', error);
      return false;
    }
  }

  startSystemMonitoring() {
    // Monitor system metrics every 30 seconds
    this.monitoringInterval = setInterval(async () => {
      await this.collectSystemMetrics();
      await this.checkThresholds();
      await this.persistMetrics();
    }, 30000);
  }

  async collectSystemMetrics() {
    try {
      // Collect memory usage
      const memUsage = process.memoryUsage();
      this.metrics.system.memoryUsage = (memUsage.heapUsed / memUsage.heapTotal) * 100;
      
      // Collect CPU usage (simplified)
      this.metrics.system.cpuUsage = await this.getCPUUsage();
      
      // Add to history
      const timestamp = new Date();
      this.metricsHistory.push({
        timestamp,
        metrics: JSON.parse(JSON.stringify(this.metrics))
      });
      
      // Limit history size
      if (this.metricsHistory.length > this.maxHistorySize) {
        this.metricsHistory.shift();
      }
      
      logger.debug('System metrics collected', {
        memory: this.metrics.system.memoryUsage.toFixed(2),
        cpu: this.metrics.system.cpuUsage.toFixed(2)
      });
    } catch (error) {
      logger.error('Error collecting system metrics:', error);
    }
  }

  async getCPUUsage() {
    // Simplified CPU usage calculation
    const startUsage = process.cpuUsage();
    
    return new Promise((resolve) => {
      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const totalUsage = endUsage.user + endUsage.system;
        const cpuPercent = (totalUsage / 1000000) * 100; // Convert to percentage
        resolve(Math.min(cpuPercent, 100));
      }, 100);
    });
  }

  // Request performance tracking
  trackRequest(responseTime, success = true) {
    this.metrics.requests.total++;
    
    if (success) {
      this.metrics.requests.successful++;
    } else {
      this.metrics.requests.failed++;
    }
    
    // Update response time metrics
    this.metrics.requests.responseTimeHistory.push(responseTime);
    if (this.metrics.requests.responseTimeHistory.length > 100) {
      this.metrics.requests.responseTimeHistory.shift();
    }
    
    this.metrics.requests.averageResponseTime = 
      this.metrics.requests.responseTimeHistory.reduce((a, b) => a + b, 0) / 
      this.metrics.requests.responseTimeHistory.length;
    
    // Check for slow requests
    if (responseTime > this.thresholds.responseTime) {
      this.addAlert('slow_request', `Slow request detected: ${responseTime}ms`, {
        responseTime,
        threshold: this.thresholds.responseTime
      });
    }
  }

  // Notification performance tracking
  trackNotification(deliveryTime, success = true) {
    this.metrics.notifications.sent++;
    
    if (success) {
      this.metrics.notifications.delivered++;
    } else {
      this.metrics.notifications.failed++;
    }
    
    // Update delivery time metrics
    if (success) {
      this.metrics.notifications.deliveryTimeHistory.push(deliveryTime);
      if (this.metrics.notifications.deliveryTimeHistory.length > 100) {
        this.metrics.notifications.deliveryTimeHistory.shift();
      }
      
      this.metrics.notifications.averageDeliveryTime = 
        this.metrics.notifications.deliveryTimeHistory.reduce((a, b) => a + b, 0) / 
        this.metrics.notifications.deliveryTimeHistory.length;
    }
    
    // Check for slow deliveries
    if (deliveryTime > this.thresholds.deliveryTime) {
      this.addAlert('slow_delivery', `Slow notification delivery: ${deliveryTime}ms`, {
        deliveryTime,
        threshold: this.thresholds.deliveryTime
      });
    }
  }

  // Cache performance tracking
  trackCacheOperation(hit = true, retrievalTime = 0) {
    if (hit) {
      this.metrics.cache.hits++;
    } else {
      this.metrics.cache.misses++;
    }
    
    const totalOperations = this.metrics.cache.hits + this.metrics.cache.misses;
    this.metrics.cache.hitRate = (this.metrics.cache.hits / totalOperations) * 100;
    
    if (retrievalTime > 0) {
      // Update average retrieval time (simplified)
      this.metrics.cache.averageRetrievalTime = 
        (this.metrics.cache.averageRetrievalTime + retrievalTime) / 2;
    }
    
    // Check cache hit rate
    if (this.metrics.cache.hitRate < this.thresholds.cacheHitRate) {
      this.addAlert('low_cache_hit_rate', `Low cache hit rate: ${this.metrics.cache.hitRate.toFixed(2)}%`, {
        hitRate: this.metrics.cache.hitRate,
        threshold: this.thresholds.cacheHitRate
      });
    }
  }

  // Database performance tracking
  trackDatabaseQuery(queryTime, slow = false) {
    this.metrics.database.queries++;
    
    if (slow) {
      this.metrics.database.slowQueries++;
    }
    
    // Update average query time (simplified)
    this.metrics.database.averageQueryTime = 
      (this.metrics.database.averageQueryTime + queryTime) / 2;
    
    // Check for slow queries
    if (queryTime > this.thresholds.queryTime) {
      this.addAlert('slow_query', `Slow database query: ${queryTime}ms`, {
        queryTime,
        threshold: this.thresholds.queryTime
      });
    }
  }

  // System resource tracking
  updateSystemResources(activeConnections, queueSize, connectionPoolUsage = 0) {
    this.metrics.system.activeConnections = activeConnections;
    this.metrics.system.queueSize = queueSize;
    this.metrics.system.connectionPoolUsage = connectionPoolUsage;
  }

  // Alert management
  addAlert(type, message, metadata = {}) {
    const alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      message,
      metadata,
      timestamp: new Date(),
      severity: this.getAlertSeverity(type),
      acknowledged: false
    };
    
    this.alerts.push(alert);
    
    // Limit alerts history
    if (this.alerts.length > 100) {
      this.alerts.shift();
    }
    
    logger.warn(`Performance alert: ${message}`, metadata);
    
    // Auto-acknowledge low severity alerts after 5 minutes
    if (alert.severity === 'low') {
      setTimeout(() => {
        this.acknowledgeAlert(alert.id);
      }, 300000);
    }
    
    return alert.id;
  }

  getAlertSeverity(type) {
    const severityMap = {
      slow_request: 'medium',
      slow_delivery: 'medium',
      low_cache_hit_rate: 'low',
      slow_query: 'medium',
      high_memory_usage: 'high',
      high_cpu_usage: 'high',
      high_error_rate: 'high',
      system_overload: 'critical'
    };
    
    return severityMap[type] || 'medium';
  }

  acknowledgeAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = new Date();
      logger.info(`Alert acknowledged: ${alertId}`);
      return true;
    }
    return false;
  }

  // Threshold checking
  async checkThresholds() {
    try {
      // Check memory usage
      if (this.metrics.system.memoryUsage > this.thresholds.memoryUsage) {
        this.addAlert('high_memory_usage', 
          `High memory usage: ${this.metrics.system.memoryUsage.toFixed(2)}%`, {
          usage: this.metrics.system.memoryUsage,
          threshold: this.thresholds.memoryUsage
        });
      }
      
      // Check CPU usage
      if (this.metrics.system.cpuUsage > this.thresholds.cpuUsage) {
        this.addAlert('high_cpu_usage', 
          `High CPU usage: ${this.metrics.system.cpuUsage.toFixed(2)}%`, {
          usage: this.metrics.system.cpuUsage,
          threshold: this.thresholds.cpuUsage
        });
      }
      
      // Check error rate
      const errorRate = this.getErrorRate();
      if (errorRate > this.thresholds.errorRate) {
        this.addAlert('high_error_rate', 
          `High error rate: ${errorRate.toFixed(2)}%`, {
          errorRate,
          threshold: this.thresholds.errorRate
        });
      }
      
      // Check for system overload
      if (this.isSystemOverloaded()) {
        this.addAlert('system_overload', 'System overload detected', {
          memory: this.metrics.system.memoryUsage,
          cpu: this.metrics.system.cpuUsage,
          errorRate
        });
      }
    } catch (error) {
      logger.error('Error checking thresholds:', error);
    }
  }

  getErrorRate() {
    const totalRequests = this.metrics.requests.total;
    const failedRequests = this.metrics.requests.failed;
    const failedNotifications = this.metrics.notifications.failed;
    
    if (totalRequests === 0) return 0;
    
    return ((failedRequests + failedNotifications) / totalRequests) * 100;
  }

  isSystemOverloaded() {
    return (
      this.metrics.system.memoryUsage > this.thresholds.memoryUsage &&
      this.metrics.system.cpuUsage > this.thresholds.cpuUsage &&
      this.getErrorRate() > this.thresholds.errorRate
    );
  }

  // Performance optimization recommendations
  async generateOptimizationRecommendations() {
    const recommendations = [];
    
    // Cache optimization
    if (this.metrics.cache.hitRate < this.thresholds.cacheHitRate) {
      recommendations.push({
        type: 'cache_optimization',
        priority: 'medium',
        message: 'Consider increasing cache TTL or optimizing cache keys',
        details: {
          currentHitRate: this.metrics.cache.hitRate,
          targetHitRate: this.thresholds.cacheHitRate
        }
      });
    }
    
    // Database optimization
    const slowQueryRate = (this.metrics.database.slowQueries / this.metrics.database.queries) * 100;
    if (slowQueryRate > 10) {
      recommendations.push({
        type: 'database_optimization',
        priority: 'high',
        message: 'High number of slow queries detected, consider adding indexes',
        details: {
          slowQueryRate,
          averageQueryTime: this.metrics.database.averageQueryTime
        }
      });
    }
    
    // Memory optimization
    if (this.metrics.system.memoryUsage > 70) {
      recommendations.push({
        type: 'memory_optimization',
        priority: 'medium',
        message: 'Consider implementing memory cleanup or increasing heap size',
        details: {
          currentUsage: this.metrics.system.memoryUsage,
          threshold: this.thresholds.memoryUsage
        }
      });
    }
    
    // Queue optimization
    if (this.metrics.system.queueSize > 1000) {
      recommendations.push({
        type: 'queue_optimization',
        priority: 'high',
        message: 'Large queue size detected, consider increasing processing capacity',
        details: {
          queueSize: this.metrics.system.queueSize
        }
      });
    }
    
    return recommendations;
  }

  // Load testing simulation
  async simulateLoad(options = {}) {
    const {
      duration = 60000, // 1 minute
      requestsPerSecond = 10,
      notificationsPerSecond = 5
    } = options;
    
    logger.info('Starting load test simulation', options);
    
    const startTime = Date.now();
    const endTime = startTime + duration;
    
    const requestInterval = setInterval(() => {
      // Simulate requests
      for (let i = 0; i < requestsPerSecond; i++) {
        const responseTime = Math.random() * 2000; // 0-2 seconds
        const success = Math.random() > 0.05; // 95% success rate
        this.trackRequest(responseTime, success);
      }
    }, 1000);
    
    const notificationInterval = setInterval(() => {
      // Simulate notifications
      for (let i = 0; i < notificationsPerSecond; i++) {
        const deliveryTime = Math.random() * 10000; // 0-10 seconds
        const success = Math.random() > 0.02; // 98% success rate
        this.trackNotification(deliveryTime, success);
      }
    }, 1000);
    
    // Wait for test duration
    await new Promise(resolve => setTimeout(resolve, duration));
    
    // Clean up intervals
    clearInterval(requestInterval);
    clearInterval(notificationInterval);
    
    logger.info('Load test simulation completed');
    
    return {
      duration,
      totalRequests: requestsPerSecond * (duration / 1000),
      totalNotifications: notificationsPerSecond * (duration / 1000),
      metrics: this.getMetrics(),
      recommendations: await this.generateOptimizationRecommendations()
    };
  }

  // Capacity planning
  async generateCapacityPlan(targetLoad = {}) {
    const {
      expectedRequestsPerSecond = 100,
      expectedNotificationsPerSecond = 50,
      expectedUsers = 10000
    } = targetLoad;
    
    const currentMetrics = this.getMetrics();
    const recommendations = [];
    
    // Calculate resource requirements
    const memoryPerRequest = this.metrics.system.memoryUsage / this.metrics.requests.total || 0.1;
    const expectedMemoryUsage = memoryPerRequest * expectedRequestsPerSecond * 60; // Per minute
    
    if (expectedMemoryUsage > this.thresholds.memoryUsage) {
      recommendations.push({
        type: 'memory_scaling',
        message: `Increase memory allocation to handle ${expectedRequestsPerSecond} requests/sec`,
        currentCapacity: this.thresholds.memoryUsage,
        requiredCapacity: expectedMemoryUsage
      });
    }
    
    // Database capacity
    const queriesPerRequest = this.metrics.database.queries / this.metrics.requests.total || 2;
    const expectedQueries = expectedRequestsPerSecond * queriesPerRequest;
    
    if (expectedQueries > 1000) { // Arbitrary threshold
      recommendations.push({
        type: 'database_scaling',
        message: `Consider database scaling for ${expectedQueries} queries/sec`,
        expectedQueries
      });
    }
    
    // Cache capacity
    const cacheOperationsPerRequest = (this.metrics.cache.hits + this.metrics.cache.misses) / this.metrics.requests.total || 3;
    const expectedCacheOperations = expectedRequestsPerSecond * cacheOperationsPerRequest;
    
    recommendations.push({
      type: 'cache_scaling',
      message: `Plan for ${expectedCacheOperations} cache operations/sec`,
      expectedOperations: expectedCacheOperations
    });
    
    return {
      targetLoad,
      currentCapacity: currentMetrics,
      recommendations,
      estimatedResourceRequirements: {
        memory: expectedMemoryUsage,
        database: expectedQueries,
        cache: expectedCacheOperations
      }
    };
  }

  // Data persistence
  async persistMetrics() {
    try {
      await redisCacheService.setPerformanceMetrics('current_metrics', this.metrics);
      await redisCacheService.setPerformanceMetrics('alerts', this.alerts);
    } catch (error) {
      logger.error('Error persisting metrics:', error);
    }
  }

  async loadHistoricalMetrics() {
    try {
      const savedMetrics = await redisCacheService.getPerformanceMetrics('current_metrics');
      if (savedMetrics) {
        this.metrics = { ...this.metrics, ...savedMetrics };
      }
      
      const savedAlerts = await redisCacheService.getPerformanceMetrics('alerts');
      if (savedAlerts && Array.isArray(savedAlerts)) {
        this.alerts = savedAlerts;
      }
    } catch (error) {
      logger.error('Error loading historical metrics:', error);
    }
  }

  // Public API methods
  getMetrics() {
    return {
      ...this.metrics,
      timestamp: new Date(),
      uptime: process.uptime(),
      errorRate: this.getErrorRate()
    };
  }

  getAlerts(unacknowledgedOnly = false) {
    if (unacknowledgedOnly) {
      return this.alerts.filter(alert => !alert.acknowledged);
    }
    return this.alerts;
  }

  getMetricsHistory(limit = 100) {
    return this.metricsHistory.slice(-limit);
  }

  async getHealthStatus() {
    const metrics = this.getMetrics();
    const unacknowledgedAlerts = this.getAlerts(true);
    
    let status = 'healthy';
    
    if (unacknowledgedAlerts.some(alert => alert.severity === 'critical')) {
      status = 'critical';
    } else if (unacknowledgedAlerts.some(alert => alert.severity === 'high')) {
      status = 'unhealthy';
    } else if (unacknowledgedAlerts.length > 0) {
      status = 'degraded';
    }
    
    return {
      status,
      metrics,
      alerts: unacknowledgedAlerts,
      recommendations: await this.generateOptimizationRecommendations()
    };
  }

  // Cleanup
  async shutdown() {
    try {
      if (this.monitoringInterval) {
        clearInterval(this.monitoringInterval);
      }
      
      await this.persistMetrics();
      this.isMonitoring = false;
      
      logger.info('Performance monitoring service shutdown');
    } catch (error) {
      logger.error('Error during performance monitoring shutdown:', error);
    }
  }
}

export default new PerformanceMonitoringService();