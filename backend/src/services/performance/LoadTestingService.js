import performanceMonitoringService from './PerformanceMonitoringService.js';
import logger from '../LoggerService.js';

class LoadTestingService {
  constructor() {
    this.activeTests = new Map();
    this.testHistory = [];
    this.testScenarios = {
      light: {
        name: 'Light Load',
        duration: 60000, // 1 minute
        rampUpTime: 10000, // 10 seconds
        maxUsers: 10,
        requestsPerUser: 5,
        thinkTime: 1000 // 1 second between requests
      },
      moderate: {
        name: 'Moderate Load',
        duration: 300000, // 5 minutes
        rampUpTime: 30000, // 30 seconds
        maxUsers: 50,
        requestsPerUser: 10,
        thinkTime: 500
      },
      heavy: {
        name: 'Heavy Load',
        duration: 600000, // 10 minutes
        rampUpTime: 60000, // 1 minute
        maxUsers: 200,
        requestsPerUser: 20,
        thinkTime: 200
      },
      stress: {
        name: 'Stress Test',
        duration: 900000, // 15 minutes
        rampUpTime: 120000, // 2 minutes
        maxUsers: 500,
        requestsPerUser: 50,
        thinkTime: 100
      },
      spike: {
        name: 'Spike Test',
        duration: 180000, // 3 minutes
        rampUpTime: 5000, // 5 seconds (rapid spike)
        maxUsers: 1000,
        requestsPerUser: 10,
        thinkTime: 50
      }
    };
  }

  async initialize() {
    try {
      logger.info('Initializing load testing service...');
      logger.info('Load testing service initialized');
      return true;
    } catch (error) {
      logger.error('Failed to initialize load testing service:', error);
      return false;
    }
  }

  // Start a load test
  async startLoadTest(scenarioName, customConfig = {}) {
    try {
      const scenario = this.testScenarios[scenarioName];
      if (!scenario) {
        throw new Error(`Unknown test scenario: ${scenarioName}`);
      }

      const testId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const config = { ...scenario, ...customConfig };

      logger.info(`Starting load test: ${config.name}`, { testId, config });

      const test = {
        id: testId,
        scenario: scenarioName,
        config,
        startTime: new Date(),
        status: 'running',
        metrics: {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          averageResponseTime: 0,
          minResponseTime: Infinity,
          maxResponseTime: 0,
          responseTimeHistory: [],
          throughput: 0,
          errorRate: 0,
          activeUsers: 0,
          completedUsers: 0
        },
        phases: {
          rampUp: { status: 'pending', startTime: null, endTime: null },
          steadyState: { status: 'pending', startTime: null, endTime: null },
          rampDown: { status: 'pending', startTime: null, endTime: null }
        }
      };

      this.activeTests.set(testId, test);

      // Start the test execution
      this.executeLoadTest(test);

      return {
        testId,
        message: `Load test ${config.name} started`,
        estimatedDuration: config.duration + config.rampUpTime
      };
    } catch (error) {
      logger.error('Error starting load test:', error);
      throw error;
    }
  }

  async executeLoadTest(test) {
    try {
      const { config } = test;
      
      // Phase 1: Ramp up
      await this.executeRampUpPhase(test);
      
      // Phase 2: Steady state
      await this.executeSteadyStatePhase(test);
      
      // Phase 3: Ramp down
      await this.executeRampDownPhase(test);
      
      // Complete the test
      await this.completeLoadTest(test);
      
    } catch (error) {
      logger.error(`Error executing load test ${test.id}:`, error);
      test.status = 'failed';
      test.error = error.message;
      test.endTime = new Date();
    }
  }

  async executeRampUpPhase(test) {
    const { config } = test;
    
    test.phases.rampUp.status = 'running';
    test.phases.rampUp.startTime = new Date();
    
    logger.info(`Starting ramp-up phase for test ${test.id}`);
    
    const userIncrement = config.maxUsers / (config.rampUpTime / 1000);
    let currentUsers = 0;
    
    const rampUpInterval = setInterval(() => {
      if (currentUsers < config.maxUsers) {
        currentUsers = Math.min(currentUsers + userIncrement, config.maxUsers);
        test.metrics.activeUsers = Math.floor(currentUsers);
        
        // Start virtual users
        this.startVirtualUsers(test, Math.floor(userIncrement));
      }
    }, 1000);
    
    // Wait for ramp-up to complete
    await new Promise(resolve => setTimeout(resolve, config.rampUpTime));
    
    clearInterval(rampUpInterval);
    test.phases.rampUp.status = 'completed';
    test.phases.rampUp.endTime = new Date();
    
    logger.info(`Ramp-up phase completed for test ${test.id}`);
  }

  async executeSteadyStatePhase(test) {
    const { config } = test;
    
    test.phases.steadyState.status = 'running';
    test.phases.steadyState.startTime = new Date();
    
    logger.info(`Starting steady-state phase for test ${test.id}`);
    
    // Maintain steady load
    const steadyStateInterval = setInterval(() => {
      // Continue generating load at steady rate
      this.maintainSteadyLoad(test);
    }, 1000);
    
    // Wait for steady state duration
    await new Promise(resolve => setTimeout(resolve, config.duration));
    
    clearInterval(steadyStateInterval);
    test.phases.steadyState.status = 'completed';
    test.phases.steadyState.endTime = new Date();
    
    logger.info(`Steady-state phase completed for test ${test.id}`);
  }

  async executeRampDownPhase(test) {
    test.phases.rampDown.status = 'running';
    test.phases.rampDown.startTime = new Date();
    
    logger.info(`Starting ramp-down phase for test ${test.id}`);
    
    // Gradually reduce load
    const rampDownTime = 30000; // 30 seconds
    const userDecrement = test.metrics.activeUsers / (rampDownTime / 1000);
    
    const rampDownInterval = setInterval(() => {
      if (test.metrics.activeUsers > 0) {
        test.metrics.activeUsers = Math.max(0, test.metrics.activeUsers - userDecrement);
      }
    }, 1000);
    
    await new Promise(resolve => setTimeout(resolve, rampDownTime));
    
    clearInterval(rampDownInterval);
    test.phases.rampDown.status = 'completed';
    test.phases.rampDown.endTime = new Date();
    
    logger.info(`Ramp-down phase completed for test ${test.id}`);
  }

  startVirtualUsers(test, userCount) {
    for (let i = 0; i < userCount; i++) {
      this.simulateVirtualUser(test);
    }
  }

  async simulateVirtualUser(test) {
    const { config } = test;
    
    for (let i = 0; i < config.requestsPerUser; i++) {
      if (test.status !== 'running') break;
      
      try {
        const startTime = Date.now();
        
        // Simulate request
        await this.simulateRequest(test);
        
        const responseTime = Date.now() - startTime;
        this.recordRequestMetrics(test, responseTime, true);
        
        // Think time between requests
        if (i < config.requestsPerUser - 1) {
          await new Promise(resolve => setTimeout(resolve, config.thinkTime));
        }
      } catch (error) {
        this.recordRequestMetrics(test, 0, false);
      }
    }
    
    test.metrics.completedUsers++;
  }

  async simulateRequest(test) {
    // Simulate different types of requests
    const requestTypes = [
      { type: 'notification_send', weight: 30, responseTime: () => Math.random() * 500 + 100 },
      { type: 'user_preferences', weight: 20, responseTime: () => Math.random() * 200 + 50 },
      { type: 'template_render', weight: 25, responseTime: () => Math.random() * 300 + 75 },
      { type: 'analytics_query', weight: 15, responseTime: () => Math.random() * 1000 + 200 },
      { type: 'health_check', weight: 10, responseTime: () => Math.random() * 100 + 25 }
    ];
    
    // Select request type based on weight
    const random = Math.random() * 100;
    let cumulativeWeight = 0;
    let selectedRequest = requestTypes[0];
    
    for (const request of requestTypes) {
      cumulativeWeight += request.weight;
      if (random <= cumulativeWeight) {
        selectedRequest = request;
        break;
      }
    }
    
    // Simulate request processing time
    const responseTime = selectedRequest.responseTime();
    await new Promise(resolve => setTimeout(resolve, responseTime));
    
    // Simulate occasional failures
    if (Math.random() < 0.02) { // 2% failure rate
      throw new Error('Simulated request failure');
    }
    
    return {
      type: selectedRequest.type,
      responseTime,
      success: true
    };
  }

  maintainSteadyLoad(test) {
    // Continue generating requests at steady rate
    const requestsPerSecond = test.metrics.activeUsers * (1000 / test.config.thinkTime);
    
    for (let i = 0; i < requestsPerSecond; i++) {
      setTimeout(() => {
        this.simulateRequest(test)
          .then(result => this.recordRequestMetrics(test, result.responseTime, true))
          .catch(() => this.recordRequestMetrics(test, 0, false));
      }, Math.random() * 1000);
    }
  }

  recordRequestMetrics(test, responseTime, success) {
    const metrics = test.metrics;
    
    metrics.totalRequests++;
    
    if (success) {
      metrics.successfulRequests++;
      
      // Update response time metrics
      metrics.responseTimeHistory.push(responseTime);
      if (metrics.responseTimeHistory.length > 1000) {
        metrics.responseTimeHistory.shift();
      }
      
      metrics.averageResponseTime = 
        metrics.responseTimeHistory.reduce((a, b) => a + b, 0) / 
        metrics.responseTimeHistory.length;
      
      metrics.minResponseTime = Math.min(metrics.minResponseTime, responseTime);
      metrics.maxResponseTime = Math.max(metrics.maxResponseTime, responseTime);
      
      // Track with performance monitoring service
      performanceMonitoringService.trackRequest(responseTime, true);
    } else {
      metrics.failedRequests++;
      performanceMonitoringService.trackRequest(0, false);
    }
    
    // Calculate derived metrics
    metrics.errorRate = (metrics.failedRequests / metrics.totalRequests) * 100;
    
    const testDuration = (Date.now() - test.startTime.getTime()) / 1000;
    metrics.throughput = metrics.totalRequests / testDuration;
  }

  async completeLoadTest(test) {
    test.status = 'completed';
    test.endTime = new Date();
    test.duration = test.endTime.getTime() - test.startTime.getTime();
    
    // Generate test report
    const report = await this.generateTestReport(test);
    test.report = report;
    
    // Move to history
    this.testHistory.push(test);
    this.activeTests.delete(test.id);
    
    // Limit history size
    if (this.testHistory.length > 50) {
      this.testHistory.shift();
    }
    
    logger.info(`Load test completed: ${test.id}`, {
      duration: test.duration,
      totalRequests: test.metrics.totalRequests,
      errorRate: test.metrics.errorRate,
      averageResponseTime: test.metrics.averageResponseTime
    });
    
    return report;
  }

  async generateTestReport(test) {
    const metrics = test.metrics;
    const config = test.config;
    
    // Calculate percentiles
    const sortedResponseTimes = [...metrics.responseTimeHistory].sort((a, b) => a - b);
    const percentiles = {
      p50: this.calculatePercentile(sortedResponseTimes, 50),
      p90: this.calculatePercentile(sortedResponseTimes, 90),
      p95: this.calculatePercentile(sortedResponseTimes, 95),
      p99: this.calculatePercentile(sortedResponseTimes, 99)
    };
    
    // Performance assessment
    const assessment = this.assessPerformance(test);
    
    const report = {
      testId: test.id,
      scenario: test.scenario,
      config,
      duration: test.duration,
      phases: test.phases,
      
      // Request metrics
      totalRequests: metrics.totalRequests,
      successfulRequests: metrics.successfulRequests,
      failedRequests: metrics.failedRequests,
      errorRate: metrics.errorRate,
      throughput: metrics.throughput,
      
      // Response time metrics
      averageResponseTime: metrics.averageResponseTime,
      minResponseTime: metrics.minResponseTime,
      maxResponseTime: metrics.maxResponseTime,
      responseTimePercentiles: percentiles,
      
      // User metrics
      maxConcurrentUsers: config.maxUsers,
      completedUsers: metrics.completedUsers,
      
      // Performance assessment
      assessment,
      
      // Recommendations
      recommendations: this.generateRecommendations(test),
      
      // System impact
      systemImpact: await this.analyzeSystemImpact(test),
      
      timestamp: new Date()
    };
    
    return report;
  }

  calculatePercentile(sortedArray, percentile) {
    if (sortedArray.length === 0) return 0;
    
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }

  assessPerformance(test) {
    const metrics = test.metrics;
    const assessment = {
      overall: 'good',
      responseTime: 'good',
      errorRate: 'good',
      throughput: 'good',
      stability: 'good'
    };
    
    // Assess response time
    if (metrics.averageResponseTime > 2000) {
      assessment.responseTime = 'poor';
      assessment.overall = 'poor';
    } else if (metrics.averageResponseTime > 1000) {
      assessment.responseTime = 'fair';
      if (assessment.overall === 'good') assessment.overall = 'fair';
    }
    
    // Assess error rate
    if (metrics.errorRate > 5) {
      assessment.errorRate = 'poor';
      assessment.overall = 'poor';
    } else if (metrics.errorRate > 1) {
      assessment.errorRate = 'fair';
      if (assessment.overall === 'good') assessment.overall = 'fair';
    }
    
    // Assess throughput
    const expectedThroughput = test.config.maxUsers * (1000 / test.config.thinkTime);
    if (metrics.throughput < expectedThroughput * 0.5) {
      assessment.throughput = 'poor';
      assessment.overall = 'poor';
    } else if (metrics.throughput < expectedThroughput * 0.8) {
      assessment.throughput = 'fair';
      if (assessment.overall === 'good') assessment.overall = 'fair';
    }
    
    return assessment;
  }

  generateRecommendations(test) {
    const recommendations = [];
    const metrics = test.metrics;
    const assessment = this.assessPerformance(test);
    
    if (assessment.responseTime === 'poor') {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message: 'High response times detected. Consider optimizing database queries and adding caching.',
        metric: 'response_time',
        value: metrics.averageResponseTime
      });
    }
    
    if (assessment.errorRate === 'poor') {
      recommendations.push({
        type: 'reliability',
        priority: 'critical',
        message: 'High error rate detected. Investigate error causes and improve error handling.',
        metric: 'error_rate',
        value: metrics.errorRate
      });
    }
    
    if (assessment.throughput === 'poor') {
      recommendations.push({
        type: 'scalability',
        priority: 'high',
        message: 'Low throughput detected. Consider horizontal scaling or performance optimization.',
        metric: 'throughput',
        value: metrics.throughput
      });
    }
    
    // Resource-based recommendations
    const systemMetrics = performanceMonitoringService.getMetrics();
    if (systemMetrics.system.memoryUsage > 80) {
      recommendations.push({
        type: 'resources',
        priority: 'medium',
        message: 'High memory usage during load test. Consider increasing memory allocation.',
        metric: 'memory_usage',
        value: systemMetrics.system.memoryUsage
      });
    }
    
    return recommendations;
  }

  async analyzeSystemImpact(test) {
    const systemMetrics = performanceMonitoringService.getMetrics();
    
    return {
      peakMemoryUsage: systemMetrics.system.memoryUsage,
      peakCpuUsage: systemMetrics.system.cpuUsage,
      cacheHitRate: systemMetrics.cache.hitRate,
      databaseQueries: systemMetrics.database.queries,
      activeConnections: systemMetrics.system.activeConnections,
      queueSize: systemMetrics.system.queueSize
    };
  }

  // Test management
  async stopLoadTest(testId) {
    const test = this.activeTests.get(testId);
    if (!test) {
      throw new Error(`Test ${testId} not found or already completed`);
    }
    
    test.status = 'stopped';
    test.endTime = new Date();
    
    logger.info(`Load test stopped: ${testId}`);
    
    return await this.completeLoadTest(test);
  }

  getActiveTests() {
    return Array.from(this.activeTests.values());
  }

  getTestHistory(limit = 20) {
    return this.testHistory.slice(-limit);
  }

  getTestReport(testId) {
    // Check active tests first
    const activeTest = this.activeTests.get(testId);
    if (activeTest) {
      return {
        ...activeTest,
        status: 'running',
        progress: this.calculateTestProgress(activeTest)
      };
    }
    
    // Check history
    const historicalTest = this.testHistory.find(test => test.id === testId);
    return historicalTest || null;
  }

  calculateTestProgress(test) {
    const totalDuration = test.config.duration + test.config.rampUpTime;
    const elapsed = Date.now() - test.startTime.getTime();
    return Math.min((elapsed / totalDuration) * 100, 100);
  }

  // Custom test scenarios
  createCustomScenario(name, config) {
    this.testScenarios[name] = {
      name: config.name || name,
      duration: config.duration || 300000,
      rampUpTime: config.rampUpTime || 30000,
      maxUsers: config.maxUsers || 50,
      requestsPerUser: config.requestsPerUser || 10,
      thinkTime: config.thinkTime || 1000
    };
    
    logger.info(`Custom test scenario created: ${name}`, this.testScenarios[name]);
  }

  getAvailableScenarios() {
    return Object.keys(this.testScenarios).map(key => ({
      key,
      ...this.testScenarios[key]
    }));
  }

  // Cleanup
  async shutdown() {
    try {
      // Stop all active tests
      for (const [testId, test] of this.activeTests) {
        test.status = 'stopped';
        test.endTime = new Date();
        logger.info(`Stopping active test during shutdown: ${testId}`);
      }
      
      this.activeTests.clear();
      logger.info('Load testing service shutdown');
    } catch (error) {
      logger.error('Error during load testing service shutdown:', error);
    }
  }
}

export default new LoadTestingService();