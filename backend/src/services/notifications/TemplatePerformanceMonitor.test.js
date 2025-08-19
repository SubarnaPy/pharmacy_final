import { jest } from '@jest/globals';
import TemplatePerformanceMonitor from './TemplatePerformanceMonitor.js';

// Mock the models
jest.mock('../../models/NotificationTemplate.js');
jest.mock('../../models/NotificationAnalytics.js');

describe('TemplatePerformanceMonitor', () => {
  let monitor;

  beforeEach(() => {
    // Create monitor with short intervals for testing
    monitor = new TemplatePerformanceMonitor({
      monitoringInterval: 100,
      cleanupInterval: 200,
      renderTimeThreshold: 500,
      errorRateThreshold: 0.1
    });
    
    // Clear any existing data
    monitor.renderingMetrics.clear();
    monitor.usagePatterns.clear();
    monitor.performanceData.clear();
    monitor.optimizationSuggestions.clear();
  });

  afterEach(() => {
    if (monitor.stopMonitoring) {
      monitor.stopMonitoring();
    }
  });

  describe('recordRenderingPerformance', () => {
    it('should record successful rendering performance', () => {
      monitor.recordRenderingPerformance('template123', 'email', 250, true);

      const key = 'template123_email';
      const metrics = monitor.renderingMetrics.get(key);

      expect(metrics).toBeDefined();
      expect(metrics.templateId).toBe('template123');
      expect(metrics.channel).toBe('email');
      expect(metrics.totalRenders).toBe(1);
      expect(metrics.successfulRenders).toBe(1);
      expect(metrics.failedRenders).toBe(0);
      expect(metrics.averageRenderTime).toBe(250);
      expect(metrics.minRenderTime).toBe(250);
      expect(metrics.maxRenderTime).toBe(250);
    });

    it('should record failed rendering performance', () => {
      monitor.recordRenderingPerformance('template123', 'email', 1000, false, {
        error: 'Template compilation failed'
      });

      const key = 'template123_email';
      const metrics = monitor.renderingMetrics.get(key);

      expect(metrics.totalRenders).toBe(1);
      expect(metrics.successfulRenders).toBe(0);
      expect(metrics.failedRenders).toBe(1);
      expect(metrics.errorHistory).toHaveLength(1);
      expect(metrics.errorHistory[0].error).toBe('Template compilation failed');
    });

    it('should update metrics for multiple renders', () => {
      monitor.recordRenderingPerformance('template123', 'email', 200, true);
      monitor.recordRenderingPerformance('template123', 'email', 300, true);
      monitor.recordRenderingPerformance('template123', 'email', 400, false);

      const key = 'template123_email';
      const metrics = monitor.renderingMetrics.get(key);

      expect(metrics.totalRenders).toBe(3);
      expect(metrics.successfulRenders).toBe(2);
      expect(metrics.failedRenders).toBe(1);
      expect(metrics.averageRenderTime).toBe(300); // (200 + 300 + 400) / 3
      expect(metrics.minRenderTime).toBe(200);
      expect(metrics.maxRenderTime).toBe(400);
    });

    it('should maintain render time history', () => {
      for (let i = 0; i < 105; i++) {
        monitor.recordRenderingPerformance('template123', 'email', 100 + i, true);
      }

      const key = 'template123_email';
      const metrics = monitor.renderingMetrics.get(key);

      expect(metrics.renderTimeHistory).toHaveLength(100); // Should cap at 100
      expect(metrics.totalRenders).toBe(105);
    });
  });

  describe('recordUsagePattern', () => {
    it('should record usage patterns', () => {
      monitor.recordUsagePattern('template123', 'notification_sent', {
        channel: 'email',
        userRole: 'patient'
      });

      const patterns = monitor.usagePatterns.get('template123');

      expect(patterns).toBeDefined();
      expect(patterns.totalUsage).toBe(1);
      expect(patterns.usageByChannel.get('email')).toBe(1);
      expect(patterns.usageByRole.get('patient')).toBe(1);
    });

    it('should track usage by time of day', () => {
      const currentHour = new Date().getHours();
      
      monitor.recordUsagePattern('template123', 'notification_sent');
      monitor.recordUsagePattern('template123', 'notification_sent');

      const patterns = monitor.usagePatterns.get('template123');

      expect(patterns.usageByTime.get(currentHour)).toBe(2);
    });

    it('should detect peak usage times', () => {
      // Simulate usage at different hours
      const originalGetHours = Date.prototype.getHours;
      
      // Mock hour 9 (peak time)
      Date.prototype.getHours = jest.fn(() => 9);
      for (let i = 0; i < 10; i++) {
        monitor.recordUsagePattern('template123', 'notification_sent');
      }

      // Mock hour 14 (another peak time)
      Date.prototype.getHours = jest.fn(() => 14);
      for (let i = 0; i < 8; i++) {
        monitor.recordUsagePattern('template123', 'notification_sent');
      }

      // Mock hour 2 (low usage)
      Date.prototype.getHours = jest.fn(() => 2);
      monitor.recordUsagePattern('template123', 'notification_sent');

      const patterns = monitor.usagePatterns.get('template123');

      expect(patterns.peakUsageTimes).toContain(9);
      expect(patterns.peakUsageTimes).toContain(14);
      expect(patterns.peakUsageTimes).not.toContain(2);

      // Restore original method
      Date.prototype.getHours = originalGetHours;
    });
  });

  describe('getTemplatePerformanceMetrics', () => {
    beforeEach(() => {
      // Set up test data
      monitor.recordRenderingPerformance('template123', 'email', 200, true);
      monitor.recordRenderingPerformance('template123', 'email', 300, true);
      monitor.recordRenderingPerformance('template123', 'sms', 100, true);
      
      monitor.recordUsagePattern('template123', 'notification_sent', {
        channel: 'email',
        userRole: 'patient'
      });
    });

    it('should return comprehensive performance metrics', () => {
      const metrics = monitor.getTemplatePerformanceMetrics('template123');

      expect(metrics.email).toBeDefined();
      expect(metrics.email.totalRenders).toBe(2);
      expect(metrics.email.averageRenderTime).toBe(250);
      expect(metrics.email.errorRate).toBe(0);
      expect(metrics.email.successRate).toBe(1);
      expect(metrics.email.performanceScore).toBeGreaterThan(0);

      expect(metrics.sms).toBeDefined();
      expect(metrics.sms.totalRenders).toBe(1);

      expect(metrics.usage).toBeDefined();
      expect(metrics.usage.totalUsage).toBe(1);
      expect(metrics.usage.channelDistribution.email).toBe(1);
    });

    it('should return empty object for non-existent template', () => {
      const metrics = monitor.getTemplatePerformanceMetrics('nonexistent');
      expect(Object.keys(metrics)).toHaveLength(0);
    });
  });

  describe('getSystemPerformanceOverview', () => {
    beforeEach(() => {
      // Set up test data for multiple templates
      monitor.recordRenderingPerformance('template1', 'email', 200, true);
      monitor.recordRenderingPerformance('template1', 'email', 300, false);
      monitor.recordRenderingPerformance('template2', 'sms', 100, true);
      monitor.recordRenderingPerformance('template3', 'email', 800, true); // Slow template
    });

    it('should return system-wide performance overview', () => {
      const overview = monitor.getSystemPerformanceOverview();

      expect(overview.totalTemplates).toBe(3);
      expect(overview.totalRenders).toBe(4);
      expect(overview.totalErrors).toBe(1);
      expect(overview.systemErrorRate).toBe(0.25); // 1 error out of 4 renders
      expect(overview.averageRenderTime).toBe(350); // (200 + 300 + 100 + 800) / 4

      expect(overview.topPerformingTemplates).toBeDefined();
      expect(overview.poorPerformingTemplates).toBeDefined();
      expect(overview.performanceIssues).toBeDefined();
    });

    it('should handle empty metrics gracefully', () => {
      monitor.renderingMetrics.clear();
      
      const overview = monitor.getSystemPerformanceOverview();

      expect(overview.totalTemplates).toBe(0);
      expect(overview.totalRenders).toBe(0);
      expect(overview.totalErrors).toBe(0);
      expect(overview.systemErrorRate).toBe(0);
      expect(overview.averageRenderTime).toBe(0);
    });
  });

  describe('calculatePerformanceScore', () => {
    it('should calculate high score for good performance', () => {
      const goodMetrics = {
        totalRenders: 100,
        successfulRenders: 100,
        failedRenders: 0,
        averageRenderTime: 100,
        renderTimeHistory: Array(20).fill().map((_, i) => ({
          renderTime: 100 + i,
          success: true
        }))
      };

      const score = monitor.calculatePerformanceScore(goodMetrics);
      expect(score).toBeGreaterThan(80);
    });

    it('should calculate low score for poor performance', () => {
      const poorMetrics = {
        totalRenders: 100,
        successfulRenders: 50,
        failedRenders: 50,
        averageRenderTime: 2000, // Very slow
        renderTimeHistory: Array(20).fill().map((_, i) => ({
          renderTime: 2000 + i * 100,
          success: i % 2 === 0 // 50% success rate
        }))
      };

      const score = monitor.calculatePerformanceScore(poorMetrics);
      expect(score).toBeLessThan(50);
    });
  });

  describe('checkPerformanceThresholds', () => {
    it('should generate alerts for threshold violations', () => {
      const slowMetrics = {
        templateId: 'template123',
        channel: 'email',
        totalRenders: 10,
        successfulRenders: 5,
        failedRenders: 5,
        averageRenderTime: 1000 // Above threshold
      };

      monitor.checkPerformanceThresholds('template123_email', slowMetrics);

      const performanceData = monitor.performanceData.get('template123_email');
      expect(performanceData).toBeDefined();
      expect(performanceData.alerts).toBeDefined();
      expect(performanceData.alerts.length).toBeGreaterThan(0);

      const performanceAlert = performanceData.alerts.find(a => a.type === 'performance');
      const reliabilityAlert = performanceData.alerts.find(a => a.type === 'reliability');

      expect(performanceAlert).toBeDefined();
      expect(reliabilityAlert).toBeDefined();
    });

    it('should not generate alerts for good performance', () => {
      const goodMetrics = {
        templateId: 'template123',
        channel: 'email',
        totalRenders: 10,
        successfulRenders: 10,
        failedRenders: 0,
        averageRenderTime: 100
      };

      monitor.checkPerformanceThresholds('template123_email', goodMetrics);

      const performanceData = monitor.performanceData.get('template123_email');
      expect(performanceData).toBeUndefined();
    });
  });

  describe('generateOptimizationSuggestions', () => {
    beforeEach(() => {
      // Set up data that would trigger suggestions
      monitor.recordRenderingPerformance('highUsage', 'email', 200, true);
      monitor.recordRenderingPerformance('slowTemplate', 'email', 1000, true);
      monitor.recordRenderingPerformance('errorTemplate', 'email', 300, false);

      // High usage template
      for (let i = 0; i < 1001; i++) {
        monitor.recordUsagePattern('highUsage', 'notification_sent', {
          channel: 'email'
        });
      }

      // Single channel template
      monitor.recordUsagePattern('singleChannel', 'notification_sent', {
        channel: 'email'
      });
    });

    it('should generate optimization suggestions', async () => {
      await monitor.generateOptimizationSuggestions();

      // Check high usage template suggestion
      const highUsageSuggestions = monitor.optimizationSuggestions.get('highUsage');
      expect(highUsageSuggestions).toBeDefined();
      expect(highUsageSuggestions.some(s => s.type === 'caching')).toBe(true);

      // Check slow template suggestion
      const slowTemplateSuggestions = monitor.optimizationSuggestions.get('slowTemplate');
      expect(slowTemplateSuggestions).toBeDefined();
      expect(slowTemplateSuggestions.some(s => s.type === 'performance')).toBe(true);

      // Check error template suggestion
      const errorTemplateSuggestions = monitor.optimizationSuggestions.get('errorTemplate');
      expect(errorTemplateSuggestions).toBeDefined();
      expect(errorTemplateSuggestions.some(s => s.type === 'reliability')).toBe(true);

      // Check single channel suggestion
      const singleChannelSuggestions = monitor.optimizationSuggestions.get('singleChannel');
      expect(singleChannelSuggestions).toBeDefined();
      expect(singleChannelSuggestions.some(s => s.type === 'coverage')).toBe(true);
    });
  });

  describe('calculateVariance', () => {
    it('should calculate variance correctly', () => {
      const numbers = [1, 2, 3, 4, 5];
      const variance = monitor.calculateVariance(numbers);
      expect(variance).toBe(2); // Variance of [1,2,3,4,5] is 2
    });

    it('should handle empty array', () => {
      const variance = monitor.calculateVariance([]);
      expect(variance).toBe(0);
    });

    it('should handle single value', () => {
      const variance = monitor.calculateVariance([5]);
      expect(variance).toBe(0);
    });
  });

  describe('getPerformanceReport', () => {
    beforeEach(() => {
      // Set up comprehensive test data
      monitor.recordRenderingPerformance('template1', 'email', 200, true);
      monitor.recordRenderingPerformance('template1', 'sms', 100, true);
      monitor.recordUsagePattern('template1', 'notification_sent');
    });

    it('should generate comprehensive performance report', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      
      const report = monitor.getPerformanceReport(startDate, endDate);

      expect(report.period.startDate).toBe(startDate);
      expect(report.period.endDate).toBe(endDate);
      expect(report.summary).toBeDefined();
      expect(report.templateReports).toBeDefined();
      expect(report.recommendations).toBeDefined();

      expect(report.templateReports.length).toBeGreaterThan(0);
      expect(report.templateReports[0].templateId).toBe('template1');
      expect(report.templateReports[0].metrics).toBeDefined();
    });
  });

  describe('generateSystemRecommendations', () => {
    it('should generate recommendations based on system overview', () => {
      const systemOverview = {
        systemErrorRate: 0.15, // Above threshold
        averageRenderTime: 1200, // Above threshold
        poorPerformingTemplates: [
          { templateId: 'template1', score: 30 },
          { templateId: 'template2', score: 25 }
        ]
      };

      const recommendations = monitor.generateSystemRecommendations(systemOverview);

      expect(recommendations.length).toBeGreaterThan(0);
      
      const reliabilityRec = recommendations.find(r => r.category === 'reliability');
      const performanceRec = recommendations.find(r => r.category === 'performance');
      const optimizationRec = recommendations.find(r => r.category === 'optimization');

      expect(reliabilityRec).toBeDefined();
      expect(performanceRec).toBeDefined();
      expect(optimizationRec).toBeDefined();

      expect(reliabilityRec.priority).toBe('critical');
      expect(performanceRec.priority).toBe('high');
      expect(optimizationRec.priority).toBe('medium');
    });

    it('should not generate recommendations for good performance', () => {
      const goodSystemOverview = {
        systemErrorRate: 0.01, // Below threshold
        averageRenderTime: 200, // Below threshold
        poorPerformingTemplates: []
      };

      const recommendations = monitor.generateSystemRecommendations(goodSystemOverview);

      expect(recommendations).toHaveLength(0);
    });
  });
});