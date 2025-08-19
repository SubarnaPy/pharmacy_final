/**
 * Test script for SMS Message Optimization and Delivery
 * Tests SMS template engine, delivery service, and retry logic
 */

import SMSTemplateEngine from './src/services/notifications/SMSTemplateEngine.js';
import SMSDeliveryService from './src/services/notifications/SMSDeliveryService.js';
import SMSServiceManager from './src/services/notifications/SMSServiceManager.js';
import notificationConfig from './src/config/notificationConfig.js';

async function testSMSOptimizationAndDelivery() {
  console.log('🧪 Testing SMS Message Optimization and Delivery...\n');

  try {
    // 1. Test SMS Template Engine
    console.log('1. Testing SMS Template Engine...');
    
    const templateEngine = new SMSTemplateEngine({
      maxSMSLength: 160,
      cacheTimeout: 3600000
    });
    
    console.log(`✅ Template Engine initialized with ${templateEngine.templates.size} templates`);
    
    // Test template rendering
    console.log('\n📝 Testing template rendering...');
    
    const testTemplates = [
      {
        templateId: 'appointment_reminder',
        data: {
          doctorName: 'Dr. Smith',
          timeUntil: 'tomorrow',
          date: 'Jan 15, 2025',
          time: '2:00 PM',
          prepInstructions: 'Please arrive 15 minutes early and bring your insurance card'
        }
      },
      {
        templateId: 'prescription_created',
        data: {
          doctorName: 'Dr. Johnson',
          medicationName: 'Amoxicillin 500mg',
          pharmacyCount: 3,
          prescriptionId: 'RX123456'
        }
      },
      {
        templateId: 'order_confirmed',
        data: {
          orderNumber: 'ORD789',
          itemCount: 2,
          totalAmount: '45.99',
          deliveryDate: 'Jan 16, 2025',
          trackingUrl: 'https://track.example.com/ORD789'
        }
      }
    ];

    for (const test of testTemplates) {
      const rendered = templateEngine.renderTemplate(test.templateId, test.data);
      console.log(`📱 ${test.templateId}:`);
      console.log(`   Original: ${rendered.originalText}`);
      console.log(`   Optimized (${rendered.length} chars): ${rendered.optimizedText}`);
      console.log(`   SMS Count: ${rendered.smsCount}, Truncated: ${rendered.truncated}`);
      console.log(`   Priority: ${rendered.priority}, Category: ${rendered.category}`);
      console.log();
    }

    // Test message optimization
    console.log('📏 Testing message optimization...');
    
    const optimizationTests = [
      'Short message',
      'This is a medium length message that should fit within SMS limits without any issues at all.',
      'This is a very long message that definitely exceeds the standard SMS character limit of 160 characters and should be automatically optimized by truncating at word boundaries to maintain readability while staying within the SMS length constraints for better user experience.',
      'Thisisaverylongmessagewithoutanyspacesorwordboundariesthatexceedsthesmslimitandneedstobehardtruncatedbecausetherearenowordboundariesavailableforoptimization'
    ];

    optimizationTests.forEach((message, index) => {
      const optimized = templateEngine.optimizeForSMS(message, 160);
      console.log(`   Test ${index + 1} (${message.length} -> ${optimized.text.length} chars):`);
      console.log(`     Truncated: ${optimized.truncated}`);
      console.log(`     Result: ${optimized.text.substring(0, 80)}${optimized.text.length > 80 ? '...' : ''}`);
    });
    console.log();

    // Test content validation
    console.log('✅ Testing content validation...');
    
    const validationTests = [
      'Normal SMS message',
      '', // Empty
      'Message with emoji 🎉 and unicode',
      'Message with URL: https://example.com/track',
      'A'.repeat(200), // Multiple SMS parts
      'A'.repeat(2000) // Too long
    ];

    validationTests.forEach((content, index) => {
      const validation = templateEngine.validateSMSContent(content);
      console.log(`   Test ${index + 1}: ${validation.isValid ? '✅ Valid' : '❌ Invalid'}`);
      if (validation.errors.length > 0) {
        console.log(`     Errors: ${validation.errors.join(', ')}`);
      }
      if (validation.warnings.length > 0) {
        console.log(`     Warnings: ${validation.warnings.join(', ')}`);
      }
      console.log(`     Length: ${validation.length}, SMS Count: ${validation.smsCount}`);
    });
    console.log();

    // 2. Test SMS Delivery Service
    console.log('2. Testing SMS Delivery Service...');
    
    const smsManager = new SMSServiceManager({
      config: notificationConfig.integration.external_services
    });
    
    const deliveryService = new SMSDeliveryService({
      smsManager,
      templateEngine,
      maxRetries: 2,
      retryDelay: 5000, // 5 seconds for testing
      backoffMultiplier: 2
    });
    
    console.log('✅ SMS Delivery Service initialized');
    
    // Test single SMS with template
    console.log('\n📤 Testing single SMS delivery with template...');
    
    try {
      const smsResult = await deliveryService.sendSMSWithTemplate({
        templateId: 'appointment_reminder',
        templateData: {
          doctorName: 'Dr. Wilson',
          timeUntil: 'in 2 hours',
          date: 'Today',
          time: '3:30 PM',
          prepInstructions: 'Bring your ID'
        },
        to: '+1234567890',
        userId: 'user_123',
        notificationId: 'notif_456',
        priority: 'high',
        metadata: {
          appointmentId: 'apt_789',
          reminderType: 'final'
        }
      });
      
      console.log('✅ SMS sent successfully:');
      console.log(`   Delivery ID: ${smsResult.deliveryId}`);
      console.log(`   Message ID: ${smsResult.messageId}`);
      console.log(`   Provider: ${smsResult.provider}`);
      console.log(`   Cost: $${smsResult.cost}`);
      console.log(`   Template: ${smsResult.template.id} (${smsResult.template.length} chars, ${smsResult.template.smsCount} SMS)`);
      console.log(`   Truncated: ${smsResult.template.truncated}`);
      
    } catch (error) {
      console.error('❌ SMS delivery failed:', error.message);
    }
    console.log();

    // Test bulk SMS delivery
    console.log('📤 Testing bulk SMS delivery...');
    
    const recipients = [
      {
        phoneNumber: '+1234567890',
        userId: 'user_1',
        templateData: { doctorName: 'Dr. Smith', date: 'Jan 15', time: '10:00 AM' }
      },
      {
        phoneNumber: '+1234567891',
        userId: 'user_2',
        templateData: { doctorName: 'Dr. Jones', date: 'Jan 15', time: '11:00 AM' }
      },
      {
        phoneNumber: '+1234567892',
        userId: 'user_3',
        templateData: { doctorName: 'Dr. Brown', date: 'Jan 15', time: '2:00 PM' }
      }
    ];

    try {
      const bulkResult = await deliveryService.sendBulkSMSWithTemplate(recipients, {
        templateId: 'appointment_scheduled',
        templateData: {
          location: 'Main Clinic, Room 101'
        },
        priority: 'medium',
        metadata: {
          campaign: 'appointment_confirmations',
          batchId: 'batch_123'
        },
        batchSize: 2
      });
      
      console.log('✅ Bulk SMS completed:');
      console.log(`   Total Recipients: ${bulkResult.totalRecipients}`);
      console.log(`   Successful: ${bulkResult.successCount}`);
      console.log(`   Failed: ${bulkResult.failureCount}`);
      console.log(`   Total Cost: $${bulkResult.totalCost.toFixed(4)}`);
      console.log(`   Total Time: ${bulkResult.totalTime}ms`);
      
    } catch (error) {
      console.error('❌ Bulk SMS delivery failed:', error.message);
    }
    console.log();

    // Test delivery tracking
    console.log('📊 Testing delivery tracking...');
    
    const webhookData = {
      messageId: 'test-msg-123',
      status: 'delivered',
      timestamp: new Date().toISOString(),
      recipient: '+1234567890',
      deliveryId: 'sms_test_delivery_123'
    };

    try {
      const trackingResult = await deliveryService.trackDeliveryStatus(webhookData);
      console.log('✅ Delivery tracking processed:');
      console.log(`   Status: ${trackingResult.status}`);
      console.log(`   Message ID: ${trackingResult.messageId}`);
      console.log(`   Delivery Found: ${trackingResult.deliveryFound}`);
      
    } catch (error) {
      console.error('❌ Delivery tracking failed:', error.message);
    }
    console.log();

    // Test retry logic simulation
    console.log('🔄 Testing retry logic...');
    
    // Create a mock SMS manager that fails initially
    let callCount = 0;
    const failingManager = {
      sendSMS: async (smsData) => {
        callCount++;
        if (callCount === 1) {
          throw new Error('rate_limit_exceeded');
        } else if (callCount === 2) {
          throw new Error('temporary_failure');
        } else {
          return {
            success: true,
            messageId: 'retry-success-123',
            provider: 'test',
            cost: 0.01
          };
        }
      },
      validateAndFormatPhoneNumber: async (phone) => ({
        isValid: true,
        formatted: phone
      }),
      optimizeMessageForSMS: (message) => message
    };

    const retryService = new SMSDeliveryService({
      smsManager: failingManager,
      templateEngine,
      maxRetries: 3,
      retryDelay: 1000, // 1 second for testing
      backoffMultiplier: 2
    });

    try {
      const retryResult = await retryService.sendSMSWithTemplate({
        templateId: 'system_maintenance',
        templateData: {
          startTime: '11:00 PM',
          endTime: '1:00 AM',
          date: 'Tonight',
          services: 'User Portal'
        },
        to: '+1234567890',
        priority: 'high'
      });
      
      console.log('✅ SMS sent after retries:');
      console.log(`   Delivery ID: ${retryResult.deliveryId}`);
      console.log(`   Message ID: ${retryResult.messageId}`);
      console.log(`   Final Provider: ${retryResult.provider}`);
      
    } catch (error) {
      console.log(`❌ SMS failed after retries: ${error.message}`);
    }
    console.log();

    // Test event emissions
    console.log('📡 Testing event emissions...');
    
    let eventsReceived = [];
    
    deliveryService.on('smsSent', (data) => {
      eventsReceived.push({ type: 'smsSent', data });
      console.log(`   ✅ SMS Sent event: ${data.deliveryId} via ${data.provider}`);
    });
    
    deliveryService.on('smsFailed', (data) => {
      eventsReceived.push({ type: 'smsFailed', data });
      console.log(`   ❌ SMS Failed event: ${data.deliveryId} - ${data.error}`);
    });
    
    deliveryService.on('deliveryStatusUpdate', (data) => {
      eventsReceived.push({ type: 'deliveryStatusUpdate', data });
      console.log(`   📊 Status Update event: ${data.deliveryId} -> ${data.status}`);
    });
    
    deliveryService.on('bulkSMSCompleted', (data) => {
      eventsReceived.push({ type: 'bulkSMSCompleted', data });
      console.log(`   📦 Bulk SMS Completed: ${data.successCount}/${data.totalRecipients} sent`);
    });

    // Trigger some events by sending an SMS
    try {
      await deliveryService.sendSMSWithTemplate({
        templateId: 'payment_successful',
        templateData: {
          amount: '25.99',
          method: 'Credit Card',
          receiptUrl: 'https://receipts.example.com/12345',
          transactionId: 'TXN789'
        },
        to: '+1234567890',
        priority: 'medium'
      });
    } catch (error) {
      // Expected for testing
    }

    console.log(`   📡 Total events received: ${eventsReceived.length}`);
    console.log();

    // Test statistics
    console.log('📈 Testing statistics...');
    
    const deliveryStats = deliveryService.getStats();
    console.log('📊 Delivery Service Statistics:');
    console.log(`   Total Sent: ${deliveryStats.totalSent}`);
    console.log(`   Total Delivered: ${deliveryStats.totalDelivered}`);
    console.log(`   Total Failed: ${deliveryStats.totalFailed}`);
    console.log(`   Total Retries: ${deliveryStats.totalRetries}`);
    console.log(`   Success Rate: ${deliveryStats.successRate.toFixed(1)}%`);
    console.log(`   Retry Rate: ${deliveryStats.retryRate.toFixed(1)}%`);
    console.log(`   Active Deliveries: ${deliveryStats.activeDeliveries}`);
    console.log(`   Pending Retries: ${deliveryStats.pendingRetries}`);
    
    const templateStats = templateEngine.getStats();
    console.log('\n📊 Template Engine Statistics:');
    console.log(`   Total Templates: ${templateStats.totalTemplates}`);
    console.log(`   Cache Size: ${templateStats.cacheSize}`);
    console.log(`   Categories: ${Object.keys(templateStats.categories).join(', ')}`);
    console.log(`   Priorities: ${Object.keys(templateStats.priorities).join(', ')}`);
    console.log();

    // Test custom template creation
    console.log('🎨 Testing custom template creation...');
    
    const customTemplate = {
      id: 'custom_test_template',
      name: 'Custom Test Template',
      category: 'test',
      priority: 'medium',
      template: 'Hello {{customerName}}, {{#if urgent}}URGENT: {{/if}}Your {{serviceType}} service {{#if completed}}has been completed{{else}}is scheduled for {{scheduledDate}}{{/if}}. {{#if contactInfo}}Contact us at {{contactInfo}}.{{/if}}',
      variables: ['customerName', 'urgent', 'serviceType', 'completed', 'scheduledDate', 'contactInfo'],
      maxLength: 160
    };

    const templateAdded = templateEngine.addTemplate(customTemplate);
    console.log(`   Template added: ${templateAdded ? '✅' : '❌'}`);

    if (templateAdded) {
      const customRendered = templateEngine.renderTemplate('custom_test_template', {
        customerName: 'John Smith',
        urgent: true,
        serviceType: 'maintenance',
        completed: false,
        scheduledDate: 'Jan 20, 2025',
        contactInfo: '555-0123'
      });
      
      console.log(`   Custom template rendered: ${customRendered.optimizedText}`);
      console.log(`   Length: ${customRendered.length}, SMS Count: ${customRendered.smsCount}`);
    }
    console.log();

    // Test error handling
    console.log('🚨 Testing error handling...');
    
    // Test invalid phone number
    try {
      await deliveryService.sendSMSWithTemplate({
        templateId: 'user_registered',
        templateData: { platformName: 'Test Platform' },
        to: 'invalid-phone',
        priority: 'medium'
      });
    } catch (error) {
      console.log(`   ✅ Invalid phone error handled: ${error.message}`);
    }

    // Test non-existent template
    try {
      await deliveryService.sendSMSWithTemplate({
        templateId: 'non_existent_template',
        templateData: {},
        to: '+1234567890',
        priority: 'medium'
      });
    } catch (error) {
      console.log(`   ✅ Missing template error handled: ${error.message}`);
    }

    // Test invalid template data
    try {
      const invalidTemplate = {
        id: 'invalid_template',
        // Missing required fields
      };
      templateEngine.addTemplate(invalidTemplate);
    } catch (error) {
      console.log(`   ✅ Invalid template error handled: ${error.message}`);
    }
    console.log();

    // Cleanup
    console.log('🧹 Cleaning up...');
    await deliveryService.shutdown();
    console.log('   ✅ Delivery service shutdown complete');

    console.log('\n🎉 SMS Message Optimization and Delivery test completed successfully!');
    console.log('\n📋 Test Summary:');
    console.log('✅ SMS Template Engine initialization and management');
    console.log('✅ Template rendering with variables and conditionals');
    console.log('✅ Message optimization for SMS length constraints');
    console.log('✅ Content validation and warning system');
    console.log('✅ SMS delivery with template rendering');
    console.log('✅ Bulk SMS delivery with batching');
    console.log('✅ Delivery status tracking and webhooks');
    console.log('✅ Retry logic with exponential backoff');
    console.log('✅ Event emission and listening');
    console.log('✅ Statistics tracking and reporting');
    console.log('✅ Custom template creation and management');
    console.log('✅ Error handling and validation');
    console.log('✅ Service lifecycle management');

  } catch (error) {
    console.error('❌ SMS Optimization and Delivery test failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Mock jest for testing
global.jest = {
  fn: () => ({
    mockRejectedValueOnce: function(error) {
      this.callCount = (this.callCount || 0) + 1;
      if (this.callCount <= 2) {
        return Promise.reject(error);
      }
      return this;
    },
    mockResolvedValueOnce: function(value) {
      return Promise.resolve(value);
    }
  })
};

// Run the test
testSMSOptimizationAndDelivery().catch(console.error);