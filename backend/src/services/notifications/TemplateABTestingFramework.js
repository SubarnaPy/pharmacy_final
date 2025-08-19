import NotificationTemplate from '../../models/NotificationTemplate.js';
import NotificationAnalytics from '../../models/NotificationAnalytics.js';

/**
 * Template A/B Testing Framework
 * Handles A/B testing for notification templates with statistical analysis
 */
class TemplateABTestingFramework {
  constructor(options = {}) {
    this.activeTests = new Map();
    this.testResults = new Map();
    this.userAssignments = new Map();
    
    // Configuration
    this.config = {
      defaultSplitRatio: options.defaultSplitRatio || 0.5,
      minSampleSize: options.minSampleSize || 100,
      confidenceLevel: options.confidenceLevel || 0.95,
      maxTestDuration: options.maxTestDuration || 30 * 24 * 60 * 60 * 1000, // 30 days
      significanceThreshold: options.significanceThreshold || 0.05
    };
    
    // Metrics to track
    this.trackedMetrics = [
      'deliveryRate',
      'openRate',
      'clickRate',
      'conversionRate',
      'unsubscribeRate',
      'responseTime'
    ];
    
    console.log('✅ Template A/B Testing Framework initialized');
  }

  /**
   * Create a new A/B test
   * @param {Object} testConfig - Test configuration
   * @returns {Object} Created test
   */
  async createABTest(testConfig) {
    try {
      const {
        name,
        description,
        templateType,
        channel,
        userRole,
        language = 'en',
        variantA,
        variantB,
        splitRatio = this.config.defaultSplitRatio,
        targetMetric = 'clickRate',
        expectedImprovement = 0.1,
        duration = this.config.maxTestDuration,
        startDate = new Date(),
        createdBy
      } = testConfig;

      // Validate test configuration
      this.validateTestConfig(testConfig);

      // Generate test ID
      const testId = this.generateTestId(name, templateType, channel);

      // Calculate required sample size
      const requiredSampleSize = this.calculateSampleSize(
        expectedImprovement,
        this.config.confidenceLevel,
        0.8 // Power
      );

      // Create test object
      const test = {
        id: testId,
        name,
        description,
        templateType,
        channel,
        userRole,
        language,
        status: 'draft',
        
        // Variants
        variants: {
          A: {
            name: variantA.name || 'Control',
            templateId: variantA.templateId,
            weight: splitRatio,
            metrics: this.initializeMetrics()
          },
          B: {
            name: variantB.name || 'Variant',
            templateId: variantB.templateId,
            weight: 1 - splitRatio,
            metrics: this.initializeMetrics()
          }
        },
        
        // Test parameters
        targetMetric,
        expectedImprovement,
        requiredSampleSize,
        actualSampleSize: 0,
        
        // Timeline
        startDate,
        endDate: new Date(startDate.getTime() + duration),
        duration,
        
        // Results
        results: {
          winner: null,
          confidence: 0,
          significance: null,
          improvement: 0,
          recommendation: null
        },
        
        // Metadata
        createdBy,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Store test
      this.activeTests.set(testId, test);

      console.log(`✅ A/B test created: ${testId}`);
      return test;

    } catch (error) {
      console.error('Error creating A/B test:', error);
      throw error;
    }
  }

  /**
   * Start an A/B test
   * @param {string} testId - Test ID
   * @returns {Object} Started test
   */
  async startABTest(testId) {
    try {
      const test = this.activeTests.get(testId);
      if (!test) {
        throw new Error('Test not found');
      }

      if (test.status !== 'draft') {
        throw new Error(`Test is already ${test.status}`);
      }

      // Validate templates exist
      await this.validateTestTemplates(test);

      // Update test status
      test.status = 'running';
      test.startDate = new Date();
      test.endDate = new Date(test.startDate.getTime() + test.duration);
      test.updatedAt = new Date();

      console.log(`✅ A/B test started: ${testId}`);
      return test;

    } catch (error) {
      console.error('Error starting A/B test:', error);
      throw error;
    }
  }

  /**
   * Assign user to test variant
   * @param {string} testId - Test ID
   * @param {string} userId - User ID
   * @param {Object} context - Assignment context
   * @returns {Object} Assignment result
   */
  assignUserToVariant(testId, userId, context = {}) {
    try {
      const test = this.activeTests.get(testId);
      if (!test || test.status !== 'running') {
        return null;
      }

      // Check if user already assigned
      const assignmentKey = `${testId}_${userId}`;
      if (this.userAssignments.has(assignmentKey)) {
        return this.userAssignments.get(assignmentKey);
      }

      // Determine variant based on user ID hash and split ratio
      const variant = this.determineVariant(userId, test.variants.A.weight);
      const templateId = test.variants[variant].templateId;

      // Create assignment
      const assignment = {
        testId,
        userId,
        variant,
        templateId,
        assignedAt: new Date(),
        context
      };

      // Store assignment
      this.userAssignments.set(assignmentKey, assignment);

      // Update test sample size
      test.actualSampleSize++;
      test.updatedAt = new Date();

      return assignment;

    } catch (error) {
      console.error('Error assigning user to variant:', error);
      return null;
    }
  }

  /**
   * Record test event (delivery, open, click, etc.)
   * @param {string} testId - Test ID
   * @param {string} userId - User ID
   * @param {string} eventType - Event type
   * @param {Object} eventData - Event data
   */
  recordTestEvent(testId, userId, eventType, eventData = {}) {
    try {
      const test = this.activeTests.get(testId);
      if (!test || test.status !== 'running') {
        return;
      }

      const assignmentKey = `${testId}_${userId}`;
      const assignment = this.userAssignments.get(assignmentKey);
      if (!assignment) {
        return;
      }

      const variant = test.variants[assignment.variant];
      const metrics = variant.metrics;

      // Update metrics based on event type
      switch (eventType) {
        case 'delivered':
          metrics.delivered++;
          metrics.deliveryRate = metrics.delivered / metrics.sent;
          break;
          
        case 'opened':
          metrics.opened++;
          metrics.openRate = metrics.opened / metrics.delivered;
          break;
          
        case 'clicked':
          metrics.clicked++;
          metrics.clickRate = metrics.clicked / metrics.delivered;
          break;
          
        case 'converted':
          metrics.converted++;
          metrics.conversionRate = metrics.converted / metrics.delivered;
          break;
          
        case 'unsubscribed':
          metrics.unsubscribed++;
          metrics.unsubscribeRate = metrics.unsubscribed / metrics.delivered;
          break;
          
        case 'sent':
          metrics.sent++;
          if (eventData.responseTime) {
            metrics.totalResponseTime += eventData.responseTime;
            metrics.averageResponseTime = metrics.totalResponseTime / metrics.sent;
          }
          break;
      }

      test.updatedAt = new Date();

      // Check if test should be analyzed
      if (this.shouldAnalyzeTest(test)) {
        this.analyzeTestResults(testId);
      }

    } catch (error) {
      console.error('Error recording test event:', error);
    }
  }

  /**
   * Analyze test results and determine statistical significance
   * @param {string} testId - Test ID
   * @returns {Object} Analysis results
   */
  analyzeTestResults(testId) {
    try {
      const test = this.activeTests.get(testId);
      if (!test) {
        throw new Error('Test not found');
      }

      const variantA = test.variants.A;
      const variantB = test.variants.B;
      const targetMetric = test.targetMetric;

      // Get metric values
      const valueA = this.getMetricValue(variantA.metrics, targetMetric);
      const valueB = this.getMetricValue(variantB.metrics, targetMetric);

      // Calculate statistical significance
      const significance = this.calculateStatisticalSignificance(
        variantA.metrics,
        variantB.metrics,
        targetMetric
      );

      // Calculate improvement
      const improvement = valueA > 0 ? (valueB - valueA) / valueA : 0;

      // Determine winner
      let winner = null;
      let confidence = 0;
      
      if (significance.pValue < this.config.significanceThreshold) {
        winner = valueB > valueA ? 'B' : 'A';
        confidence = 1 - significance.pValue;
      }

      // Generate recommendation
      const recommendation = this.generateRecommendation(test, significance, improvement);

      // Update test results
      test.results = {
        winner,
        confidence,
        significance: significance.pValue,
        improvement,
        recommendation,
        analyzedAt: new Date(),
        details: {
          variantA: {
            value: valueA,
            sampleSize: variantA.metrics.sent,
            metrics: variantA.metrics
          },
          variantB: {
            value: valueB,
            sampleSize: variantB.metrics.sent,
            metrics: variantB.metrics
          },
          statisticalTest: significance
        }
      };

      test.updatedAt = new Date();

      // Store results for historical analysis
      this.testResults.set(testId, test.results);

      return test.results;

    } catch (error) {
      console.error('Error analyzing test results:', error);
      throw error;
    }
  }

  /**
   * Stop an A/B test
   * @param {string} testId - Test ID
   * @param {string} reason - Reason for stopping
   * @returns {Object} Final results
   */
  async stopABTest(testId, reason = 'manual') {
    try {
      const test = this.activeTests.get(testId);
      if (!test) {
        throw new Error('Test not found');
      }

      if (test.status !== 'running') {
        throw new Error(`Test is not running (status: ${test.status})`);
      }

      // Final analysis
      const finalResults = this.analyzeTestResults(testId);

      // Update test status
      test.status = 'completed';
      test.endDate = new Date();
      test.stoppedReason = reason;
      test.updatedAt = new Date();

      console.log(`✅ A/B test stopped: ${testId} (${reason})`);
      return finalResults;

    } catch (error) {
      console.error('Error stopping A/B test:', error);
      throw error;
    }
  }

  /**
   * Get test status and current results
   * @param {string} testId - Test ID
   * @returns {Object} Test status
   */
  getTestStatus(testId) {
    const test = this.activeTests.get(testId);
    if (!test) {
      throw new Error('Test not found');
    }

    const now = new Date();
    const progress = test.status === 'running' ? 
      Math.min((now - test.startDate) / (test.endDate - test.startDate), 1) : 0;

    return {
      id: testId,
      name: test.name,
      status: test.status,
      progress: Math.round(progress * 100),
      sampleSize: test.actualSampleSize,
      requiredSampleSize: test.requiredSampleSize,
      daysRemaining: test.status === 'running' ? 
        Math.max(0, Math.ceil((test.endDate - now) / (24 * 60 * 60 * 1000))) : 0,
      currentResults: test.results,
      variants: {
        A: {
          name: test.variants.A.name,
          metrics: test.variants.A.metrics
        },
        B: {
          name: test.variants.B.name,
          metrics: test.variants.B.metrics
        }
      }
    };
  }

  /**
   * Get all active tests
   * @returns {Array} Active tests
   */
  getActiveTests() {
    return Array.from(this.activeTests.values())
      .filter(test => test.status === 'running')
      .map(test => this.getTestStatus(test.id));
  }

  /**
   * Get test history and results
   * @param {Object} filters - Filters
   * @returns {Array} Test history
   */
  getTestHistory(filters = {}) {
    const tests = Array.from(this.activeTests.values());
    
    let filtered = tests;
    
    if (filters.status) {
      filtered = filtered.filter(test => test.status === filters.status);
    }
    
    if (filters.templateType) {
      filtered = filtered.filter(test => test.templateType === filters.templateType);
    }
    
    if (filters.channel) {
      filtered = filtered.filter(test => test.channel === filters.channel);
    }

    return filtered.map(test => ({
      id: test.id,
      name: test.name,
      templateType: test.templateType,
      channel: test.channel,
      status: test.status,
      startDate: test.startDate,
      endDate: test.endDate,
      sampleSize: test.actualSampleSize,
      results: test.results
    }));
  }

  /**
   * Validate test configuration
   * @param {Object} config - Test configuration
   */
  validateTestConfig(config) {
    const required = ['name', 'templateType', 'channel', 'userRole', 'variantA', 'variantB'];
    
    for (const field of required) {
      if (!config[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (!config.variantA.templateId || !config.variantB.templateId) {
      throw new Error('Both variants must have template IDs');
    }

    if (config.splitRatio && (config.splitRatio <= 0 || config.splitRatio >= 1)) {
      throw new Error('Split ratio must be between 0 and 1');
    }

    if (!this.trackedMetrics.includes(config.targetMetric)) {
      throw new Error(`Invalid target metric: ${config.targetMetric}`);
    }
  }

  /**
   * Validate test templates exist
   * @param {Object} test - Test object
   */
  async validateTestTemplates(test) {
    const templateA = await NotificationTemplate.findById(test.variants.A.templateId);
    const templateB = await NotificationTemplate.findById(test.variants.B.templateId);

    if (!templateA) {
      throw new Error(`Template A not found: ${test.variants.A.templateId}`);
    }

    if (!templateB) {
      throw new Error(`Template B not found: ${test.variants.B.templateId}`);
    }

    if (!templateA.isActive || !templateB.isActive) {
      throw new Error('Both test templates must be active');
    }
  }

  /**
   * Generate test ID
   * @param {string} name - Test name
   * @param {string} templateType - Template type
   * @param {string} channel - Channel
   * @returns {string} Test ID
   */
  generateTestId(name, templateType, channel) {
    const timestamp = Date.now();
    const hash = this.hashString(`${name}_${templateType}_${channel}_${timestamp}`);
    return `test_${hash.substring(0, 8)}`;
  }

  /**
   * Initialize metrics object
   * @returns {Object} Metrics object
   */
  initializeMetrics() {
    return {
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      converted: 0,
      unsubscribed: 0,
      deliveryRate: 0,
      openRate: 0,
      clickRate: 0,
      conversionRate: 0,
      unsubscribeRate: 0,
      totalResponseTime: 0,
      averageResponseTime: 0
    };
  }

  /**
   * Determine variant for user
   * @param {string} userId - User ID
   * @param {number} splitRatio - Split ratio for variant A
   * @returns {string} Variant (A or B)
   */
  determineVariant(userId, splitRatio) {
    const hash = this.hashString(userId);
    const normalizedHash = parseInt(hash.substring(0, 8), 16) / 0xffffffff;
    return normalizedHash < splitRatio ? 'A' : 'B';
  }

  /**
   * Calculate required sample size
   * @param {number} expectedImprovement - Expected improvement
   * @param {number} confidenceLevel - Confidence level
   * @param {number} power - Statistical power
   * @returns {number} Required sample size
   */
  calculateSampleSize(expectedImprovement, confidenceLevel, power) {
    // Simplified sample size calculation
    // In production, use more sophisticated statistical methods
    const alpha = 1 - confidenceLevel;
    const beta = 1 - power;
    
    // Z-scores for alpha/2 and beta
    const zAlpha = this.getZScore(alpha / 2);
    const zBeta = this.getZScore(beta);
    
    // Simplified formula for proportions
    const p = 0.1; // Assumed baseline conversion rate
    const delta = expectedImprovement;
    
    const n = Math.pow(zAlpha + zBeta, 2) * (2 * p * (1 - p)) / Math.pow(delta, 2);
    
    return Math.ceil(n);
  }

  /**
   * Calculate statistical significance using z-test
   * @param {Object} metricsA - Metrics for variant A
   * @param {Object} metricsB - Metrics for variant B
   * @param {string} metric - Target metric
   * @returns {Object} Statistical test results
   */
  calculateStatisticalSignificance(metricsA, metricsB, metric) {
    const valueA = this.getMetricValue(metricsA, metric);
    const valueB = this.getMetricValue(metricsB, metric);
    const nA = metricsA.sent;
    const nB = metricsB.sent;

    if (nA === 0 || nB === 0) {
      return { pValue: 1, zScore: 0, significant: false };
    }

    // Calculate pooled proportion for proportion-based metrics
    if (['deliveryRate', 'openRate', 'clickRate', 'conversionRate'].includes(metric)) {
      const successA = Math.round(valueA * nA);
      const successB = Math.round(valueB * nB);
      const pooledP = (successA + successB) / (nA + nB);
      
      const se = Math.sqrt(pooledP * (1 - pooledP) * (1/nA + 1/nB));
      const zScore = se > 0 ? (valueB - valueA) / se : 0;
      const pValue = 2 * (1 - this.normalCDF(Math.abs(zScore)));
      
      return {
        pValue,
        zScore,
        significant: pValue < this.config.significanceThreshold,
        testType: 'z-test for proportions'
      };
    } else {
      // For continuous metrics, use t-test approximation
      const seA = Math.sqrt(valueA * (1 - valueA) / nA);
      const seB = Math.sqrt(valueB * (1 - valueB) / nB);
      const se = Math.sqrt(seA * seA + seB * seB);
      
      const zScore = se > 0 ? (valueB - valueA) / se : 0;
      const pValue = 2 * (1 - this.normalCDF(Math.abs(zScore)));
      
      return {
        pValue,
        zScore,
        significant: pValue < this.config.significanceThreshold,
        testType: 'z-test for means'
      };
    }
  }

  /**
   * Get metric value from metrics object
   * @param {Object} metrics - Metrics object
   * @param {string} metric - Metric name
   * @returns {number} Metric value
   */
  getMetricValue(metrics, metric) {
    return metrics[metric] || 0;
  }

  /**
   * Check if test should be analyzed
   * @param {Object} test - Test object
   * @returns {boolean} Should analyze
   */
  shouldAnalyzeTest(test) {
    // Analyze if we have minimum sample size or test is ending soon
    const now = new Date();
    const timeRemaining = test.endDate - now;
    const hasMinSample = test.actualSampleSize >= this.config.minSampleSize;
    const isEndingSoon = timeRemaining < 24 * 60 * 60 * 1000; // 1 day
    
    return hasMinSample || isEndingSoon;
  }

  /**
   * Generate recommendation based on test results
   * @param {Object} test - Test object
   * @param {Object} significance - Significance test results
   * @param {number} improvement - Improvement percentage
   * @returns {string} Recommendation
   */
  generateRecommendation(test, significance, improvement) {
    if (!significance.significant) {
      if (test.actualSampleSize < test.requiredSampleSize) {
        return 'Continue test - need more data for statistical significance';
      } else {
        return 'No significant difference detected - consider keeping current version';
      }
    }

    if (improvement > 0.05) { // 5% improvement
      return `Implement variant B - shows ${(improvement * 100).toFixed(1)}% improvement`;
    } else if (improvement < -0.05) {
      return `Keep variant A - variant B shows ${Math.abs(improvement * 100).toFixed(1)}% decrease`;
    } else {
      return 'Minimal difference - consider other factors for decision';
    }
  }

  /**
   * Utility methods
   */

  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  getZScore(p) {
    // Approximate inverse normal CDF for common values
    const zScores = {
      0.025: 1.96,  // 95% confidence
      0.005: 2.58,  // 99% confidence
      0.1: 1.28,    // 80% power
      0.05: 1.645   // 90% power
    };
    return zScores[p] || 1.96;
  }

  normalCDF(x) {
    // Approximation of normal cumulative distribution function
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x > 0 ? 1 - prob : prob;
  }

  /**
   * Export test results
   * @param {string} testId - Test ID
   * @returns {Object} Exportable test data
   */
  exportTestResults(testId) {
    const test = this.activeTests.get(testId);
    if (!test) {
      throw new Error('Test not found');
    }

    return {
      test: {
        id: test.id,
        name: test.name,
        description: test.description,
        templateType: test.templateType,
        channel: test.channel,
        userRole: test.userRole,
        status: test.status,
        startDate: test.startDate,
        endDate: test.endDate,
        targetMetric: test.targetMetric
      },
      variants: test.variants,
      results: test.results,
      exportedAt: new Date()
    };
  }

  /**
   * Clean up completed tests
   * @param {number} daysOld - Days old threshold
   */
  cleanupOldTests(daysOld = 90) {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    const testsToDelete = [];

    for (const [testId, test] of this.activeTests.entries()) {
      if (test.status === 'completed' && test.endDate < cutoffDate) {
        testsToDelete.push(testId);
      }
    }

    testsToDelete.forEach(testId => {
      this.activeTests.delete(testId);
      this.testResults.delete(testId);
      
      // Clean up user assignments
      for (const [key, assignment] of this.userAssignments.entries()) {
        if (assignment.testId === testId) {
          this.userAssignments.delete(key);
        }
      }
    });

    console.log(`Cleaned up ${testsToDelete.length} old tests`);
  }
}

export { TemplateABTestingFramework };
export default TemplateABTestingFramework;