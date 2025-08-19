import SMSDeliveryService from './src/services/notifications/SMSDeliveryService.js';

/**
 * Test script for SMS Delivery Service
 * Tests message optimization, delivery, tracking, and retry logic
 */

async function testSMSDeliveryService() {
  console.log('🧪 Testing SMS Delivery Service...\n');

  try {
    // Initialize SMS Delivery Service
    const smsDelivery = new SMSDeliveryService({
      maxRetries: 3,
      retryDelays: [1000, 2000, 5000],
      batchSize: 10,
      rateLimitDelay: 500
    });

    console.log('✅ SMS Delivery Service initialized\n');

    // Test 1: Send SMS with template
    console.log('📱 Test 1: Sending SMS with template...');
    try {
      const templateResult = await smsDelivery.sendOptimizedSMS({
        templateId: 'appointment_reminder',
        templateData: {
          doctorName: 'Dr. Smith',
          timeUntil: 'in 1 hour',
          date: 'today',
          time: '2:00 PM',
          prepInstructions: 'Bring your insurance card'
        },
        to: '+1234567890',
        userId: 'user_123',
        notificationId: 'notif_456',
        priority: 'high'
      });

      console.log('✅ Template SMS sent successfully:');
      console.log(`   Delivery ID: ${templateResult.deliveryId}`);
      console.log(`   Message ID: ${templateResult.messageId}`);
      console.log(`   Provider: ${templateResult.provider}`);
      console.log(`   Message Length: ${templateResult.templateResult.length} chars`);
      console.log(`   SMS Count: ${templateResult.templateResult.smsCount}`);
      console.log(`   Cost: $${templateResult.cost}`);
      console.log(`   Delivery Time: ${templateResult.deliveryTime}ms`);
      
      if (templateResult.templateResult.truncated) {
        console.log('   ⚠️ Message was truncated for SMS limits');
      }
      
      if (templateResult.validation.warnings.length > 0) {
        console.log('   ⚠️ Warnings:', templateResult.validation.warnings);
      }
      
    } catch (error) {
      console.error('❌ Template SMS failed:', error.message || error.error);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 2: Send SMS with raw message
    console.log('📱 Test 2: Sending SMS with raw message...');
    try {
      const rawResult = await smsDelivery.sendOptimizedSMS({
        message: 'Your prescription for Amoxicillin 500mg is ready for pickup at CVS Pharmacy on Main Street. Total cost: $15.99. Pharmacy hours: 9 AM - 9 PM.',
        to: '+1987654321',
        userId: 'user_789',
        priority: 'medium',
        metadata: {
          prescriptionId: 'rx_12345',
          pharmacyId: 'pharm_67890'
        }
      });

      console.log('✅ Raw message SMS sent successfully:');
      console.log(`   Delivery ID: ${rawResult.deliveryId}`);
      console.log(`   Message ID: ${rawResult.messageId}`);
      console.log(`   Provider: ${rawResult.provider}`);
      console.log(`   Original Length: ${rawResult.templateResult.originalText.length} chars`);
      console.log(`   Optimized Length: ${rawResult.templateResult.length} chars`);
      console.log(`   SMS Count: ${rawResult.templateResult.smsCount}`);
      console.log(`   Truncated: ${rawResult.templateResult.truncated}`);
      console.log(`   Cost: $${rawResult.cost}`);
      
    } catch (error) {
      console.error('❌ Raw message SMS failed:', error.message || error.error);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 3: Send bulk SMS
    console.log('📱 Test 3: Sending bulk SMS...');
    try {
      const recipients = [
        { to: '+1111111111', name: 'John Doe' },
        { to: '+2222222222', name: 'Jane Smith' },
        { to: '+3333333333', name: 'Bob Johnson' },
        { to: '+4444444444', name: 'Alice Brown' },
        { to: '+5555555555', name: 'Charlie Wilson' }
      ];

      const bulkResult = await smsDelivery.sendBulkOptimizedSMS(recipients, {
        templateId: 'system_maintenance',
        templateData: {
          startTime: '11:00 PM',
          endTime: '2:00 AM',
          date: 'Sunday',
          services: 'prescription ordering'
        },
        priority: 'high',
        metadata: {
          maintenanceId: 'maint_001',
          type: 'scheduled'
        }
      });

      console.log('✅ Bulk SMS completed:');
      console.log(`   Total Recipients: ${bulkResult.totalRecipients}`);
      console.log(`   Successful: ${bulkResult.successCount}`);
      console.log(`   Failed: ${bulkResult.failureCount}`);
      console.log(`   Success Rate: ${bulkResult.successRate.toFixed(1)}%`);
      console.log(`   Total Cost: $${bulkResult.totalCost.toFixed(4)}`);
      console.log(`   Total Time: ${bulkResult.totalTime}ms`);
      console.log(`   Avg Time per Message: ${bulkResult.averageTimePerMessage.toFixed(0)}ms`);

      // Show individual results
      console.log('\n   Individual Results:');
      bulkResult.results.forEach((result, index) => {
        if (result.success) {
          console.log(`   ✅ ${recipients[index].to}: ${result.messageId} (${result.provider})`);
        } else {
          console.log(`   ❌ ${recipients[index].to}: ${result.error}`);
        }
      });
      
    } catch (error) {
      console.error('❌ Bulk SMS failed:', error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 4: Test delivery tracking
    console.log('📱 Test 4: Testing delivery tracking...');
    
    // Get a delivery ID from previous tests
    const deliveryIds = Array.from(smsDelivery.deliveryTracking.keys());
    if (deliveryIds.length > 0) {
      const deliveryId = deliveryIds[0];
      const status = smsDelivery.getDeliveryStatus(deliveryId);
      
      console.log('✅ Delivery status retrieved:');
      console.log(`   Delivery ID: ${status.deliveryId}`);
      console.log(`   Status: ${status.status}`);
      console.log(`   To: ${status.to}`);
      console.log(`   Attempts: ${status.attempts}/${status.maxRetries}`);
      console.log(`   Created: ${status.createdAt}`);
      console.log(`   Message ID: ${status.messageId || 'N/A'}`);
      console.log(`   Provider: ${status.provider || 'N/A'}`);
      console.log(`   Cost: $${status.cost || 0}`);
      
      if (status.lastError) {
        console.log(`   Last Error: ${status.lastError}`);
      }

      // Simulate webhook delivery status update
      if (status.messageId) {
        console.log('\n   Simulating delivery status webhook...');
        
        try {
          const webhookResult = await smsDelivery.trackDeliveryStatus({
            messageId: status.messageId,
            status: 'delivered',
            timestamp: new Date().toISOString(),
            recipient: status.to,
            provider: status.provider || 'test'
          });

          console.log('✅ Webhook processed successfully:');
          console.log(`   Previous Status: ${webhookResult.previousStatus}`);
          console.log(`   New Status: ${webhookResult.newStatus}`);
          console.log(`   Timestamp: ${webhookResult.timestamp}`);
          
        } catch (error) {
          console.error('❌ Webhook processing failed:', error.message);
        }
      }
    } else {
      console.log('⚠️ No deliveries found for tracking test');
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 5: Get delivery statistics
    console.log('📱 Test 5: Getting delivery statistics...');
    
    const stats = smsDelivery.getDeliveryStats();
    console.log('✅ Delivery statistics:');
    console.log(`   Total Sent: ${stats.totalSent}`);
    console.log(`   Total Delivered: ${stats.totalDelivered}`);
    console.log(`   Total Failed: ${stats.totalFailed}`);
    console.log(`   Total Retries: ${stats.totalRetries}`);
    console.log(`   Success Rate: ${stats.successRate.toFixed(1)}%`);
    console.log(`   Failure Rate: ${stats.failureRate.toFixed(1)}%`);
    console.log(`   Retry Rate: ${stats.retryRate.toFixed(1)}%`);
    console.log(`   Active Deliveries: ${stats.activeDeliveries}`);
    console.log(`   Pending Retries: ${stats.pendingRetries}`);
    console.log(`   Average Delivery Time: ${stats.averageDeliveryTime.toFixed(0)}ms`);

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 6: Get health status
    console.log('📱 Test 6: Getting system health status...');
    
    const health = smsDelivery.getHealthStatus();
    console.log('✅ System health status:');
    console.log(`   Overall Status: ${health.status.toUpperCase()}`);
    console.log(`   Active Deliveries: ${health.activeDeliveries}`);
    console.log(`   Pending Retries: ${health.pendingRetries}`);
    
    console.log('\n   Provider Health:');
    Object.entries(health.providerHealth).forEach(([provider, providerHealth]) => {
      console.log(`   ${provider}: ${providerHealth.healthy ? '✅ Healthy' : '❌ Unhealthy'} (${(providerHealth.successRate * 100).toFixed(1)}% success)`);
    });
    
    console.log('\n   Template Engine:');
    console.log(`   Total Templates: ${health.templateStats.totalTemplates}`);
    console.log(`   Cache Size: ${health.templateStats.cacheSize}`);

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 7: Test message optimization edge cases
    console.log('📱 Test 7: Testing message optimization edge cases...');
    
    // Test very long message
    const longMessage = 'This is a very long SMS message that exceeds the standard 160 character limit for SMS messages. '.repeat(5);
    
    try {
      const longResult = await smsDelivery.sendOptimizedSMS({
        message: longMessage,
        to: '+1666666666',
        priority: 'low'
      });

      console.log('✅ Long message handled:');
      console.log(`   Original Length: ${longMessage.length} chars`);
      console.log(`   Optimized Length: ${longResult.templateResult.length} chars`);
      console.log(`   Truncated: ${longResult.templateResult.truncated}`);
      console.log(`   SMS Count: ${longResult.templateResult.smsCount}`);
      
    } catch (error) {
      console.error('❌ Long message test failed:', error.message || error.error);
    }

    // Test message with special characters
    const specialMessage = 'Test message with émojis 🏥💊 and spëcial chàracters';
    
    try {
      const specialResult = await smsDelivery.sendOptimizedSMS({
        message: specialMessage,
        to: '+1777777777',
        priority: 'medium'
      });

      console.log('\n✅ Special characters message handled:');
      console.log(`   Message: "${specialMessage}"`);
      console.log(`   Length: ${specialResult.templateResult.length} chars`);
      console.log(`   SMS Count: ${specialResult.templateResult.smsCount}`);
      
      if (specialResult.validation.warnings.length > 0) {
        console.log(`   Warnings: ${specialResult.validation.warnings.join(', ')}`);
      }
      
    } catch (error) {
      console.error('❌ Special characters test failed:', error.message || error.error);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 8: Test error handling
    console.log('📱 Test 8: Testing error handling...');
    
    // Test invalid phone number
    try {
      await smsDelivery.sendOptimizedSMS({
        message: 'Test message',
        to: 'invalid-phone-number',
        priority: 'medium'
      });
      console.log('❌ Should have failed with invalid phone number');
    } catch (error) {
      console.log('✅ Invalid phone number correctly rejected:', error.message || error.error);
    }

    // Test empty message
    try {
      await smsDelivery.sendOptimizedSMS({
        message: '',
        to: '+1888888888',
        priority: 'medium'
      });
      console.log('❌ Should have failed with empty message');
    } catch (error) {
      console.log('✅ Empty message correctly rejected:', error.message || error.error);
    }

    // Test missing recipient
    try {
      await smsDelivery.sendOptimizedSMS({
        message: 'Test message',
        priority: 'medium'
      });
      console.log('❌ Should have failed with missing recipient');
    } catch (error) {
      console.log('✅ Missing recipient correctly rejected:', error.message || error.error);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Final summary
    console.log('📊 Final Summary:');
    const finalStats = smsDelivery.getDeliveryStats();
    const finalHealth = smsDelivery.getHealthStatus();
    
    console.log(`✅ Total SMS sent: ${finalStats.totalSent}`);
    console.log(`✅ Success rate: ${finalStats.successRate.toFixed(1)}%`);
    console.log(`✅ System status: ${finalHealth.status.toUpperCase()}`);
    console.log(`✅ Active deliveries: ${finalHealth.activeDeliveries}`);
    
    // Clean up old deliveries
    const cleaned = smsDelivery.cleanupOldDeliveries(1000); // Clean deliveries older than 1 second for demo
    console.log(`🧹 Cleaned up ${cleaned} old delivery records`);

    console.log('\n🎉 SMS Delivery Service test completed successfully!');

  } catch (error) {
    console.error('❌ SMS Delivery Service test failed:', error);
    process.exit(1);
  }
}

// Run the test
testSMSDeliveryService().catch(console.error);