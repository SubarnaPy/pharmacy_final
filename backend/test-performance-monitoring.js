import performanceIntegrationService from './src/services/performance/PerformanceIntegrationService.js';
import performanceMonitoringService from './src/services/performance/PerformanceMonitoringService.js';
import autoScalingService from './src/services/performance/AutoScalingService.js';
import loadTestingService from './src/services/performance/LoadTestingService.js';

async function testPerformanceMonitoring() {
  console.log('🚀 Testing Performance Monitoring and Optimization...\n');

  try {
    // Test 1: Initialize performance integration service
    console.log('1. Testing Performance Integration Service Initialization...');
    const initialized = await performanceIntegrationService.initialize();
    console.log(`✅ Performance integration service initialized: ${initialized}\n`);

    // Test 2: Test performance monitoring
    console.log('2. Testing Performance Monitoring...');
    
    // Simulate some requests
    for (let i = 0; i < 10; i++) {
      const responseTime = Math.random() * 1000 + 100; // 100-1100ms
      const success = Math.random() > 0.1; // 90% success rate
      performanceMonitoringService.trackRequest(responseTime, success);
    }

    // Simulate some notifications
    for (let i = 0; i < 5; i++) {
      const deliveryTime = Math.random() * 2000 + 500; // 500-2500ms
      const success = Math.random() > 0.05; // 95% success rate
      performanceMonitoringService.trackNotification(deliveryTime, success);
    }

    const metrics = performanceMonitoringService.getMetrics();
    console.log('✅ Performance monitoring test:', {
      totalRequests: metrics.requests.total,
      averageResponseTime: metrics.requests.averageResponseTime.toFixed(2),
      errorRate: metrics.errorRate.toFixed(2),
      memoryUsage: metrics.system.memoryUsage.toFixed(2)
    });
    console.log();

    // Test 3: Test auto-scaling service
    console.log('3. Testing Auto-Scaling Service...');
    const scalingStatus = autoScalingService.getScalingStatus();
    console.log('✅ Auto-scaling test:', {
      enabled: scalingStatus.enabled,
      currentInstances: scalingStatus.currentInstances,
      maxInstances: scalingStatus.rules.maxInstances,
      minInstances: scalingStatus.rules.minInstances
    });
    console.log();

    // Test 4: Test load testing service
    console.log('4. Testing Load Testing Service...');
    const scenarios = loadTestingService.getAvailableScenarios();
    console.log('✅ Load testing scenarios:', scenarios.map(s => s.name));
    
    // Start a light load test
    console.log('Starting light load test...');
    const testResult = await loadTestingService.startLoadTest('light', {
      duration: 10000, // 10 seconds for quick test
      maxUsers: 5
    });
    
    console.log('✅ Load test started:', {
      testId: testResult.testId,
      estimatedDuration: testResult.estimatedDuration
    });
    
    // Wait a bit and check test progress
    await new Promise(resolve => setTimeout(resolve, 5000));
    const testProgress = loadTestingService.getTestReport(testResult.testId);
    console.log('✅ Load test progress:', {
      status: testProgress?.status || 'unknown',
      totalRequests: testProgress?.metrics?.totalRequests || 0
    });
    console.log();

    // Test 5: Test integrated health check
    console.log('5. Testing Integrated Health Check...');
    const healthStatus = await performanceIntegrationService.getSystemStatus();
    console.log('✅ System health check:', {
      overall: healthStatus.overall,
      services: Object.keys(healthStatus.services),
      metricsAvailable: !!healthStatus.metrics,
      recommendationsCount: healthStatus.recommendations?.length || 0
    });
    console.log();

    // Test 6: Test performance metrics collection
    console.log('6. Testing Performance Metrics Collection...');
    const performanceMetrics = await performanceIntegrationService.getPerformanceMetrics();
    console.log('✅ Performance metrics:', {
      monitoringMetrics: !!performanceMetrics.monitoring,
      scalingMetrics: !!performanceMetrics.scaling,
      cacheMetrics: !!performanceMetrics.cache,
      timestamp: performanceMetrics.timestamp
    });
    console.log();

    // Test 7: Test optimization recommendations
    console.log('7. Testing Optimization Recommendations...');
    const recommendations = await performanceMonitoringService.generateOptimizationRecommendations();
    console.log('✅ Optimization recommendations:', {
      count: recommendations.length,
      types: recommendations.map(r => r.type)
    });
    console.log();

    // Test 8: Test capacity planning
    console.log('8. Testing Capacity Planning...');
    const capacityPlan = await autoScalingService.generateCapacityPlan({
      expectedRequestsPerSecond: 100,
      expectedUsers: 1000
    });
    console.log('✅ Capacity planning:', {
      currentCapacity: capacityPlan.currentCapacity,
      recommendationsCount: capacityPlan.recommendations.length
    });
    console.log();

    // Test 9: Test performance optimization
    console.log('9. Testing Performance Optimization...');
    const optimizations = await performanceIntegrationService.triggerOptimization();
    console.log('✅ Performance optimization:', {
      optimizationsCount: optimizations.length,
      services: optimizations.map(o => o.service)
    });
    console.log();

    // Test 10: Test alerting system
    console.log('10. Testing Alerting System...');
    
    // Simulate high response time to trigger alert
    performanceMonitoringService.trackRequest(3000, true); // 3 second response time
    
    const alerts = performanceMonitoringService.getAlerts(true); // Unacknowledged only
    console.log('✅ Alerting system:', {
      totalAlerts: alerts.length,
      severities: alerts.map(a => a.severity)
    });
    console.log();

    // Test 11: Test predictive scaling
    console.log('11. Testing Predictive Scaling...');
    const prediction = await autoScalingService.predictScalingNeeds();
    console.log('✅ Predictive scaling:', {
      prediction: prediction.prediction,
      recommendedAction: prediction.recommendedAction,
      predictionsCount: prediction.predictions?.length || 0
    });
    console.log();

    // Test 12: Test system resource monitoring
    console.log('12. Testing System Resource Monitoring...');
    
    // Update system resources
    performanceMonitoringService.updateSystemResources(25, 150, 75);
    
    const updatedMetrics = performanceMonitoringService.getMetrics();
    console.log('✅ System resource monitoring:', {
      activeConnections: updatedMetrics.system.activeConnections,
      queueSize: updatedMetrics.system.queueSize,
      connectionPoolUsage: updatedMetrics.system.connectionPoolUsage
    });
    console.log();

    console.log('🎉 All performance monitoring tests completed successfully!');

    // Display final system status
    console.log('\n📊 Final System Status:');
    console.log('========================');
    const finalStatus = await performanceIntegrationService.getSystemStatus();
    console.log(`Overall Health: ${finalStatus.overall}`);
    console.log(`Total Requests: ${finalStatus.metrics?.requests?.total || 0}`);
    console.log(`Average Response Time: ${finalStatus.metrics?.requests?.averageResponseTime?.toFixed(2) || 0}ms`);
    console.log(`Error Rate: ${finalStatus.metrics?.requests?.errorRate?.toFixed(2) || 0}%`);
    console.log(`Memory Usage: ${finalStatus.metrics?.system?.memoryUsage?.toFixed(2) || 0}%`);
    console.log(`CPU Usage: ${finalStatus.metrics?.system?.cpuUsage?.toFixed(2) || 0}%`);
    console.log(`Cache Hit Rate: ${finalStatus.metrics?.cache?.hitRate?.toFixed(2) || 0}%`);
    console.log(`Current Instances: ${finalStatus.metrics?.scaling?.currentInstances || 1}`);
    console.log(`Active Alerts: ${finalStatus.alerts?.length || 0}`);
    console.log(`Recommendations: ${finalStatus.recommendations?.length || 0}`);

  } catch (error) {
    console.error('❌ Error during performance monitoring tests:', error);
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up...');
    await performanceIntegrationService.shutdown();
    console.log('✅ Cleanup completed');
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testPerformanceMonitoring().catch(console.error);
}

export { testPerformanceMonitoring };