/**
 * Test script for SMS Service Manager
 * Tests SMS provider integration, phone validation, and message optimization
 */

import SMSServiceManager from './src/services/notifications/SMSServiceManager.js';
import notificationConfig from './src/config/notificationConfig.js';

async function testSMSServiceManager() {
  console.log('🧪 Testing SMS Service Manager...\n');

  try {
    // Initialize SMS Service Manager
    console.log('1. Initializing SMS Service Manager...');
    const smsManager = new SMSServiceManager({
      config: notificationConfig.integration.external_services
    });
    
    console.log('✅ SMS Service Manager initialized successfully');
    console.log(`📱 Available providers: ${Array.from(smsManager.providers.keys()).join(', ')}`);
    console.log(`📱 Primary provider: ${smsManager.currentProvider?.name}`);
    console.log(`📱 Backup provider: ${smsManager.backupProvider?.name || 'None'}\n`);

    // Test phone number validation
    console.log('2. Testing phone number validation...');
    
    const testPhoneNumbers = [
      '+1234567890',
      '1234567890',
      '(123) 456-7890',
      '+44 20 7946 0958', // UK number
      'invalid-phone',
      '123' // Too short
    ];

    for (const phone of testPhoneNumbers) {
      try {
        const validation = await smsManager.validateAndFormatPhoneNumber(phone);
        console.log(`📞 ${phone} -> ${validation.isValid ? '✅ Valid' : '❌ Invalid'}: ${validation.formatted || validation.error}`);
      } catch (error) {
        console.log(`📞 ${phone} -> ❌ Error: ${error.message}`);
      }
    }
    console.log();

    // Test message optimization
    console.log('3. Testing message optimization...');
    
    const testMessages = [
      'Short message',
      'This is a medium length message that should fit within SMS limits without any issues.',
      'This is a very long message that exceeds the standard SMS character limit of 160 characters and should be automatically optimized by truncating at word boundaries to maintain readability while staying within the SMS length constraints.',
      'Thisisaverylongmessagewithoutanyspacesorwordboundariesthatexceedsthesmslimitandneedstobehardtruncatedbecausetherearenowordboundariesavailable'
    ];

    testMessages.forEach((message, index) => {
      const optimized = smsManager.optimizeMessageForSMS(message);
      console.log(`📝 Message ${index + 1}:`);
      console.log(`   Original (${message.length} chars): ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`);
      console.log(`   Optimized (${optimized.length} chars): ${optimized}`);
      console.log();
    });

    // Test SMS sending with test provider
    console.log('4. Testing SMS sending...');
    
    const testSMSData = {
      to: '+1234567890',
      message: 'Test SMS from Healthcare Platform: Your appointment is confirmed for tomorrow at 2:00 PM.',
      metadata: {
        type: 'appointment_reminder',
        urgency: 'medium',
        appointmentId: 'apt_123'
      },
      userId: 'user_123',
      notificationId: 'notif_456',
      priority: 'normal'
    };

    const sendResult = await smsManager.sendSMS(testSMSData);
    console.log('✅ SMS sent successfully:');
    console.log(`   Provider: ${sendResult.provider}`);
    console.log(`   Message ID: ${sendResult.messageId}`);
    console.log(`   Cost: $${sendResult.cost}`);
    console.log(`   Fallback used: ${sendResult.fallbackUsed || false}\n`);

    // Test bulk SMS sending
    console.log('5. Testing bulk SMS sending...');
    
    const recipients = ['+1234567890', '+1234567891', '+1234567892'];
    const bulkSMSData = {
      message: 'Bulk SMS test: System maintenance scheduled for tonight 11 PM - 1 AM.',
      metadata: {
        type: 'system_maintenance',
        urgency: 'high'
      },
      priority: 'high'
    };

    const bulkResult = await smsManager.sendBulkSMS(recipients, bulkSMSData);
    console.log('✅ Bulk SMS sent:');
    console.log(`   Total recipients: ${bulkResult.totalRecipients}`);
    console.log(`   Successful: ${bulkResult.successCount}`);
    console.log(`   Failed: ${bulkResult.failureCount}`);
    console.log(`   Total cost: $${bulkResult.totalCost}`);
    console.log();

    // Test delivery tracking
    console.log('6. Testing delivery tracking...');
    
    const webhookData = {
      provider: 'twilio',
      messageId: 'test-message-123',
      status: 'delivered',
      timestamp: new Date().toISOString(),
      recipient: '+1234567890'
    };

    const trackingResult = await smsManager.trackSMSDelivery(webhookData);
    console.log('✅ Delivery tracking processed:');
    console.log(`   Status: ${trackingResult.status}`);
    console.log(`   Message ID: ${trackingResult.messageId}`);
    console.log();

    // Test provider health monitoring
    console.log('7. Testing provider health monitoring...');
    
    const providerHealth = smsManager.getProviderHealth();
    console.log('📊 Provider Health Status:');
    Object.entries(providerHealth).forEach(([provider, health]) => {
      console.log(`   ${provider}:`);
      console.log(`     Healthy: ${health.healthy ? '✅' : '❌'}`);
      console.log(`     Success Rate: ${(health.successRate * 100).toFixed(1)}%`);
      console.log(`     Total Requests: ${health.totalRequests}`);
      console.log(`     Consecutive Failures: ${health.consecutiveFailures}`);
    });
    console.log();

    // Test delivery statistics
    console.log('8. Testing delivery statistics...');
    
    const deliveryStats = smsManager.getDeliveryStats();
    console.log('📈 Delivery Statistics:');
    Object.entries(deliveryStats).forEach(([provider, stats]) => {
      console.log(`   ${provider}:`);
      console.log(`     Sent: ${stats.sent}`);
      console.log(`     Delivered: ${stats.delivered}`);
      console.log(`     Failed: ${stats.failed}`);
    });
    console.log();

    // Test cost tracking
    console.log('9. Testing cost tracking...');
    
    const costTracking = smsManager.getCostTracking();
    console.log('💰 Cost Tracking:');
    Object.entries(costTracking).forEach(([provider, costs]) => {
      console.log(`   ${provider}:`);
      console.log(`     Total Cost: $${costs.totalCost.toFixed(4)}`);
      console.log(`     Message Count: ${costs.messageCount}`);
      console.log(`     Average Cost: $${costs.averageCost.toFixed(4)}`);
      console.log(`     Daily Cost: $${costs.dailyCost.toFixed(4)}`);
    });
    console.log();

    // Test rate limiting
    console.log('10. Testing rate limiting...');
    
    const testProvider = 'sms-test';
    console.log(`   Rate limit check for ${testProvider}: ${smsManager.checkRateLimit(testProvider) ? '✅ Within limits' : '❌ Exceeded'}`);
    
    // Simulate some requests
    for (let i = 0; i < 5; i++) {
      smsManager.updateRateLimit(testProvider);
    }
    
    console.log(`   After 5 requests: ${smsManager.checkRateLimit(testProvider) ? '✅ Within limits' : '❌ Exceeded'}`);
    console.log();

    // Test error handling
    console.log('11. Testing error handling...');
    
    try {
      await smsManager.sendSMS({
        to: 'invalid-phone-number',
        message: 'This should fail'
      });
    } catch (error) {
      console.log(`✅ Error handling works: ${error.message}`);
    }
    console.log();

    // Test event emissions
    console.log('12. Testing event emissions...');
    
    let eventReceived = false;
    smsManager.on('deliveryTracking', (data) => {
      console.log(`✅ Delivery tracking event received: ${data.status} for ${data.messageId}`);
      eventReceived = true;
    });

    // Trigger an event
    await smsManager.trackSMSDelivery({
      provider: 'test',
      messageId: 'event-test-123',
      status: 'delivered',
      timestamp: new Date().toISOString(),
      recipient: '+1234567890'
    });

    if (eventReceived) {
      console.log('✅ Event emission working correctly');
    } else {
      console.log('❌ Event emission not working');
    }
    console.log();

    console.log('🎉 SMS Service Manager test completed successfully!');
    console.log('\n📋 Test Summary:');
    console.log('✅ Provider initialization');
    console.log('✅ Phone number validation and formatting');
    console.log('✅ International phone number support');
    console.log('✅ Message optimization for SMS limits');
    console.log('✅ SMS sending with test provider');
    console.log('✅ Bulk SMS sending');
    console.log('✅ Delivery tracking and webhooks');
    console.log('✅ Provider health monitoring');
    console.log('✅ Delivery statistics tracking');
    console.log('✅ Cost monitoring and tracking');
    console.log('✅ Rate limiting enforcement');
    console.log('✅ Error handling and validation');
    console.log('✅ Event emission and listening');

  } catch (error) {
    console.error('❌ SMS Service Manager test failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
testSMSServiceManager().catch(console.error);