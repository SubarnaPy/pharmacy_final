import NotificationTemplate from '../../models/NotificationTemplate.js';
import NotificationAnalytics from '../../models/NotificationAnalytics.js';

/**
 * Template Performance Monitor
 * Monitors and analyzes template performance, usage patterns, and optimization opportunities
 */
class TemplatePerformanceMonitor {
  constructor(options = {}) {
    this.performanceData = new Map();
    this.renderingMetrics = new Map();
    this.usagePatterns = new Map();
    this.optimizationSuggestions = new Map();
    
    // Performance thresholds
    this.thresholds = {
      renderTime: options.renderTimeThreshold || 1000, // 1 second
      cacheHitRate: options.cacheHitRateThreshold || 0.8, // 80%
      errorRate: options.errorRateThreshold || 0.05, // 5%
      engagementRate: options.engagementRateThreshold || 0.1, // 10%
      deliveryRate: options.deliveryRateThreshold || 0.95 // 95%
    };
    
    // Monitoring intervals
    this.monitoringInterval = options.monitoringInterval || 300000; // 5 minutes
    this.cleanupInterval = options.cleanupInterval || 86400000; // 24 hours
    
    this.startMonitoring();
    
    console.log('✅ Template Performance Monitor initialized');
  }

  /**
   * Start performance monitoring
   */
  startMonitoring() {
    // Performance data collection
    setInterval(() => {
      this.collectPerformanceData();
    }, this.monitoringInterval);

    // Cleanup old data
    setInterval(() => {
      this.cleanupOldData();
    }, this.cleanupInterval);

    // Generate optimization suggestions
    setInterval(() => {
      this.generateOptimizationSuggestions();
    }, this.monitoringInterval * 2); // Every 10 minutes
  }

  /**
   * Record template rendering performance
   * @param {string} templateId - Template ID
   * @param {string} channel - Delivery channel
   * @param {number} renderTime - Rendering time in ms
   * @param {boolean} success - Success status
   * @param {Object} metadata - Additional metadata
   */
  recordRenderingPerformance(templateId, channel, renderTime, success, metadata = {}) {
    const key = `${templateId}_${channel}`;
    
    if (!this.renderingMetrics.has(key)) {
      this.renderingMetrics.set(key, {
        templateId,
        channel,
        totalRenders: 0,
        successfulRenders: 0,
        failedRenders: 0,
        totalRenderTime: 0,
        averageRenderTime: 0,
        minRenderTime: Infinity,
        maxRenderTime: 0,
        lastRenderTime: null,
        renderTimeHistory: [],
        errorHistory: []
      });
    }

    const metrics = this.renderingMetrics.get(key);
    
    // Update metrics
    metrics.totalRenders++;
    metrics.totalRenderTime += renderTime;
    metrics.averageRenderTime = metrics.totalRenderTime / metrics.totalRenders;
    metrics.minRenderTime = Math.min(metrics.minRenderTime, renderTime);
    metrics.maxRenderTime = Math.max(metrics.maxRenderTime, renderTime);
    metrics.lastRenderTime = new Date();

    if (success) {
      metrics.successfulRenders++;
    } else {
      metrics.failedRenders++;
      metrics.errorHistory.push({
        timestamp: new Date(),
        error: metadata.error,
        renderTime
      });
    }

    // Keep render time history (last 100 renders)
    metrics.renderTimeHistory.push({
      timestamp: new Date(),
      renderTime,
      success
    });
    
    if (metrics.renderTimeHistory.length > 100) {
      metrics.renderTimeHistory.shift();
    }

    // Keep error history (last 50 errors)
    if (metrics.errorHistory.length > 50) {
      metrics.errorHistory.shift();
    }

    // Check for performance issues
    this.checkPerformanceThresholds(key, metrics);
  }

  /**
   * Record template usage patterns
   * @param {string} templateId - Template ID
   * @param {string} type - Usage type
   * @param {Object} context - Usage context
   */
  recordUsagePattern(templateId, type, context = {}) {
    if (!this.usagePatterns.has(templateId)) {
      this.usagePatterns.set(templateId, {
        templateId,
        totalUsage: 0,
        usageByChannel: new Map(),
        usageByRole: new Map(),
        usageByTime: new Map(),
        usageByType: new Map(),
        peakUsageTimes: [],
        lastUsed: null
      });
    }

    const patterns = this.usagePatterns.get(templateId);
    patterns.totalUsage++;
    patterns.lastUsed = new Date();

    // Track usage by channel
    if (context.channel) {
      const channelCount = patterns.usageByChannel.get(context.channel) || 0;
      patterns.usageByChannel.set(context.channel, channelCount + 1);
    }

    // Track usage by role
    if (context.userRole) {
      const roleCount = patterns.usageByRole.get(context.userRole) || 0;
      patterns.usageByRole.set(context.userRole, roleCount + 1);
    }

    // Track usage by hour of day
    const hour = new Date().getHours();
    const hourCount = patterns.usageByTime.get(hour) || 0;
    patterns.usageByTime.set(hour, hourCount + 1);

    // Track usage by type
    const typeCount = patterns.usageByType.get(type) || 0;
    patterns.usageByType.set(type, typeCount + 1);

    // Detect peak usage times
    this.detectPeakUsage(templateId, patterns);
  }

  /**
   * Get performance metrics for a template
   * @param {string} templateId - Template ID
   * @returns {Object} Performance metrics
   */
  getTemplatePerformanceMetrics(templateId) {
    const templateMetrics = {};
    
    // Collect rendering metrics for all channels
    for (const [key, metrics] of this.renderingMetrics.entries()) {
      if (metrics.templateId === templateId) {
        templateMetrics[metrics.channel] = {
          ...metrics,
          errorRate: metrics.totalRenders > 0 ? metrics.failedRenders / metrics.totalRenders : 0,
          successRate: metrics.totalRenders > 0 ? metrics.successfulRenders / metrics.totalRenders : 0,
          performanceScore: this.calculatePerformanceScore(metrics)
        };
      }
    }

    // Add usage patterns
    const usagePatterns = this.usagePatterns.get(templateId);
    if (usagePatterns) {
      templateMetrics.usage = {
        totalUsage: usagePatterns.totalUsage,
        channelDistribution: Object.fromEntries(usagePatterns.usageByChannel),
        roleDistribution: Object.fromEntries(usagePatterns.usageByRole),
        timeDistribution: Object.fromEntries(usagePatterns.usageByTime),
        peakUsageTimes: usagePatterns.peakUsageTimes,
        lastUsed: usagePatterns.lastUsed
      };
    }

    // Add optimization suggestions
    const suggestions = this.optimizationSuggestions.get(templateId);
    if (suggestions) {
      templateMetrics.optimizationSuggestions = suggestions;
    }

    return templateMetrics;
  }

  /**
   * Get system-wide performance overview
   * @returns {Object} System performance metrics
   */
  getSystemPerformanceOverview() {
    const overview = {
      totalTemplates: this.renderingMetrics.size,
      totalRenders: 0,
      totalErrors: 0,
      averageRenderTime: 0,
      systemErrorRate: 0,
      performanceIssues: [],
      topPerformingTemplates: [],
      poorPerformingTemplates: []
    };

    const allMetrics = Array.from(this.renderingMetrics.values());
    
    if (allMetrics.length === 0) {
      return overview;
    }

    // Calculate system-wide metrics
    overview.totalRenders = allMetrics.reduce((sum, m) => sum + m.totalRenders, 0);
    overview.totalErrors = allMetrics.reduce((sum, m) => sum + m.failedRenders, 0);
    overview.systemErrorRate = overview.totalRenders > 0 ? overview.totalErrors / overview.totalRenders : 0;
    
    const totalRenderTime = allMetrics.reduce((sum, m) => sum + m.totalRenderTime, 0);
    overview.averageRenderTime = overview.totalRenders > 0 ? totalRenderTime / overview.totalRenders : 0;

    // Identify performance issues
    overview.performanceIssues = this.identifySystemPerformanceIssues(allMetrics);

    // Rank templates by performance
    const templateScores = allMetrics.map(metrics => ({
      templateId: metrics.templateId,
      channel: metrics.channel,
      score: this.calculatePerformanceScore(metrics),
      metrics
    })).sort((a, b) => b.score - a.score);

    overview.topPerformingTemplates = templateScores.slice(0, 5);
    overview.poorPerformingTemplates = templateScores.slice(-5).reverse();

    return overview;
  }

  /**
   * Calculate performance score for template metrics
   * @param {Object} metrics - Template metrics
   * @returns {number} Performance score (0-100)
   */
  calculatePerformanceScore(metrics) {
    let score = 100;

    // Render time score (40% weight)
    const renderTimeScore = Math.max(0, 100 - (metrics.averageRenderTime / this.thresholds.renderTime) * 100);
    score = score * 0.4 + renderTimeScore * 0.4;

    // Error rate score (30% weight)
    const errorRate = metrics.totalRenders > 0 ? metrics.failedRenders / metrics.totalRenders : 0;
    const errorScore = Math.max(0, 100 - (errorRate / this.thresholds.errorRate) * 100);
    score = score * 0.7 + errorScore * 0.3;

    // Consistency score (20% weight) - based on render time variance
    let consistencyScore = 100;
    if (metrics.renderTimeHistory.length > 10) {
      const renderTimes = metrics.renderTimeHistory.map(h => h.renderTime);
      const variance = this.calculateVariance(renderTimes);
      const coefficient = Math.sqrt(variance) / metrics.averageRenderTime;
      consistencyScore = Math.max(0, 100 - coefficient * 100);
    }
    score = score * 0.8 + consistencyScore * 0.2;

    // Reliability score (10% weight) - based on recent performance
    let reliabilityScore = 100;
    const recentHistory = metrics.renderTimeHistory.slice(-20);
    if (recentHistory.length > 0) {
      const recentSuccessRate = recentHistory.filter(h => h.success).length / recentHistory.length;
      reliabilityScore = recentSuccessRate * 100;
    }
    score = score * 0.9 + reliabilityScore * 0.1;

    return Math.round(score);
  }

  /**
   * Check performance thresholds and generate alerts
   * @param {string} key - Metrics key
   * @param {Object} metrics - Template metrics
   */
  checkPerformanceThresholds(key, metrics) {
    const alerts = [];

    // Check render time threshold
    if (metrics.averageRenderTime > this.thresholds.renderTime) {
      alerts.push({
        type: 'performance',
        severity: 'warning',
        message: `Template ${metrics.templateId} (${metrics.channel}) has high average render time: ${metrics.averageRenderTime}ms`,
        threshold: this.thresholds.renderTime,
        actual: metrics.averageRenderTime
      });
    }

    // Check error rate threshold
    const errorRate = metrics.totalRenders > 0 ? metrics.failedRenders / metrics.totalRenders : 0;
    if (errorRate > this.thresholds.errorRate) {
      alerts.push({
        type: 'reliability',
        severity: 'error',
        message: `Template ${metrics.templateId} (${metrics.channel}) has high error rate: ${(errorRate * 100).toFixed(2)}%`,
        threshold: this.thresholds.errorRate,
        actual: errorRate
      });
    }

    // Store alerts if any
    if (alerts.length > 0) {
      if (!this.performanceData.has(key)) {
        this.performanceData.set(key, { alerts: [] });
      }
      this.performanceData.get(key).alerts.push(...alerts);
    }
  }

  /**
   * Detect peak usage times for a template
   * @param {string} templateId - Template ID
   * @param {Object} patterns - Usage patterns
   */
  detectPeakUsage(templateId, patterns) {
    // Analyze usage by time to detect peaks
    const hourlyUsage = Array.from(patterns.usageByTime.entries())
      .sort((a, b) => b[1] - a[1]); // Sort by usage count descending

    if (hourlyUsage.length > 0) {
      const maxUsage = hourlyUsage[0][1];
      const peakHours = hourlyUsage
        .filter(([hour, count]) => count >= maxUsage * 0.8) // Within 80% of peak
        .map(([hour]) => hour);

      patterns.peakUsageTimes = peakHours;
    }
  }

  /**
   * Generate optimization suggestions for templates
   */
  async generateOptimizationSuggestions() {
    for (const [templateId, patterns] of this.usagePatterns.entries()) {
      const suggestions = [];

      // Get rendering metrics for this template
      const templateMetrics = Array.from(this.renderingMetrics.values())
        .filter(m => m.templateId === templateId);

      // Analyze performance issues
      for (const metrics of templateMetrics) {
        if (metrics.averageRenderTime > this.thresholds.renderTime) {
          suggestions.push({
            type: 'performance',
            priority: 'high',
            suggestion: `Optimize ${metrics.channel} template rendering - current average: ${metrics.averageRenderTime}ms`,
            details: 'Consider simplifying template structure, reducing dynamic content, or implementing caching'
          });
        }

        const errorRate = metrics.totalRenders > 0 ? metrics.failedRenders / metrics.totalRenders : 0;
        if (errorRate > this.thresholds.errorRate) {
          suggestions.push({
            type: 'reliability',
            priority: 'critical',
            suggestion: `Fix template reliability issues - error rate: ${(errorRate * 100).toFixed(2)}%`,
            details: 'Review recent errors and implement proper error handling and validation'
          });
        }
      }

      // Analyze usage patterns
      if (patterns.totalUsage > 1000) {
        suggestions.push({
          type: 'caching',
          priority: 'medium',
          suggestion: 'Consider implementing advanced caching for this high-usage template',
          details: `Template used ${patterns.totalUsage} times - caching could improve performance`
        });
      }

      // Channel distribution analysis
      const channelCount = patterns.usageByChannel.size;
      if (channelCount === 1) {
        const channel = Array.from(patterns.usageByChannel.keys())[0];
        suggestions.push({
          type: 'coverage',
          priority: 'low',
          suggestion: `Template only used for ${channel} - consider adding variants for other channels`,
          details: 'Multi-channel support can improve user experience and engagement'
        });
      }

      // Time-based optimization
      if (patterns.peakUsageTimes.length > 0) {
        suggestions.push({
          type: 'scheduling',
          priority: 'low',
          suggestion: `Peak usage during hours: ${patterns.peakUsageTimes.join(', ')}`,
          details: 'Consider pre-warming caches or scaling resources during peak times'
        });
      }

      if (suggestions.length > 0) {
        this.optimizationSuggestions.set(templateId, suggestions);
      }
    }
  }

  /**
   * Identify system-wide performance issues
   * @param {Array} allMetrics - All template metrics
   * @returns {Array} Performance issues
   */
  identifySystemPerformanceIssues(allMetrics) {
    const issues = [];

    // System-wide error rate
    const totalRenders = allMetrics.reduce((sum, m) => sum + m.totalRenders, 0);
    const totalErrors = allMetrics.reduce((sum, m) => sum + m.failedRenders, 0);
    const systemErrorRate = totalRenders > 0 ? totalErrors / totalRenders : 0;

    if (systemErrorRate > this.thresholds.errorRate) {
      issues.push({
        type: 'system_reliability',
        severity: 'critical',
        message: `System-wide error rate is high: ${(systemErrorRate * 100).toFixed(2)}%`,
        affectedTemplates: allMetrics.filter(m => 
          (m.failedRenders / m.totalRenders) > this.thresholds.errorRate
        ).length
      });
    }

    // System-wide performance
    const totalRenderTime = allMetrics.reduce((sum, m) => sum + m.totalRenderTime, 0);
    const avgSystemRenderTime = totalRenders > 0 ? totalRenderTime / totalRenders : 0;

    if (avgSystemRenderTime > this.thresholds.renderTime) {
      issues.push({
        type: 'system_performance',
        severity: 'warning',
        message: `System-wide average render time is high: ${avgSystemRenderTime.toFixed(2)}ms`,
        affectedTemplates: allMetrics.filter(m => 
          m.averageRenderTime > this.thresholds.renderTime
        ).length
      });
    }

    // Memory usage (template count)
    if (allMetrics.length > 1000) {
      issues.push({
        type: 'resource_usage',
        severity: 'warning',
        message: `High number of active templates: ${allMetrics.length}`,
        suggestion: 'Consider template consolidation or cleanup of unused templates'
      });
    }

    return issues;
  }

  /**
   * Collect performance data from database
   */
  async collectPerformanceData() {
    try {
      // Get template usage statistics from database
      const templates = await NotificationTemplate.find({ isActive: true })
        .select('_id type usage')
        .lean();

      for (const template of templates) {
        if (template.usage && template.usage.totalSent > 0) {
          this.recordUsagePattern(template._id.toString(), 'database_sync', {
            totalSent: template.usage.totalSent,
            lastUsed: template.usage.lastUsed
          });
        }
      }

      // Get analytics data if available
      const analyticsData = await NotificationAnalytics.find({
        date: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
      }).lean();

      // Process analytics data
      for (const analytics of analyticsData) {
        // This would be expanded based on the actual analytics schema
        // For now, we'll just log that we're collecting data
        console.log(`Collected analytics data for ${analytics.date}`);
      }

    } catch (error) {
      console.error('Error collecting performance data:', error);
    }
  }

  /**
   * Clean up old performance data
   */
  cleanupOldData() {
    const cutoffTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

    // Clean up rendering metrics history
    for (const [key, metrics] of this.renderingMetrics.entries()) {
      metrics.renderTimeHistory = metrics.renderTimeHistory.filter(
        h => h.timestamp > cutoffTime
      );
      metrics.errorHistory = metrics.errorHistory.filter(
        h => h.timestamp > cutoffTime
      );

      // Remove metrics with no recent activity
      if (metrics.renderTimeHistory.length === 0 && 
          (!metrics.lastRenderTime || metrics.lastRenderTime < cutoffTime)) {
        this.renderingMetrics.delete(key);
      }
    }

    // Clean up performance alerts
    for (const [key, data] of this.performanceData.entries()) {
      if (data.alerts) {
        data.alerts = data.alerts.filter(
          alert => alert.timestamp && alert.timestamp > cutoffTime
        );
        
        if (data.alerts.length === 0) {
          this.performanceData.delete(key);
        }
      }
    }

    console.log('Performance data cleanup completed');
  }

  /**
   * Calculate variance of an array of numbers
   * @param {Array} numbers - Array of numbers
   * @returns {number} Variance
   */
  calculateVariance(numbers) {
    if (numbers.length === 0) return 0;
    
    const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
    const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
    return squaredDiffs.reduce((sum, sq) => sum + sq, 0) / numbers.length;
  }

  /**
   * Get performance report for a specific time period
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Object} Performance report
   */
  getPerformanceReport(startDate, endDate) {
    const report = {
      period: { startDate, endDate },
      summary: {},
      templateReports: [],
      recommendations: []
    };

    // Generate summary
    const systemOverview = this.getSystemPerformanceOverview();
    report.summary = systemOverview;

    // Generate individual template reports
    for (const templateId of this.usagePatterns.keys()) {
      const templateMetrics = this.getTemplatePerformanceMetrics(templateId);
      if (templateMetrics && Object.keys(templateMetrics).length > 0) {
        report.templateReports.push({
          templateId,
          metrics: templateMetrics
        });
      }
    }

    // Generate system-wide recommendations
    report.recommendations = this.generateSystemRecommendations(systemOverview);

    return report;
  }

  /**
   * Generate system-wide recommendations
   * @param {Object} systemOverview - System performance overview
   * @returns {Array} Recommendations
   */
  generateSystemRecommendations(systemOverview) {
    const recommendations = [];

    if (systemOverview.systemErrorRate > this.thresholds.errorRate) {
      recommendations.push({
        priority: 'critical',
        category: 'reliability',
        title: 'Address System-Wide Reliability Issues',
        description: 'High error rate detected across multiple templates',
        action: 'Review error logs, implement better error handling, and consider template validation improvements'
      });
    }

    if (systemOverview.averageRenderTime > this.thresholds.renderTime) {
      recommendations.push({
        priority: 'high',
        category: 'performance',
        title: 'Optimize Template Rendering Performance',
        description: 'System-wide rendering performance is below optimal',
        action: 'Implement caching, optimize template complexity, and consider infrastructure scaling'
      });
    }

    if (systemOverview.poorPerformingTemplates.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'optimization',
        title: 'Focus on Poor Performing Templates',
        description: `${systemOverview.poorPerformingTemplates.length} templates need attention`,
        action: 'Prioritize optimization efforts on the lowest scoring templates'
      });
    }

    return recommendations;
  }

  /**
   * Stop monitoring (cleanup)
   */
  stopMonitoring() {
    // Clear intervals if they were stored
    // This would require storing interval IDs when starting monitoring
    console.log('Template Performance Monitor stopped');
  }
}

export { TemplatePerformanceMonitor };
export default TemplatePerformanceMonitor;