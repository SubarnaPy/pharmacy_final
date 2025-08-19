import performanceMonitoringService from './PerformanceMonitoringService.js';
import logger from '../LoggerService.js';

class AutoScalingService {
  constructor() {
    this.isEnabled = process.env.AUTO_SCALING_ENABLED === 'true';
    this.scalingRules = {
      scaleUp: {
        cpuThreshold: 80,
        memoryThreshold: 80,
        responseTimeThreshold: 2000,
        errorRateThreshold: 5,
        queueSizeThreshold: 1000
      },
      scaleDown: {
        cpuThreshold: 30,
        memoryThreshold: 30,
        responseTimeThreshold: 500,
        errorRateThreshold: 1,
        queueSizeThreshold: 100
      },
      cooldownPeriod: 300000, // 5 minutes
      maxInstances: parseInt(process.env.MAX_INSTANCES) || 10,
      minInstances: parseInt(process.env.MIN_INSTANCES) || 1
    };
    
    this.currentInstances = 1;
    this.lastScalingAction = null;
    this.scalingHistory = [];
    this.isMonitoring = false;
    this.monitoringInterval = null;
  }

  async initialize() {
    try {
      logger.info('Initializing auto-scaling service...');
      
      if (!this.isEnabled) {
        logger.info('Auto-scaling is disabled');
        return true;
      }
      
      // Start monitoring for scaling decisions
      this.startScalingMonitoring();
      
      this.isMonitoring = true;
      logger.info('Auto-scaling service initialized');
      return true;
    } catch (error) {
      logger.error('Failed to initialize auto-scaling service:', error);
      return false;
    }
  }

  startScalingMonitoring() {
    // Check scaling conditions every 2 minutes
    this.monitoringInterval = setInterval(async () => {
      await this.evaluateScalingConditions();
    }, 120000);
  }

  async evaluateScalingConditions() {
    try {
      if (!this.isEnabled) return;
      
      // Check cooldown period
      if (this.isInCooldownPeriod()) {
        logger.debug('Auto-scaling in cooldown period, skipping evaluation');
        return;
      }
      
      const metrics = performanceMonitoringService.getMetrics();
      const scaleUpNeeded = this.shouldScaleUp(metrics);
      const scaleDownNeeded = this.shouldScaleDown(metrics);
      
      if (scaleUpNeeded && this.currentInstances < this.scalingRules.maxInstances) {
        await this.scaleUp(metrics);
      } else if (scaleDownNeeded && this.currentInstances > this.scalingRules.minInstances) {
        await this.scaleDown(metrics);
      }
    } catch (error) {
      logger.error('Error evaluating scaling conditions:', error);
    }
  }

  shouldScaleUp(metrics) {
    const rules = this.scalingRules.scaleUp;
    const conditions = [];
    
    // Check CPU usage
    if (metrics.system.cpuUsage > rules.cpuThreshold) {
      conditions.push(`CPU: ${metrics.system.cpuUsage.toFixed(2)}% > ${rules.cpuThreshold}%`);
    }
    
    // Check memory usage
    if (metrics.system.memoryUsage > rules.memoryThreshold) {
      conditions.push(`Memory: ${metrics.system.memoryUsage.toFixed(2)}% > ${rules.memoryThreshold}%`);
    }
    
    // Check response time
    if (metrics.requests.averageResponseTime > rules.responseTimeThreshold) {
      conditions.push(`Response time: ${metrics.requests.averageResponseTime.toFixed(2)}ms > ${rules.responseTimeThreshold}ms`);
    }
    
    // Check error rate
    if (metrics.errorRate > rules.errorRateThreshold) {
      conditions.push(`Error rate: ${metrics.errorRate.toFixed(2)}% > ${rules.errorRateThreshold}%`);
    }
    
    // Check queue size
    if (metrics.system.queueSize > rules.queueSizeThreshold) {
      conditions.push(`Queue size: ${metrics.system.queueSize} > ${rules.queueSizeThreshold}`);
    }
    
    // Scale up if at least 2 conditions are met
    const shouldScale = conditions.length >= 2;
    
    if (shouldScale) {
      logger.info('Scale up conditions met:', conditions);
    }
    
    return shouldScale;
  }

  shouldScaleDown(metrics) {
    const rules = this.scalingRules.scaleDown;
    const conditions = [];
    
    // Check CPU usage
    if (metrics.system.cpuUsage < rules.cpuThreshold) {
      conditions.push(`CPU: ${metrics.system.cpuUsage.toFixed(2)}% < ${rules.cpuThreshold}%`);
    }
    
    // Check memory usage
    if (metrics.system.memoryUsage < rules.memoryThreshold) {
      conditions.push(`Memory: ${metrics.system.memoryUsage.toFixed(2)}% < ${rules.memoryThreshold}%`);
    }
    
    // Check response time
    if (metrics.requests.averageResponseTime < rules.responseTimeThreshold) {
      conditions.push(`Response time: ${metrics.requests.averageResponseTime.toFixed(2)}ms < ${rules.responseTimeThreshold}ms`);
    }
    
    // Check error rate
    if (metrics.errorRate < rules.errorRateThreshold) {
      conditions.push(`Error rate: ${metrics.errorRate.toFixed(2)}% < ${rules.errorRateThreshold}%`);
    }
    
    // Check queue size
    if (metrics.system.queueSize < rules.queueSizeThreshold) {
      conditions.push(`Queue size: ${metrics.system.queueSize} < ${rules.queueSizeThreshold}`);
    }
    
    // Scale down if all conditions are met and we have more than minimum instances
    const shouldScale = conditions.length >= 4 && this.currentInstances > this.scalingRules.minInstances;
    
    if (shouldScale) {
      logger.info('Scale down conditions met:', conditions);
    }
    
    return shouldScale;
  }

  async scaleUp(metrics) {
    try {
      const newInstanceCount = Math.min(
        this.currentInstances + 1,
        this.scalingRules.maxInstances
      );
      
      logger.info(`Scaling up from ${this.currentInstances} to ${newInstanceCount} instances`);
      
      // Simulate scaling action (in real implementation, this would interact with container orchestration)
      const scalingResult = await this.performScalingAction('up', newInstanceCount, metrics);
      
      if (scalingResult.success) {
        this.currentInstances = newInstanceCount;
        this.recordScalingAction('up', newInstanceCount, metrics, scalingResult);
        
        // Trigger performance alert
        performanceMonitoringService.addAlert('auto_scale_up', 
          `Auto-scaled up to ${newInstanceCount} instances`, {
          previousInstances: this.currentInstances - 1,
          newInstances: newInstanceCount,
          trigger: scalingResult.trigger
        });
      }
      
      return scalingResult;
    } catch (error) {
      logger.error('Error during scale up:', error);
      return { success: false, error: error.message };
    }
  }

  async scaleDown(metrics) {
    try {
      const newInstanceCount = Math.max(
        this.currentInstances - 1,
        this.scalingRules.minInstances
      );
      
      logger.info(`Scaling down from ${this.currentInstances} to ${newInstanceCount} instances`);
      
      // Simulate scaling action
      const scalingResult = await this.performScalingAction('down', newInstanceCount, metrics);
      
      if (scalingResult.success) {
        this.currentInstances = newInstanceCount;
        this.recordScalingAction('down', newInstanceCount, metrics, scalingResult);
        
        // Trigger performance alert
        performanceMonitoringService.addAlert('auto_scale_down', 
          `Auto-scaled down to ${newInstanceCount} instances`, {
          previousInstances: this.currentInstances + 1,
          newInstances: newInstanceCount,
          trigger: scalingResult.trigger
        });
      }
      
      return scalingResult;
    } catch (error) {
      logger.error('Error during scale down:', error);
      return { success: false, error: error.message };
    }
  }

  async performScalingAction(direction, targetInstances, metrics) {
    // Simulate scaling action - in real implementation, this would:
    // 1. Interact with container orchestration (Docker Swarm, Kubernetes, etc.)
    // 2. Update load balancer configuration
    // 3. Manage database connections
    // 4. Handle graceful shutdown/startup
    
    return new Promise((resolve) => {
      setTimeout(() => {
        const success = Math.random() > 0.1; // 90% success rate
        
        resolve({
          success,
          action: direction,
          targetInstances,
          timestamp: new Date(),
          trigger: {
            cpu: metrics.system.cpuUsage,
            memory: metrics.system.memoryUsage,
            responseTime: metrics.requests.averageResponseTime,
            errorRate: metrics.errorRate,
            queueSize: metrics.system.queueSize
          },
          duration: Math.random() * 30000 + 10000 // 10-40 seconds
        });
      }, 2000); // Simulate 2 second scaling operation
    });
  }

  recordScalingAction(direction, instanceCount, metrics, result) {
    const record = {
      id: `scaling_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      direction,
      instanceCount,
      previousCount: direction === 'up' ? instanceCount - 1 : instanceCount + 1,
      timestamp: new Date(),
      metrics: {
        cpu: metrics.system.cpuUsage,
        memory: metrics.system.memoryUsage,
        responseTime: metrics.requests.averageResponseTime,
        errorRate: metrics.errorRate,
        queueSize: metrics.system.queueSize
      },
      result
    };
    
    this.scalingHistory.push(record);
    this.lastScalingAction = record;
    
    // Limit history size
    if (this.scalingHistory.length > 100) {
      this.scalingHistory.shift();
    }
    
    logger.info('Scaling action recorded', {
      id: record.id,
      direction,
      instanceCount,
      success: result.success
    });
  }

  isInCooldownPeriod() {
    if (!this.lastScalingAction) return false;
    
    const timeSinceLastAction = Date.now() - this.lastScalingAction.timestamp.getTime();
    return timeSinceLastAction < this.scalingRules.cooldownPeriod;
  }

  // Resource management
  async optimizeResourceAllocation() {
    const metrics = performanceMonitoringService.getMetrics();
    const recommendations = [];
    
    // CPU optimization
    if (metrics.system.cpuUsage > 70) {
      recommendations.push({
        type: 'cpu_optimization',
        message: 'Consider CPU-intensive task optimization or horizontal scaling',
        currentUsage: metrics.system.cpuUsage,
        recommendation: 'scale_up'
      });
    }
    
    // Memory optimization
    if (metrics.system.memoryUsage > 70) {
      recommendations.push({
        type: 'memory_optimization',
        message: 'Consider memory cleanup or increasing heap size',
        currentUsage: metrics.system.memoryUsage,
        recommendation: 'optimize_memory'
      });
    }
    
    // Queue optimization
    if (metrics.system.queueSize > 500) {
      recommendations.push({
        type: 'queue_optimization',
        message: 'Consider increasing queue processing capacity',
        currentSize: metrics.system.queueSize,
        recommendation: 'increase_workers'
      });
    }
    
    return {
      currentResources: {
        instances: this.currentInstances,
        cpu: metrics.system.cpuUsage,
        memory: metrics.system.memoryUsage,
        queueSize: metrics.system.queueSize
      },
      recommendations,
      scalingHistory: this.getRecentScalingHistory(10)
    };
  }

  // Manual scaling
  async manualScale(targetInstances, reason = 'manual') {
    if (targetInstances < this.scalingRules.minInstances || 
        targetInstances > this.scalingRules.maxInstances) {
      throw new Error(`Target instances must be between ${this.scalingRules.minInstances} and ${this.scalingRules.maxInstances}`);
    }
    
    const metrics = performanceMonitoringService.getMetrics();
    const direction = targetInstances > this.currentInstances ? 'up' : 'down';
    
    logger.info(`Manual scaling ${direction} to ${targetInstances} instances`, { reason });
    
    const scalingResult = await this.performScalingAction(direction, targetInstances, metrics);
    
    if (scalingResult.success) {
      this.currentInstances = targetInstances;
      this.recordScalingAction(direction, targetInstances, metrics, {
        ...scalingResult,
        manual: true,
        reason
      });
    }
    
    return scalingResult;
  }

  // Configuration management
  updateScalingRules(newRules) {
    this.scalingRules = { ...this.scalingRules, ...newRules };
    logger.info('Scaling rules updated', newRules);
  }

  enableAutoScaling() {
    this.isEnabled = true;
    if (!this.isMonitoring) {
      this.startScalingMonitoring();
      this.isMonitoring = true;
    }
    logger.info('Auto-scaling enabled');
  }

  disableAutoScaling() {
    this.isEnabled = false;
    logger.info('Auto-scaling disabled');
  }

  // Status and reporting
  getScalingStatus() {
    return {
      enabled: this.isEnabled,
      currentInstances: this.currentInstances,
      rules: this.scalingRules,
      lastAction: this.lastScalingAction,
      inCooldown: this.isInCooldownPeriod(),
      cooldownRemaining: this.isInCooldownPeriod() ? 
        this.scalingRules.cooldownPeriod - (Date.now() - this.lastScalingAction.timestamp.getTime()) : 0
    };
  }

  getScalingHistory(limit = 50) {
    return this.scalingHistory.slice(-limit);
  }

  getRecentScalingHistory(limit = 10) {
    return this.scalingHistory.slice(-limit);
  }

  // Predictive scaling
  async predictScalingNeeds(timeHorizon = 3600000) { // 1 hour
    const metricsHistory = performanceMonitoringService.getMetricsHistory(100);
    
    if (metricsHistory.length < 10) {
      return {
        prediction: 'insufficient_data',
        message: 'Not enough historical data for prediction'
      };
    }
    
    // Simple trend analysis
    const recentMetrics = metricsHistory.slice(-10);
    const cpuTrend = this.calculateTrend(recentMetrics.map(m => m.metrics.system.cpuUsage));
    const memoryTrend = this.calculateTrend(recentMetrics.map(m => m.metrics.system.memoryUsage));
    const responseTrend = this.calculateTrend(recentMetrics.map(m => m.metrics.requests.averageResponseTime));
    
    const predictions = [];
    
    if (cpuTrend > 5) { // Increasing by more than 5% per measurement
      predictions.push({
        metric: 'cpu',
        trend: 'increasing',
        recommendation: 'prepare_scale_up',
        confidence: 0.7
      });
    }
    
    if (memoryTrend > 5) {
      predictions.push({
        metric: 'memory',
        trend: 'increasing',
        recommendation: 'prepare_scale_up',
        confidence: 0.7
      });
    }
    
    if (responseTrend > 100) { // Response time increasing by more than 100ms
      predictions.push({
        metric: 'response_time',
        trend: 'increasing',
        recommendation: 'prepare_scale_up',
        confidence: 0.6
      });
    }
    
    return {
      timeHorizon,
      predictions,
      currentInstances: this.currentInstances,
      recommendedAction: predictions.length > 0 ? 'prepare_scale_up' : 'maintain'
    };
  }

  calculateTrend(values) {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
    const sumX2 = values.reduce((sum, _, x) => sum + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  // Cleanup
  async shutdown() {
    try {
      if (this.monitoringInterval) {
        clearInterval(this.monitoringInterval);
      }
      
      this.isMonitoring = false;
      logger.info('Auto-scaling service shutdown');
    } catch (error) {
      logger.error('Error during auto-scaling service shutdown:', error);
    }
  }
}

export default new AutoScalingService();