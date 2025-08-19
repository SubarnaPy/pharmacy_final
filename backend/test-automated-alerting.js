import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Load environment variables
dotenv.config();

// Import the AutomatedAlertingService
const AutomatedAlertingService = require('./src/services/notifications/AutomatedAlertingService.js');

async function testAutomatedAlerting() {
  try {
    console.log('🧪 Testing Automated Alerting Service...\n');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Test 1: Process a critical failure rate alert
    console.log('\n🚨 Testing critical failure rate alert...');
    const criticalAlert = {
      type: 'critical_failure_rate',
      severity: 'critical',
      message: 'Notification failure rate has exceeded critical threshold (30%)',
      metrics: {
        failureRate: 30.5,
        totalSent: 1000,
        totalFailed: 305
      },
      timestamp: new Date()
    };

    await AutomatedAlertingService.processAlert(criticalAlert);
    console.log('✅ Critical alert processed');

    // Test 2: Process a low delivery rate alert
    console.log('\n⚠️ Testing low delivery rate alert...');
    const lowDeliveryAlert = {
      type: 'low_delivery_rate',
      severity: 'warning',
      message: 'Notification delivery rate has dropped below threshold (75%)',
      metrics: {
        deliveryRate: 74.2,
        totalSent: 500,
        totalDelivered: 371
      },
      timestamp: new Date()
    };

    await AutomatedAlertingService.processAlert(lowDeliveryAlert);
    console.log('✅ Low delivery rate alert processed');

    // Test 3: Process a stuck notifications alert
    console.log('\n🔄 Testing stuck notifications alert...');
    const stuckAlert = {
      type: 'stuck_notifications',
      severity: 'warning',
      message: 'Found 25 notifications stuck in pending state for over 15 minutes',
      count: 25,
      oldestNotification: new Date(Date.now() - 20 * 60 * 1000),
      timestamp: new Date()
    };

    await AutomatedAlertingService.processAlert(stuckAlert);
    console.log('✅ Stuck notifications alert processed');

    // Test 4: Get active alerts
    console.log('\n📋 Testing active alerts retrieval...');
    const activeAlerts = AutomatedAlertingService.getActiveAlerts();
    console.log(`Active alerts count: ${activeAlerts.length}`);
    activeAlerts.forEach((alert, index) => {
      console.log(`  ${index + 1}. ${alert.type} (${alert.severity}) - ${alert.message.substring(0, 50)}...`);
    });

    // Test 5: Get alert statistics
    console.log('\n📊 Testing alert statistics...');
    const statistics = AutomatedAlertingService.getAlertStatistics();
    console.log('Alert Statistics:', {
      activeTotal: statistics.active.total,
      activeCritical: statistics.active.critical,
      activeUnacknowledged: statistics.active.unacknowledged,
      resolvedTotal: statistics.resolved.total,
      typeBreakdown: Object.keys(statistics.types).length
    });

    // Test 6: Get escalation rules
    console.log('\n⚡ Testing escalation rules...');
    const escalationRules = AutomatedAlertingService.getEscalationRules();
    console.log('Available escalation rules:', Object.keys(escalationRules));
    
    // Show details for critical_failure_rate rule
    if (escalationRules.critical_failure_rate) {
      console.log('Critical failure rate escalation levels:', 
        escalationRules.critical_failure_rate.levels.length);
    }

    // Test 7: Test alert acknowledgment (if we have active alerts)
    if (activeAlerts.length > 0) {
      console.log('\n✅ Testing alert acknowledgment...');
      const alertToAcknowledge = activeAlerts[0];
      
      try {
        const acknowledgedAlert = await AutomatedAlertingService.acknowledgeAlert(
          alertToAcknowledge.id,
          'test-admin-id',
          'Acknowledged during testing'
        );
        console.log(`✅ Alert acknowledged: ${acknowledgedAlert.id}`);
      } catch (error) {
        console.log(`⚠️ Acknowledgment test: ${error.message}`);
      }
    }

    // Test 8: Test alert resolution (if we have acknowledged alerts)
    const acknowledgedAlerts = activeAlerts.filter(alert => alert.acknowledged);
    if (acknowledgedAlerts.length > 0) {
      console.log('\n🔧 Testing alert resolution...');
      const alertToResolve = acknowledgedAlerts[0];
      
      try {
        const resolvedAlert = await AutomatedAlertingService.resolveAlert(
          alertToResolve.id,
          'test-admin-id',
          'Issue resolved by restarting notification service'
        );
        console.log(`✅ Alert resolved: ${resolvedAlert.id}`);
      } catch (error) {
        console.log(`⚠️ Resolution test: ${error.message}`);
      }
    }

    // Test 9: Test duplicate alert handling
    console.log('\n🔄 Testing duplicate alert handling...');
    await AutomatedAlertingService.processAlert(criticalAlert); // Same alert as Test 1
    console.log('✅ Duplicate alert handling tested');

    // Test 10: Get alert history
    console.log('\n📚 Testing alert history...');
    const alertHistory = AutomatedAlertingService.getAlertHistory(10);
    console.log(`Alert history count: ${alertHistory.length}`);

    // Test 11: Test escalation rule update
    console.log('\n⚙️ Testing escalation rule update...');
    const newRule = {
      levels: [
        { delay: 0, recipients: ['admin'], channels: ['websocket', 'email'] },
        { delay: 600000, recipients: ['admin', 'senior_admin'], channels: ['websocket', 'email', 'sms'] }
      ],
      cooldown: 1800000
    };
    
    AutomatedAlertingService.updateEscalationRule('test_alert_type', newRule);
    const updatedRules = AutomatedAlertingService.getEscalationRules();
    console.log('✅ Escalation rule updated, total rules:', Object.keys(updatedRules).length);

    // Wait a moment to see any escalation in action
    console.log('\n⏳ Waiting 5 seconds to observe escalation behavior...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Final status check
    console.log('\n📊 Final status check...');
    const finalStats = AutomatedAlertingService.getAlertStatistics();
    const finalActiveAlerts = AutomatedAlertingService.getActiveAlerts();
    
    console.log('Final Statistics:', {
      activeAlerts: finalStats.active.total,
      acknowledgedAlerts: finalStats.active.acknowledged,
      resolvedAlerts: finalStats.resolved.total
    });

    console.log('\n✅ All automated alerting tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    
    // Clean up any remaining timers
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  }
}

// Handle cleanup on exit
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted, cleaning up...');
  mongoose.disconnect();
  process.exit(0);
});

// Run the test
testAutomatedAlerting();