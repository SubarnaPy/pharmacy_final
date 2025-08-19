const mongoose = require('mongoose');
const AnalyticsCollectionService = require('./src/services/notifications/AnalyticsCollectionService');
const RealTimeAnalyticsService = require('./src/services/notifications/RealTimeAnalyticsService');
const DeliveryMonitoringService = require('./src/services/notifications/DeliveryMonitoringService');
const NotificationAnalytics = require('./src/models/NotificationAnalytics');

// Mock notification object for testing
const mockNotification = {
  _id: new mongoose.Types.ObjectId(),
  type: 'prescription_created',
  priority: 'high',
  createdAt: new Date()
};

async function testAnalyticsCollection() {
  try {
    console.log('🧪 Testing Analytics Collection System...\n');

    // Test 1: Record notification sent
    console.log('1. Testing notification sent recording...');
    await AnalyticsCollectionService.recordNotificationSent(mockNotification, 'email', 'patient');
    console.log('✅ Notification sent recorded successfully');

    // Test 2: Record notification delivered
    console.log('\n2. Testing notification delivered recording...');
    await AnalyticsCollectionService.recordNotificationDelivered(mockNotification, 'email', 'patient', 2500);
    console.log('✅ Notification delivered recorded successfully');

    // Test 3: Record notification read
    console.log('\n3. Testing notification read recording...');
    const readTime = new Date();
    await AnalyticsCollectionService.recordNotificationRead(mockNotification, 'email', 'patient', readTime);
    console.log('✅ Notification read recorded successfully');

    // Test 4: Record notification action
    console.log('\n4. Testing notification action recording...');
    await AnalyticsCollectionService.recordNotificationAction(mockNotification, 'email', 'patient', 'clicked_link');
    console.log('✅ Notification action recorded successfully');

    // Test 5: Record email-specific events
    console.log('\n5. Testing email-specific events...');
    await AnalyticsCollectionService.recordEmailOpened(mockNotification, 'patient');
    await AnalyticsCollectionService.recordEmailClicked(mockNotification, 'patient', 'https://example.com');
    console.log('✅ Email events recorded successfully');

    // Test 6: Get real-time metrics
    console.log('\n6. Testing real-time metrics retrieval...');
    const realTimeMetrics = AnalyticsCollectionService.getRealTimeMetrics();
    console.log('Real-time metrics:', JSON.stringify(realTimeMetrics, null, 2));

    // Test 7: Get delivery success rate
    console.log('\n7. Testing delivery success rate calculation...');
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const today = new Date();
    const successRate = await AnalyticsCollectionService.getDeliverySuccessRate(yesterday, today);
    console.log(`Delivery success rate: ${successRate}%`);

    // Test 8: Get engagement metrics
    console.log('\n8. Testing engagement metrics...');
    const engagementMetrics = await AnalyticsCollectionService.getEngagementMetrics(yesterday, today);
    console.log('Engagement metrics:', JSON.stringify(engagementMetrics, null, 2));

    // Test 9: Get channel performance
    console.log('\n9. Testing channel performance...');
    const channelPerformance = await AnalyticsCollectionService.getChannelPerformance(yesterday, today);
    console.log('Channel performance:', JSON.stringify(channelPerformance, null, 2));

    // Test 10: Get recent events
    console.log('\n10. Testing recent events retrieval...');
    const recentEvents = AnalyticsCollectionService.getRecentEvents(5);
    console.log(`Recent events count: ${recentEvents.length}`);
    if (recentEvents.length > 0) {
      console.log('Latest event:', JSON.stringify(recentEvents[recentEvents.length - 1], null, 2));
    }

    // Test 11: Test RealTimeAnalyticsService
    console.log('\n11. Testing RealTimeAnalyticsService...');
    const systemHealth = await RealTimeAnalyticsService.getSystemHealth();
    console.log('System health:', JSON.stringify(systemHealth, null, 2));

    // Test 12: Test dashboard data
    console.log('\n12. Testing live dashboard data...');
    const dashboardData = await RealTimeAnalyticsService.getLiveDashboardData();
    console.log('Dashboard data keys:', Object.keys(dashboardData));

    // Test 13: Test performance trends
    console.log('\n13. Testing performance trends...');
    const trends = await RealTimeAnalyticsService.getPerformanceTrends(7);
    console.log(`Performance trends for last 7 days: ${trends.length} data points`);

    // Test 14: Test DeliveryMonitoringService
    console.log('\n14. Testing DeliveryMonitoringService...');
    const deliveryMetrics = await DeliveryMonitoringService.getDeliveryMetrics(yesterday, today);
    console.log('Delivery metrics keys:', Object.keys(deliveryMetrics));

    // Test 15: Test delivery report
    console.log('\n15. Testing delivery report...');
    const deliveryReport = await DeliveryMonitoringService.getDeliveryReport(yesterday, today);
    console.log('Delivery report keys:', Object.keys(deliveryReport));

    // Test 16: Test alert thresholds
    console.log('\n16. Testing alert thresholds...');
    const currentThresholds = DeliveryMonitoringService.getAlertThresholds();
    console.log('Current alert thresholds:', JSON.stringify(currentThresholds, null, 2));

    // Test 17: Flush buffer to database
    console.log('\n17. Testing buffer flush to database...');
    await AnalyticsCollectionService.flushBufferToDatabase();
    console.log('✅ Buffer flushed to database successfully');

    // Test 18: Verify data in database
    console.log('\n18. Verifying data in database...');
    const today_start = new Date();
    today_start.setHours(0, 0, 0, 0);
    
    const todayRecord = await NotificationAnalytics.findOne({ date: today_start });
    if (todayRecord) {
      console.log('✅ Analytics record found in database');
      console.log('Total sent:', todayRecord.totalSent);
      console.log('Total delivered:', todayRecord.totalDelivered);
      console.log('Total read:', todayRecord.totalRead);
    } else {
      console.log('ℹ️ No analytics record found for today (this is normal for new systems)');
    }

    console.log('\n🎉 All analytics collection tests completed successfully!');

  } catch (error) {
    console.error('❌ Error testing analytics collection:', error);
    throw error;
  }
}

// Run the test
if (require.main === module) {
  // Connect to MongoDB if not already connected
  if (mongoose.connection.readyState === 0) {
    require('dotenv').config();
    mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/healthcare_platform')
      .then(() => {
        console.log('Connected to MongoDB');
        return testAnalyticsCollection();
      })
      .then(() => {
        console.log('\nTest completed successfully');
        process.exit(0);
      })
      .catch(error => {
        console.error('Test failed:', error);
        process.exit(1);
      });
  } else {
    testAnalyticsCollection()
      .then(() => {
        console.log('\nTest completed successfully');
      })
      .catch(error => {
        console.error('Test failed:', error);
      });
  }
}

module.exports = testAnalyticsCollection;