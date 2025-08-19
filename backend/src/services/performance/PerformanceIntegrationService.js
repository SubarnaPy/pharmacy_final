import performanceMonitoringService from './PerformanceMonitoringService.js';
import autoScalingService from './AutoScalingService.js';
import loadTestingService from './LoadTestingService.js';
import cacheIntegrationService from '../cache/CacheIntegrationService.js';
import logger from '../LoggerService.js';

class PerformanceIntegrationService {
  constructor() {
    this.isInitialized = false;
    this.services = {
      monitoring: performanceMonitoringService,
      scaling: autoScalingService,
      loadTesting: loadTestingService,
      cache: cacheIntegrationService
    };
    this.alertingRules = {
      responseTime: { threshold: 2000, severity: 'high' },
      errorRate: { threshold: 5, severity: 'critical' },
      memoryUsage: { threshold: 85, severity: 'high' },
      cpuUsage: { threshold: 85, severity: 'high' },
      cacheHitRate: { threshold: 70, severity: 'medium' },
      queueSize: { threshold: 1000, severity: 'high' }
    };
    this.optimizationHistory = [];
  }

  async initialize() {
    try {
      logger.info('Initializing performance integration service...');

      // Initialize all performance services
      const initResults = await Promise.allSettled([
        this.services.monitoring.initialize(),
        this.services.scaling.initialize(),
        this.services.loadTesting.initialize(),
        this.services.cache.initialize()
      ]);

      // Check initialization results
      const failures = initResults
        .map((result, index) => ({ result, service: Object.keys(this.services)[index] }))
        .filter(({ result }) => result.status === 'rejected' || !result.value);

      if (failures.length > 0) {
        logger.warn('Some performance services failed to initialize:', failures);
      }

      // Start integrated monitoring
      this.startIntegratedMonitoring();

      this.isInitialized = true;
      logger.info('Performance integration service initialized');
      return true;
    } catch (error) {
      logger.error('Failed to initialize performance integration service:', error);
      return false;
    }
  }

  startIntegratedMonitoring() {
    // Comprehensive monitoring every 2 minutes
    setInterval(async () => {
      await this.performIntegratedHealthCheck();
      await this.optimizeSystemPerformance();
    }, 120000);

    // Quick monitoring every 30 seconds
    setInterval(async () => {
      await this.checkCriticalMetrics();
    }, 30000);
  }

  async performIntegratedHealthCheck() {
    try {
      const healthStatus = {
        timestamp: new Date(),
        overall: 'healthy',
        services: {},
        metrics: {},
        alerts: [],
        recommendations: []
      };

      // Get health from all services
      healthStatus.services.monitoring = await this.services.monitoring.getHealthStatus();
      healthStatus.services.scaling = this.services.scaling.getScalingStatus();
      healthStatus.services.cache = await this.services.cache.healthCheck();

      // Aggregate metrics
      const monitoringMetrics = this.services.monitoring.getMetrics();
      healthStatus.metrics = {
        requests: {
          total: monitoringMetrics.requests.total,
          successful: monitoringMetrics.requests.successful,
          failed: monitoringMetrics.requests.failed,
          averageResponseTime: monitoringMetrics.requests.averageResponseTime,
          errorRate: monitoringMetrics.errorRate
        },
        system: {
          memoryUsage: monitoringMetrics.system.memoryUsage,
          cpuUsage: monitoringMetrics.system.cpuUsage,
          activeConnections: monitoringMetrics.system.activeConnections,
          queueSize: monitoringMetrics.system.queueSize
        },
        cache: {
          hitRate: monitoringMetrics.cache.hitRate,
          hits: monitoringMetrics.cache.hits,
          misses: monitoringMetrics.cache.misses
        },
        scaling: {
          currentInstances: healthStatus.services.scaling.currentInstances,
          enabled: healthStatus.services.scaling.enabled
        }
      };

      // Determine overall health
      healthStatus.overall = this.determineOverallHealth(healthStatus);

      // Generate integrated recommendations
      healthStatus.recommendations = await this.generateIntegratedRecommendations(healthStatus);

      // Store health status
      await this.services.cache.cacheNotificationData('system_health', healthStatus, 300);

      logger.debug('Integrated health check completed', {
        overall: healthStatus.overall,
        alerts: healthStatus.alerts.length,
        recommendations: healthStatus.recommendations.length
      });

      return healthStatus;
    } catch (error) {
      logger.error('Error during integrated health check:', error);
      return {
        overall: 'error',
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  determineOverallHealth(healthStatus) {
    const metrics = healthStatus.metrics;
    
    // Critical conditions
    if (metrics.requests.errorRate > 10 || 
        metrics.system.memoryUsage > 95 || 
        metrics.system.cpuUsage > 95) {
      return 'critical';
    }
    
    // Unhealthy conditions
    if (metrics.requests.errorRate > 5 || 
        metrics.system.memoryUsage > 85 || 
        metrics.system.cpuUsage > 85 ||
        metrics.requests.averageResponseTime > 3000) {
      return 'unhealthy';
    }
    
    // Degraded conditions
    if (metrics.requests.errorRate > 2 || 
        metrics.system.memoryUsage > 75 || 
        metrics.system.cpuUsage > 75 ||
        metrics.cache.hitRate < 70) {
      return 'degraded';
    }
    
    return 'healthy';
  }

  async checkCriticalMetrics() {
    try {
      const metrics = this.services.monitoring.getMetrics();
      const alerts = [];

      // Check each alerting rule
      for (const [metric, rule] of Object.entries(this.alertingRules)) {
        const value = this.getMetricValue(metrics, metric);
        
        if (this.isThresholdExceeded(value, rule, metric)) {
          alerts.push({
            metric,
            value,
            threshold: rule.threshold,
            severity: rule.severity,
            timestamp: new Date()
          });
        }
      }

      // Process alerts
      for (const alert of alerts) {
        await this.processAlert(alert);
      }

      return alerts;
    } catch (error) {
      logger.error('Error checking critical metrics:', error);
      return [];
    }
  }

  getMetricValue(metrics, metricName) {
    const metricPaths = {
      responseTime: metrics.requests.averageResponseTime,
      errorRate: metrics.errorRate,
      memoryUsage: metrics.system.memoryUsage,
      cpuUsage: metrics.system.cpuUsage,
      cacheHitRate: metrics.cache.hitRate,
      queueSize: metrics.system.queueSize
    };

    return metricPaths[metricName] || 0;
  }

  isThresholdExceeded(value, rule, metric) {
    // For cache hit rate, we want to alert when it's BELOW threshold
    if (metric === 'cacheHitRate') {
      return value < rule.threshold;
    }
    
    // For other metrics, alert when ABOVE threshold
    return value > rule.threshold;
  }

  async processAlert(alert) {
    logger.warn(`Performance alert: ${alert.metric}`, alert);

    // Add to monitoring service
    this.services.monitoring.addAlert(
      `performance_${alert.metric}`,
      `${alert.metric} threshold exceeded: ${alert.value} (threshold: ${alert.threshold})`,
      alert
    );

    // Trigger automatic responses based on severity
    if (alert.severity === 'critical') {
      await this.handleCriticalAlert(alert);
    } else if (alert.severity === 'high') {
      await this.handleHighSeverityAlert(alert);
    }
  }

  async handleCriticalAlert(alert) {
    logger.error(`Critical performance alert: ${alert.metric}`, alert);

    // Automatic scaling for resource issues
    if (alert.metric === 'memoryUsage' || alert.metric === 'cpuUsage') {
      try {
        await this.services.scaling.manualScale(
          this.services.scaling.currentInstances + 1,
          `Critical ${alert.metric} alert`
        );
      } catch (error) {
        logger.error('Failed to auto-scale for critical alert:', error);
      }
    }

    // Cache optimization for cache issues
    if (alert.metric === 'cacheHitRate') {
      await this.services.cache.optimizePerformance();
    }
  }

  async handleHighSeverityAlert(alert) {
    logger.warn(`High severity performance alert: ${alert.metric}`, alert);

    // Queue optimization
    if (alert.metric === 'queueSize') {
      // Trigger queue optimization
      const queueStats = await this.services.cache.getQueueStatsWithCache();
      if (queueStats) {
        logger.info('Triggering queue optimization due to high queue size');
      }
    }
  }

  async optimizeSystemPerformance() {
    try {
      const optimizations = [];

      // Cache optimization
      const cacheOptimization = await this.services.cache.optimizePerformance();
      optimizations.push({
        service: 'cache',
        timestamp: new Date(),
        ...cacheOptimization
      });

      // Scaling optimization
      const scalingOptimization = await this.services.scaling.optimizeResourceAllocation();
      optimizations.push({
        service: 'scaling',
        timestamp: new Date(),
        ...scalingOptimization
      });

      // Performance monitoring optimization
      const monitoringRecommendations = await this.services.monitoring.generateOptimizationRecommendations();
      optimizations.push({
        service: 'monitoring',
        timestamp: new Date(),
        recommendations: monitoringRecommendations
      });

      // Store optimization history
      this.optimizationHistory.push({
        timestamp: new Date(),
        optimizations
      });

      // Limit history size
      if (this.optimizationHistory.length > 100) {
        this.optimizationHistory.shift();
      }

      logger.debug('System performance optimization completed', {
        optimizationsCount: optimizations.length
      });

      return optimizations;
    } catch (error) {
      logger.error('Error during system performance optimization:', error);
      return [];
    }
  }

  async generateIntegratedRecommendations(healthStatus) {
    const recommendations = [];
    const metrics = healthStatus.metrics;

    // Performance recommendations
    if (metrics.requests.averageResponseTime > 1000) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        category: 'response_time',
        message: 'High response times detected. Consider database optimization and caching improvements.',
        currentValue: metrics.requests.averageResponseTime,
        targetValue: 500,
        actions: [
          'Optimize database queries',
          'Increase cache TTL',
          'Add database indexes',
          'Consider horizontal scaling'
        ]
      });
    }

    // Scaling recommendations
    if (metrics.system.memoryUsage > 80 || metrics.system.cpuUsage > 80) {
      recommendations.push({
        type: 'scaling',
        priority: 'medium',
        category: 'resource_usage',
        message: 'High resource usage detected. Consider scaling up.',
        currentValue: {
          memory: metrics.system.memoryUsage,
          cpu: metrics.system.cpuUsage
        },
        actions: [
          'Enable auto-scaling',
          'Increase instance count',
          'Optimize resource-intensive operations',
          'Implement resource monitoring alerts'
        ]
      });
    }

    // Cache recommendations
    if (metrics.cache.hitRate < 80) {
      recommendations.push({
        type: 'caching',
        priority: 'medium',
        category: 'cache_optimization',
        message: 'Low cache hit rate detected. Optimize caching strategy.',
        currentValue: metrics.cache.hitRate,
        targetValue: 90,
        actions: [
          'Increase cache TTL for stable data',
          'Implement cache warming',
          'Optimize cache keys',
          'Add more cache layers'
        ]
      });
    }

    // Queue recommendations
    if (metrics.system.queueSize > 500) {
      recommendations.push({
        type: 'queue',
        priority: 'high',
        category: 'queue_management',
        message: 'Large queue size detected. Improve processing capacity.',
        currentValue: metrics.system.queueSize,
        targetValue: 100,
        actions: [
          'Increase queue workers',
          'Optimize queue processing',
          'Implement queue prioritization',
          'Add queue monitoring'
        ]
      });
    }

    return recommendations;
  }

  // Load testing integration
  async runPerformanceTest(scenario = 'moderate', customConfig = {}) {
    try {
      logger.info(`Starting integrated performance test: ${scenario}`);

      // Capture baseline metrics
      const baselineMetrics = this.services.monitoring.getMetrics();

      // Run load test
      const testResult = await this.services.loadTesting.startLoadTest(scenario, customConfig);

      // Monitor during test
      const monitoringPromise = this.monitorDuringLoadTest(testResult.testId);

      // Wait for test completion and monitoring
      const [, monitoringResults] = await Promise.all([
        this.waitForTestCompletion(testResult.testId),
        monitoringPromise
      ]);

      // Generate comprehensive report
      const testReport = this.services.loadTesting.getTestReport(testResult.testId);
      const comprehensiveReport = {
        ...testReport,
        baseline: baselineMetrics,
        monitoring: monitoringResults,
        systemImpact: await this.analyzeSystemImpact(baselineMetrics),
        recommendations: await this.generatePostTestRecommendations(testReport)
      };

      logger.info(`Performance test completed: ${testResult.testId}`);
      return comprehensiveReport;
    } catch (error) {
      logger.error('Error running performance test:', error);
      throw error;
    }
  }

  async monitorDuringLoadTest(testId) {
    const monitoringData = [];
    const startTime = Date.now();

    return new Promise((resolve) => {
      const monitoringInterval = setInterval(() => {
        const test = this.services.loadTesting.getTestReport(testId);
        
        if (!test || test.status !== 'running') {
          clearInterval(monitoringInterval);
          resolve(monitoringData);
          return;
        }

        const metrics = this.services.monitoring.getMetrics();
        monitoringData.push({
          timestamp: new Date(),
          elapsed: Date.now() - startTime,
          metrics
        });
      }, 10000); // Every 10 seconds
    });
  }

  async waitForTestCompletion(testId) {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const test = this.services.loadTesting.getTestReport(testId);
        
        if (!test || test.status !== 'running') {
          clearInterval(checkInterval);
          resolve(test);
        }
      }, 5000);
    });
  }

  async analyzeSystemImpact(baselineMetrics) {
    const currentMetrics = this.services.monitoring.getMetrics();
    
    return {
      memoryIncrease: currentMetrics.system.memoryUsage - baselineMetrics.system.memoryUsage,
      cpuIncrease: currentMetrics.system.cpuUsage - baselineMetrics.system.cpuUsage,
      responseTimeIncrease: currentMetrics.requests.averageResponseTime - baselineMetrics.requests.averageResponseTime,
      errorRateIncrease: currentMetrics.errorRate - baselineMetrics.errorRate,
      cacheHitRateChange: currentMetrics.cache.hitRate - baselineMetrics.cache.hitRate
    };
  }

  async generatePostTestRecommendations(testReport) {
    const recommendations = [];

    if (testReport.assessment.overall === 'poor') {
      recommendations.push({
        type: 'critical',
        message: 'System performance is poor under load. Immediate optimization required.',
        actions: [
          'Investigate bottlenecks',
          'Optimize database queries',
          'Increase system resources',
          'Implement caching'
        ]
      });
    }

    if (testReport.errorRate > 5) {
      recommendations.push({
        type: 'reliability',
        message: 'High error rate during load test. Improve error handling and system stability.',
        actions: [
          'Review error logs',
          'Implement circuit breakers',
          'Add retry mechanisms',
          'Improve error handling'
        ]
      });
    }

    return recommendations;
  }

  // Capacity planning
  async generateCapacityPlan(targetMetrics = {}) {
    const currentMetrics = this.services.monitoring.getMetrics();
    const scalingStatus = this.services.scaling.getScalingStatus();
    
    const plan = {
      current: {
        instances: scalingStatus.currentInstances,
        metrics: currentMetrics
      },
      target: targetMetrics,
      recommendations: []
    };

    // Calculate required scaling
    if (targetMetrics.requestsPerSecond) {
      const currentRPS = currentMetrics.requests.total / (process.uptime() || 1);
      const scalingFactor = targetMetrics.requestsPerSecond / currentRPS;
      
      if (scalingFactor > 1.5) {
        plan.recommendations.push({
          type: 'scaling',
          message: `Scale up to ${Math.ceil(scalingStatus.currentInstances * scalingFactor)} instances`,
          reason: `To handle ${targetMetrics.requestsPerSecond} requests/second`
        });
      }
    }

    // Memory planning
    if (targetMetrics.expectedUsers) {
      const memoryPerUser = currentMetrics.system.memoryUsage / (currentMetrics.system.activeConnections || 1);
      const expectedMemoryUsage = memoryPerUser * targetMetrics.expectedUsers;
      
      if (expectedMemoryUsage > 80) {
        plan.recommendations.push({
          type: 'memory',
          message: 'Increase memory allocation or optimize memory usage',
          expectedUsage: expectedMemoryUsage
        });
      }
    }

    return plan;
  }

  // Public API methods
  async getSystemStatus() {
    return await this.performIntegratedHealthCheck();
  }

  async getPerformanceMetrics() {
    const monitoring = this.services.monitoring.getMetrics();
    const scaling = this.services.scaling.getScalingStatus();
    const cache = await this.services.cache.getSystemStats();

    return {
      monitoring,
      scaling,
      cache,
      timestamp: new Date()
    };
  }

  async getOptimizationHistory(limit = 20) {
    return this.optimizationHistory.slice(-limit);
  }

  async triggerOptimization() {
    return await this.optimizeSystemPerformance();
  }

  // Configuration management
  updateAlertingRules(newRules) {
    this.alertingRules = { ...this.alertingRules, ...newRules };
    logger.info('Alerting rules updated', newRules);
  }

  getAlertingRules() {
    return this.alertingRules;
  }

  // Cleanup
  async shutdown() {
    try {
      logger.info('Shutting down performance integration service...');

      // Shutdown all services
      await Promise.allSettled([
        this.services.monitoring.shutdown(),
        this.services.scaling.shutdown(),
        this.services.loadTesting.shutdown(),
        this.services.cache.shutdown()
      ]);

      this.isInitialized = false;
      logger.info('Performance integration service shutdown complete');
    } catch (error) {
      logger.error('Error during performance integration service shutdown:', error);
    }
  }
}

export default new PerformanceIntegrationService();