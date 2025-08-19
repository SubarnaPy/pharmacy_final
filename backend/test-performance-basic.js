import performanceMonitoringService from './src/services/performance/PerformanceMonitoringService.js';

async function testBasicPerformanceMonitoring() {
  console.log('🚀 Testing Basic Performance Monitoring...\n');

  try {
    // Test 1: Initialize performance monitoring service
    console.log('1. Testing Performance Monitoring Service Initialization...');
    const initialized = await performanceMonitoringService.initialize();
    console.log(`✅ Performance monitoring service initialized: ${initialized}`);
    
    // Test 2: Track some requests
    console.log('\n2. Testing Request Tracking...');
    for (let i = 0; i < 5; i++) {
      const responseTime = Math.random() * 1000 + 100; // 100-1100ms
      const success = Math.random() > 0.1; // 90% success rate
      performanceMonitoringService.trackRequest(responseTime, success);
    }
    
    const metrics = performanceMonitoringService.getMetrics();
    console.log('✅ Request tracking test:', {
      totalRequests: metrics.requests.total,
      successfulRequests: metrics.requests.successful,
      failedRequests: metrics.requests.failed,
      averageResponseTime: metrics.requests.averageResponseTime.toFixed(2)
    });
    
    // Test 3: Track notifications
    console.log('\n3. Testing Notification Tracking...');
    for (let i = 0; i < 3; i++) {
      const deliveryTime = Math.random() * 2000 + 500; // 500-2500ms
      const success = Math.random() > 0.05; // 95% success rate
      performanceMonitoringService.trackNotification(deliveryTime, success);
    }
    
    const updatedMetrics = performanceMonitoringService.getMetrics();
    console.log('✅ Notification tracking test:', {
      totalNotifications: updatedMetrics.notifications.sent,
      deliveredNotifications: updatedMetrics.notifications.delivered,
      failedNotifications: updatedMetrics.notifications.failed,
      averageDeliveryTime: updatedMetrics.notifications.averageDeliveryTime.toFixed(2)
    });
    
    // Test 4: Test cache operations
    console.log('\n4. Testing Cache Operation Tracking...');
    performanceMonitoringService.trackCacheOperation(true, 50); // Cache hit
    performanceMonitoringService.trackCacheOperation(false, 0); // Cache miss
    performanceMonitoringService.trackCacheOperation(true, 30); // Cache hit
    
    const cacheMetrics = performanceMonitoringService.getMetrics();
    console.log('✅ Cache operation tracking test:', {
      cacheHits: cacheMetrics.cache.hits,
      cacheMisses: cacheMetrics.cache.misses,
      hitRate: cacheMetrics.cache.hitRate.toFixed(2)
    });
    
    // Test 5: Test database query tracking
    console.log('\n5. Testing Database Query Tracking...');
    performanceMonitoringService.trackDatabaseQuery(150, false); // Fast query
    performanceMonitoringService.trackDatabaseQuery(800, true);  // Slow query
    performanceMonitoringService.trackDatabaseQuery(200, false); // Fast query
    
    const dbMetrics = performanceMonitoringService.getMetrics();
    console.log('✅ Database query tracking test:', {
      totalQueries: dbMetrics.database.queries,
      slowQueries: dbMetrics.database.slowQueries,
      averageQueryTime: dbMetrics.database.averageQueryTime.toFixed(2)
    });
    
    // Test 6: Test system resource updates
    console.log('\n6. Testing System Resource Updates...');
    performanceMonitoringService.updateSystemResources(50, 200, 75);
    
    const systemMetrics = performanceMonitoringService.getMetrics();
    console.log('✅ System resource updates test:', {
      activeConnections: systemMetrics.system.activeConnections,
      queueSize: systemMetrics.system.queueSize,
      connectionPoolUsage: systemMetrics.system.connectionPoolUsage,
      memoryUsage: systemMetrics.system.memoryUsage.toFixed(2),
      cpuUsage: systemMetrics.system.cpuUsage.toFixed(2)
    });
    
    // Test 7: Test alerts
    console.log('\n7. Testing Alert System...');
    const alertId = performanceMonitoringService.addAlert(
      'test_alert',
      'This is a test alert',
      { testValue: 123 }
    );
    
    const alerts = performanceMonitoringService.getAlerts();
    console.log('✅ Alert system test:', {
      alertId: alertId,
      totalAlerts: alerts.length,
      latestAlert: alerts[alerts.length - 1]?.message
    });
    
    // Test 8: Test optimization recommendations
    console.log('\n8. Testing Optimization Recommendations...');
    const recommendations = await performanceMonitoringService.generateOptimizationRecommendations();
    console.log('✅ Optimization recommendations test:', {
      recommendationsCount: recommendations.length,
      types: recommendations.map(r => r.type)
    });
    
    // Test 9: Test health status
    console.log('\n9. Testing Health Status...');
    const healthStatus = await performanceMonitoringService.getHealthStatus();
    console.log('✅ Health status test:', {
      status: healthStatus.status,
      metricsAvailable: !!healthStatus.metrics,
      alertsCount: healthStatus.alerts.length,
      recommendationsCount: healthStatus.recommendations.length
    });
    
    console.log('\n🎉 Basic performance monitoring tests completed successfully!');
    
    // Display final metrics summary
    console.log('\n📊 Final Metrics Summary:');
    console.log('==========================');
    const finalMetrics = performanceMonitoringService.getMetrics();
    console.log(`Uptime: ${finalMetrics.uptime.toFixed(2)} seconds`);
    console.log(`Total Requests: ${finalMetrics.requests.total}`);
    console.log(`Average Response Time: ${finalMetrics.requests.averageResponseTime.toFixed(2)}ms`);
    console.log(`Error Rate: ${finalMetrics.errorRate.toFixed(2)}%`);
    console.log(`Cache Hit Rate: ${finalMetrics.cache.hitRate.toFixed(2)}%`);
    console.log(`Memory Usage: ${finalMetrics.system.memoryUsage.toFixed(2)}%`);
    console.log(`CPU Usage: ${finalMetrics.system.cpuUsage.toFixed(2)}%`);
    
  } catch (error) {
    console.error('❌ Error during basic performance monitoring tests:', error);
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up...');
    await performanceMonitoringService.shutdown();
    console.log('✅ Cleanup completed');
  }
}

// Run the test
testBasicPerformanceMonitoring().catch(console.error);