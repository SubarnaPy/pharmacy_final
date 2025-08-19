import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Import CommonJS modules
const RealTimeAnalyticsService = require('./src/services/notifications/RealTimeAnalyticsService.js');
const DeliveryMonitoringService = require('./src/services/notifications/DeliveryMonitoringService.js');
const AnalyticsCollectionService = require('./src/services/notifications/AnalyticsCollectionService.js');

// Load environment variables
dotenv.config();

async function testAdminDashboard() {
  try {
    console.log('🧪 Testing Admin Dashboard Analytics...\n');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Test 1: Get Live Dashboard Data
    console.log('\n📊 Testing Live Dashboard Data...');
    const dashboardData = await RealTimeAnalyticsService.getLiveDashboardData();
    console.log('Dashboard Summary:', {
      todayTotal: dashboardData.summary.today.totalSent,
      yesterdayTotal: dashboardData.summary.yesterday.totalSent,
      systemHealth: dashboardData.systemHealth.status,
      recentEventsCount: dashboardData.recentEvents.length
    });

    // Test 2: Get System Health
    console.log('\n🏥 Testing System Health...');
    const systemHealth = await RealTimeAnalyticsService.getSystemHealth();
    console.log('System Health:', {
      status: systemHealth.status,
      deliveryRate: systemHealth.metrics.deliveryRate,
      failureRate: systemHealth.metrics.failureRate,
      issues: systemHealth.issues
    });

    // Test 3: Get Delivery Report
    console.log('\n📈 Testing Delivery Report...');
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours
    
    const deliveryReport = await DeliveryMonitoringService.getDeliveryReport(startDate, endDate);
    console.log('Delivery Report:', {
      overallSuccessRate: deliveryReport.overall.successRate,
      totalAttempts: deliveryReport.overall.totalAttempts,
      channelPerformance: {
        websocket: deliveryReport.channels.websocket.successRate,
        email: deliveryReport.channels.email.successRate,
        sms: deliveryReport.channels.sms.successRate
      }
    });

    // Test 4: Get Performance Trends
    console.log('\n📊 Testing Performance Trends...');
    const performanceTrends = await RealTimeAnalyticsService.getPerformanceTrends(7);
    console.log('Performance Trends (last 7 days):', {
      dataPoints: performanceTrends.length,
      latestTrend: performanceTrends[performanceTrends.length - 1] || 'No data'
    });

    // Test 5: Get Real-time Metrics
    console.log('\n⚡ Testing Real-time Metrics...');
    const realTimeMetrics = AnalyticsCollectionService.getRealTimeMetrics();
    console.log('Real-time Metrics:', realTimeMetrics);

    // Test 6: Get Engagement Metrics
    console.log('\n👥 Testing Engagement Metrics...');
    const engagementMetrics = await AnalyticsCollectionService.getEngagementMetrics(startDate, endDate);
    console.log('Engagement Metrics:', {
      readRate: engagementMetrics.readRate,
      actionRate: engagementMetrics.actionRate,
      emailOpenRate: engagementMetrics.emailOpenRate,
      emailClickRate: engagementMetrics.emailClickRate
    });

    // Test 7: Get Channel Performance
    console.log('\n📡 Testing Channel Performance...');
    const channelPerformance = await AnalyticsCollectionService.getChannelPerformance(startDate, endDate);
    console.log('Channel Performance:', channelPerformance);

    // Test 8: Test Alert Thresholds
    console.log('\n🚨 Testing Alert Thresholds...');
    const realTimeThresholds = RealTimeAnalyticsService.getAlertThresholds();
    const deliveryThresholds = DeliveryMonitoringService.getAlertThresholds();
    console.log('Alert Thresholds:', {
      realTime: realTimeThresholds,
      delivery: deliveryThresholds
    });

    // Test 9: Start Delivery Monitoring
    console.log('\n🔍 Testing Delivery Monitoring...');
    DeliveryMonitoringService.startMonitoring();
    console.log('Delivery monitoring started');
    
    // Wait a moment then check status
    setTimeout(async () => {
      const monitoringStatus = DeliveryMonitoringService.getCurrentStatus();
      console.log('Monitoring Status:', monitoringStatus);
      
      DeliveryMonitoringService.stopMonitoring();
      console.log('Delivery monitoring stopped');
      
      console.log('\n✅ All admin dashboard tests completed successfully!');
      process.exit(0);
    }, 2000);

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testAdminDashboard();