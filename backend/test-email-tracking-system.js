#!/usr/bin/env node

/**
 * Email Tracking System Test Script
 * Tests the complete email tracking and analytics functionality
 */

import { connectDatabase } from './src/config/database.js';
import EmailTrackingService from './src/services/notifications/EmailTrackingService.js';
import EmailServiceManager from './src/services/notifications/EmailServiceManager.js';
import Notification from './src/models/Notification.js';
import NotificationAnalytics from './src/models/NotificationAnalytics.js';
import User from './src/models/User.js';

class EmailTrackingSystemTest {
  constructor() {
    this.emailTrackingService = new EmailTrackingService({
      trackingPixelDomain: 'localhost:5000',
      unsubscribeBaseUrl: 'http://localhost:5000/api/notifications'
    });
    
    this.emailServiceManager = new EmailServiceManager({
      tracking: {
        trackingPixelDomain: 'localhost:5000',
        unsubscribeBaseUrl: 'http://localhost:5000/api/notifications'
      }
    });
    
    this.testResults = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  /**
   * Run a test and record results
   */
  async runTest(testName, testFunction) {
    try {
      console.log(`\n🧪 Running test: ${testName}`);
      await testFunction();
      console.log(`✅ ${testName} - PASSED`);
      this.testResults.passed++;
      this.testResults.tests.push({ name: testName, status: 'PASSED' });
    } catch (error) {
      console.error(`❌ ${testName} - FAILED:`, error.message);
      this.testResults.failed++;
      this.testResults.tests.push({ name: testName, status: 'FAILED', error: error.message });
    }
  }

  /**
   * Test tracking URL generation
   */
  async testTrackingUrlGeneration() {
    const messageId = 'test-message-' + Date.now();
    const userId = 'test-user-123';
    const notificationId = 'test-notification-456';

    // Test tracking pixel URL generation
    const pixelUrl = this.emailTrackingService.generateTrackingPixelUrl(messageId, userId, notificationId);
    
    if (!pixelUrl.includes('/track/open/') || !pixelUrl.endsWith('.png')) {
      throw new Error('Invalid tracking pixel URL format');
    }

    // Test trackable link generation
    const originalUrl = 'https://example.com/action';
    const trackableUrl = this.emailTrackingService.generateTrackableLink(originalUrl, messageId, userId, notificationId);
    
    if (!trackableUrl.includes('/track/click/')) {
      throw new Error('Invalid trackable link URL format');
    }

    // Test unsubscribe link generation
    const unsubscribeUrl = this.emailTrackingService.generateUnsubscribeLink(userId, 'test_notifications');
    
    if (!unsubscribeUrl.includes('/unsubscribe/')) {
      throw new Error('Invalid unsubscribe URL format');
    }

    console.log(`   📧 Tracking pixel URL: ${pixelUrl}`);
    console.log(`   🔗 Trackable link URL: ${trackableUrl}`);
    console.log(`   🚫 Unsubscribe URL: ${unsubscribeUrl}`);
  }

  /**
   * Test email open tracking
   */
  async testEmailOpenTracking() {
    const messageId = 'test-open-' + Date.now();
    const userId = 'test-user-open';
    const notificationId = 'test-notification-open';

    // Generate tracking pixel
    const pixelUrl = this.emailTrackingService.generateTrackingPixelUrl(messageId, userId, notificationId);
    const trackingId = pixelUrl.match(/\/track\/open\/([^.]+)\.png$/)[1];

    // Mock the notification update methods
    this.emailTrackingService.updateNotificationDeliveryStatus = async () => true;
    this.emailTrackingService.updateAnalytics = async () => true;

    // Track email open
    const result = await this.emailTrackingService.trackEmailOpen(trackingId);
    
    if (!result.success || result.event !== 'opened') {
      throw new Error('Email open tracking failed');
    }

    // Verify tracking data was updated
    const trackingData = this.emailTrackingService.trackingData.get(trackingId);
    if (!trackingData.opened || !trackingData.openedAt) {
      throw new Error('Tracking data not properly updated');
    }

    console.log(`   📊 Email open tracked successfully at ${trackingData.openedAt}`);
  }

  /**
   * Test email click tracking
   */
  async testEmailClickTracking() {
    const messageId = 'test-click-' + Date.now();
    const userId = 'test-user-click';
    const notificationId = 'test-notification-click';
    const originalUrl = 'https://example.com/test-action';

    // Generate trackable link
    const trackableUrl = this.emailTrackingService.generateTrackableLink(originalUrl, messageId, userId, notificationId);
    const clickId = trackableUrl.match(/\/track\/click\/(.+)$/)[1];

    // Mock the notification update methods
    this.emailTrackingService.updateNotificationDeliveryStatus = async () => true;
    this.emailTrackingService.updateAnalytics = async () => true;

    // Track email click
    const result = await this.emailTrackingService.trackEmailClick(clickId);
    
    if (!result.success || result.event !== 'clicked' || result.redirectUrl !== originalUrl) {
      throw new Error('Email click tracking failed');
    }

    // Verify click data was updated
    const clickData = this.emailTrackingService.clickTracking.get(clickId);
    if (!clickData.clicked || !clickData.clickedAt) {
      throw new Error('Click tracking data not properly updated');
    }

    console.log(`   🔗 Email click tracked successfully at ${clickData.clickedAt}`);
  }

  /**
   * Test webhook parsing
   */
  async testWebhookParsing() {
    // Test SendGrid webhook parsing
    const sendGridWebhook = [{
      event: 'delivered',
      sg_message_id: 'test-sg-message',
      email: 'test@example.com',
      timestamp: Math.floor(Date.now() / 1000),
      customArgs: { userId: 'user123' }
    }];

    const sgEvents = this.emailTrackingService.parseSendGridWebhook(sendGridWebhook);
    if (sgEvents.length !== 1 || sgEvents[0].event !== 'delivered') {
      throw new Error('SendGrid webhook parsing failed');
    }

    // Test AWS SES webhook parsing
    const awsWebhook = {
      Message: JSON.stringify({
        eventType: 'bounce',
        mail: {
          messageId: 'test-aws-message',
          destination: ['test@example.com'],
          timestamp: new Date().toISOString()
        },
        bounce: {
          bounceSubType: 'NoEmail'
        }
      })
    };

    const awsEvents = this.emailTrackingService.parseAWSSESWebhook(awsWebhook);
    if (awsEvents.length !== 1 || awsEvents[0].event !== 'bounced') {
      throw new Error('AWS SES webhook parsing failed');
    }

    console.log(`   📨 SendGrid webhook parsed: ${sgEvents[0].event}`);
    console.log(`   📨 AWS SES webhook parsed: ${awsEvents[0].event}`);
  }

  /**
   * Test bounce handling
   */
  async testBounceHandling() {
    const bounceData = {
      messageId: 'test-bounce-message',
      email: 'bounce@example.com',
      bounceType: 'Permanent',
      bounceSubType: 'NoEmail',
      timestamp: new Date(),
      notificationId: 'test-notification-bounce',
      userId: 'test-user-bounce'
    };

    // Mock the required methods
    this.emailTrackingService.updateNotificationDeliveryStatus = async () => true;
    this.emailTrackingService.markEmailAsInvalid = async () => true;
    this.emailTrackingService.updateAnalytics = async () => true;

    const result = await this.emailTrackingService.handleEmailBounce(bounceData);
    
    if (!result.success || result.event !== 'bounced' || !result.permanent) {
      throw new Error('Bounce handling failed');
    }

    console.log(`   📧 Bounce handled: ${bounceData.bounceType} - ${bounceData.bounceSubType}`);
  }

  /**
   * Test unsubscribe handling
   */
  async testUnsubscribeHandling() {
    const userId = 'test-user-unsubscribe';
    const notificationType = 'test_notifications';

    // Generate unsubscribe link
    const unsubscribeUrl = this.emailTrackingService.generateUnsubscribeLink(userId, notificationType);
    const token = unsubscribeUrl.match(/\/unsubscribe\/(.+)$/)[1];

    // Mock the required methods
    this.emailTrackingService.updateUserNotificationPreferences = async () => true;
    this.emailTrackingService.updateAnalytics = async () => true;

    const result = await this.emailTrackingService.handleUnsubscribe(token);
    
    if (!result.success || result.event !== 'unsubscribed' || result.userId !== userId) {
      throw new Error('Unsubscribe handling failed');
    }

    console.log(`   🚫 Unsubscribe handled for user: ${userId}`);
  }

  /**
   * Test email service integration
   */
  async testEmailServiceIntegration() {
    const html = `
      <html>
        <body>
          <h1>Test Email</h1>
          <p>This is a test email with <a href="https://example.com/action">a link</a>.</p>
          <p>Another <a href="https://example.com/another">link here</a>.</p>
        </body>
      </html>
    `;

    const userId = 'test-user-integration';
    const notificationId = 'test-notification-integration';

    // Test adding tracking to HTML
    const enhancedHtml = await this.emailServiceManager.addEmailTracking(html, userId, notificationId, {
      notificationType: 'test_notifications'
    });

    // Verify tracking pixel was added
    if (!enhancedHtml.includes('track/open/') || !enhancedHtml.includes('width="1" height="1"')) {
      throw new Error('Tracking pixel not added to HTML');
    }

    // Verify links were converted to trackable
    if (!enhancedHtml.includes('track/click/')) {
      throw new Error('Links not converted to trackable');
    }

    // Verify unsubscribe link was added
    if (!enhancedHtml.includes('unsubscribe')) {
      throw new Error('Unsubscribe link not added');
    }

    console.log(`   📧 Email tracking integration successful`);
    console.log(`   📊 Enhanced HTML length: ${enhancedHtml.length} characters`);
  }

  /**
   * Test analytics generation
   */
  async testAnalyticsGeneration() {
    // Mock analytics data
    const mockAnalyticsData = [
      {
        date: new Date('2024-01-01'),
        channelMetrics: {
          email: {
            sent: 100,
            delivered: 95,
            opened: 50,
            clicked: 10,
            bounced: 3,
            failed: 2
          }
        },
        roleMetrics: {
          patient: { sent: 80, delivered: 76, engagement: 60 },
          doctor: { sent: 20, delivered: 19, engagement: 80 }
        }
      }
    ];

    // Mock the database query
    const originalFind = NotificationAnalytics.find;
    NotificationAnalytics.find = () => ({
      sort: () => Promise.resolve(mockAnalyticsData)
    });

    try {
      const report = await this.emailTrackingService.generateDeliveryReport({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      });

      if (!report.summary || report.summary.totalSent !== 100) {
        throw new Error('Analytics report generation failed');
      }

      if (report.summary.deliveryRate < 90 || report.summary.deliveryRate > 100) {
        throw new Error('Delivery rate calculation incorrect');
      }

      console.log(`   📊 Analytics report generated successfully`);
      console.log(`   📈 Total sent: ${report.summary.totalSent}`);
      console.log(`   📈 Delivery rate: ${report.summary.deliveryRate.toFixed(2)}%`);
      console.log(`   📈 Open rate: ${report.summary.openRate.toFixed(2)}%`);

    } finally {
      // Restore original method
      NotificationAnalytics.find = originalFind;
    }
  }

  /**
   * Test real-time statistics
   */
  async testRealtimeStatistics() {
    // Add some test data
    this.emailTrackingService.trackingData.set('test1', { messageId: 'msg1' });
    this.emailTrackingService.clickTracking.set('click1', { originalUrl: 'url1' });
    this.emailTrackingService.unsubscribeTokens.set('token1', { userId: 'user1' });

    const stats = this.emailTrackingService.getRealtimeStats();

    if (!stats.tracking || stats.tracking.activeTracking !== 1) {
      throw new Error('Real-time statistics incorrect');
    }

    if (!stats.timestamp || !(stats.timestamp instanceof Date)) {
      throw new Error('Real-time statistics missing timestamp');
    }

    console.log(`   📊 Real-time stats: ${stats.tracking.activeTracking} active tracking`);
    console.log(`   📊 Click tracking: ${stats.tracking.clickTracking} active clicks`);
    console.log(`   📊 Unsubscribe tokens: ${stats.tracking.unsubscribeTokens} active tokens`);
  }

  /**
   * Test event emission
   */
  async testEventEmission() {
    let eventEmitted = false;
    let eventData = null;

    // Listen for email opened event
    this.emailTrackingService.on('emailOpened', (data) => {
      eventEmitted = true;
      eventData = data;
    });

    // Generate and track email open
    const messageId = 'test-event-' + Date.now();
    const userId = 'test-user-event';
    const notificationId = 'test-notification-event';

    const pixelUrl = this.emailTrackingService.generateTrackingPixelUrl(messageId, userId, notificationId);
    const trackingId = pixelUrl.match(/\/track\/open\/([^.]+)\.png$/)[1];

    // Mock the notification update methods
    this.emailTrackingService.updateNotificationDeliveryStatus = async () => true;
    this.emailTrackingService.updateAnalytics = async () => true;

    await this.emailTrackingService.trackEmailOpen(trackingId);

    if (!eventEmitted || !eventData || eventData.messageId !== messageId) {
      throw new Error('Event emission failed');
    }

    console.log(`   📡 Event emitted successfully: emailOpened`);
    console.log(`   📡 Event data: ${JSON.stringify(eventData, null, 2)}`);
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🚀 Starting Email Tracking System Tests\n');
    console.log('=' .repeat(60));

    await this.runTest('Tracking URL Generation', () => this.testTrackingUrlGeneration());
    await this.runTest('Email Open Tracking', () => this.testEmailOpenTracking());
    await this.runTest('Email Click Tracking', () => this.testEmailClickTracking());
    await this.runTest('Webhook Parsing', () => this.testWebhookParsing());
    await this.runTest('Bounce Handling', () => this.testBounceHandling());
    await this.runTest('Unsubscribe Handling', () => this.testUnsubscribeHandling());
    await this.runTest('Email Service Integration', () => this.testEmailServiceIntegration());
    await this.runTest('Analytics Generation', () => this.testAnalyticsGeneration());
    await this.runTest('Real-time Statistics', () => this.testRealtimeStatistics());
    await this.runTest('Event Emission', () => this.testEventEmission());

    // Print summary
    console.log('\n' + '=' .repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('=' .repeat(60));
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    console.log(`📈 Success Rate: ${((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100).toFixed(2)}%`);

    if (this.testResults.failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.testResults.tests
        .filter(test => test.status === 'FAILED')
        .forEach(test => {
          console.log(`   - ${test.name}: ${test.error}`);
        });
    }

    console.log('\n🎉 Email Tracking System Tests Complete!');
    
    return this.testResults.failed === 0;
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new EmailTrackingSystemTest();
  
  try {
    // Connect to database for any database-dependent tests
    await connectDatabase();
    console.log('📊 Connected to database for testing');
    
    const success = await tester.runAllTests();
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

export default EmailTrackingSystemTest;