import cacheIntegrationService from './src/services/cache/CacheIntegrationService.js';
import redisCacheService from './src/services/cache/RedisCacheService.js';
import notificationQueueOptimizer from './src/services/cache/NotificationQueueOptimizer.js';
import databaseQueryOptimizer from './src/services/cache/DatabaseQueryOptimizer.js';
import connectionPoolManager from './src/services/cache/ConnectionPoolManager.js';

async function testNotificationCaching() {
  console.log('🚀 Testing Notification System Caching...\n');

  try {
    // Test 1: Initialize cache integration service
    console.log('1. Testing Cache Integration Service Initialization...');
    const initialized = await cacheIntegrationService.initialize();
    console.log(`✅ Cache integration service initialized: ${initialized}\n`);

    // Test 2: Test Redis caching
    console.log('2. Testing Redis Caching...');
    const testData = { message: 'Test notification', userId: 'user123' };
    
    await cacheIntegrationService.cacheNotificationData('test:notification:1', testData);
    const cachedData = await cacheIntegrationService.getCachedNotificationData('test:notification:1');
    
    console.log('✅ Redis caching test:', {
      original: testData,
      cached: cachedData,
      match: JSON.stringify(testData) === JSON.stringify(cachedData)
    });
    console.log();

    // Test 3: Test user preferences caching
    console.log('3. Testing User Preferences Caching...');
    const userId = 'user123';
    const preferences = {
      email: { enabled: true, frequency: 'immediate' },
      sms: { enabled: false },
      categories: { medical: { enabled: true } }
    };

    await cacheIntegrationService.updateUserPreferencesWithCache(userId, preferences);
    const cachedPreferences = await cacheIntegrationService.getUserPreferencesWithCache(userId);
    
    console.log('✅ User preferences caching test:', {
      cached: cachedPreferences !== null,
      match: JSON.stringify(preferences) === JSON.stringify(cachedPreferences)
    });
    console.log();

    // Test 4: Test template caching
    console.log('4. Testing Template Caching...');
    const templateKey = 'prescription_created_email_patient';
    const template = {
      subject: 'Your prescription is ready',
      body: 'Hello {{name}}, your prescription {{prescriptionId}} is ready.',
      type: 'email'
    };

    await redisCacheService.setTemplate(templateKey, template);
    const cachedTemplate = await cacheIntegrationService.getTemplateWithCache(templateKey);
    
    console.log('✅ Template caching test:', {
      cached: cachedTemplate !== null,
      match: JSON.stringify(template) === JSON.stringify(cachedTemplate)
    });
    console.log();

    // Test 5: Test notification queue optimization
    console.log('5. Testing Notification Queue Optimization...');
    const notification = {
      type: 'prescription_created',
      userId: 'user123',
      data: { prescriptionId: 'rx123' }
    };

    const queueId = await cacheIntegrationService.addNotificationToQueue(notification, 'high');
    const queueStats = await cacheIntegrationService.getQueueStatsWithCache();
    
    console.log('✅ Queue optimization test:', {
      queueId: queueId,
      totalQueued: queueStats?.totalQueued || 0,
      highPriorityCount: queueStats?.queues?.high?.count || 0
    });
    console.log();

    // Test 6: Test database query optimization
    console.log('6. Testing Database Query Optimization...');
    const queryKey = 'test_query_user_notifications';
    const queryResult = await databaseQueryOptimizer.getCachedQuery(
      queryKey,
      async () => {
        // Simulate database query
        await new Promise(resolve => setTimeout(resolve, 100));
        return { notifications: [], total: 0 };
      },
      300
    );

    const dbMetrics = await databaseQueryOptimizer.getPerformanceMetrics();
    
    console.log('✅ Database query optimization test:', {
      queryResult: queryResult !== null,
      cacheHitRate: dbMetrics.cacheHitRate,
      totalQueries: dbMetrics.totalQueries
    });
    console.log();

    // Test 7: Test connection pool management
    console.log('7. Testing Connection Pool Management...');
    const emailConnection = await cacheIntegrationService.getConnectionWithCache('email');
    const poolStats = await connectionPoolManager.getPoolStats('email');
    
    await cacheIntegrationService.releaseConnectionWithCache('email', emailConnection);
    
    console.log('✅ Connection pool test:', {
      connectionAcquired: emailConnection !== null,
      connectionId: emailConnection?.id,
      poolStats: {
        total: poolStats.connections.total,
        active: poolStats.connections.active,
        idle: poolStats.connections.idle
      }
    });
    console.log();

    // Test 8: Test performance optimization
    console.log('8. Testing Performance Optimization...');
    const optimizations = await cacheIntegrationService.optimizePerformance();
    
    console.log('✅ Performance optimization test:', {
      optimizationsCount: optimizations.length,
      services: optimizations.map(opt => opt.service)
    });
    console.log();

    // Test 9: Test health check
    console.log('9. Testing System Health Check...');
    const health = await cacheIntegrationService.healthCheck();
    
    console.log('✅ Health check test:', {
      status: health.status,
      services: Object.keys(health.services),
      cacheHitRate: health.overall.cacheHitRate,
      errorRate: health.overall.errorRate
    });
    console.log();

    // Test 10: Test cache invalidation
    console.log('10. Testing Cache Invalidation...');
    await cacheIntegrationService.invalidateTemplateCache(templateKey);
    const invalidatedTemplate = await redisCacheService.getTemplate(templateKey);
    
    console.log('✅ Cache invalidation test:', {
      templateInvalidated: invalidatedTemplate === null
    });
    console.log();

    // Test 11: Test system stats
    console.log('11. Testing System Stats...');
    const systemStats = await cacheIntegrationService.getSystemStats();
    
    console.log('✅ System stats test:', {
      initialized: systemStats.initialized,
      performance: systemStats.performance,
      healthStatus: systemStats.health.status
    });
    console.log();

    console.log('🎉 All caching tests completed successfully!');

    // Display final performance metrics
    console.log('\n📊 Final Performance Metrics:');
    console.log('================================');
    const finalHealth = await cacheIntegrationService.healthCheck();
    console.log(`Cache Hit Rate: ${finalHealth.overall.cacheHitRate.toFixed(2)}%`);
    console.log(`Average Response Time: ${finalHealth.overall.averageResponseTime.toFixed(2)}ms`);
    console.log(`Error Rate: ${finalHealth.overall.errorRate.toFixed(2)}%`);
    console.log(`System Status: ${finalHealth.status}`);

  } catch (error) {
    console.error('❌ Error during caching tests:', error);
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up...');
    await cacheIntegrationService.shutdown();
    console.log('✅ Cleanup completed');
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testNotificationCaching().catch(console.error);
}

export { testNotificationCaching };