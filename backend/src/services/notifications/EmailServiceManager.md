# EmailServiceManager Documentation

## Overview

The EmailServiceManager is a comprehensive email service management system that provides multi-provider support, automatic failover, health monitoring, and delivery tracking for the healthcare platform's notification system.

## Features

### ✅ Multi-Provider Support
- **SendGrid**: Primary email provider with advanced features
- **AWS SES**: Backup email provider with cost-effective delivery
- **Nodemailer**: Fallback provider for SMTP/Gmail integration
- **Test Mode**: Automatic test provider for development environments

### ✅ Provider Failover & Health Monitoring
- Automatic provider selection based on health and priority
- Real-time health monitoring with consecutive failure tracking
- Intelligent failover to backup providers
- Provider performance metrics and success rate tracking

### ✅ Rate Limiting & Throttling
- Per-provider rate limiting (per-second and daily limits)
- Automatic rate limit enforcement
- Rate limit tracking and monitoring

### ✅ Email Delivery Features
- Single email sending with full customization
- Bulk email sending with batch processing
- Template-based email support
- Attachment handling for all providers
- Metadata and custom headers support

### ✅ Delivery Tracking & Analytics
- Webhook-based delivery status tracking
- Open rate and click-through tracking
- Bounce and unsubscribe handling
- Comprehensive delivery statistics

### ✅ Event-Driven Architecture
- Real-time event emission for health updates
- Provider switch notifications
- Delivery tracking events
- Unhealthy provider alerts

## Installation & Setup

### Dependencies

The EmailServiceManager requires the following npm packages:

```bash
npm install @sendgrid/mail @aws-sdk/client-ses nodemailer
```

### Environment Variables

Configure the following environment variables for provider support:

```bash
# SendGrid Configuration
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# AWS SES Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_SES_FROM_EMAIL=noreply@yourdomain.com

# SMTP/Gmail Configuration (Fallback)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Or use Gmail directly
GMAIL_USER=your_email@gmail.com
GMAIL_PASS=your_app_password
```

## Usage

### Basic Initialization

```javascript
import EmailServiceManager from './EmailServiceManager.js';

// Initialize with default configuration
const emailManager = new EmailServiceManager();

// Initialize with custom configuration
const emailManager = new EmailServiceManager({
  config: customNotificationConfig.integration.external_services
});
```

### Sending Emails

#### Single Email

```javascript
const emailData = {
  to: 'user@example.com',
  subject: 'Welcome to Healthcare Platform',
  html: '<h1>Welcome!</h1><p>Thank you for joining our platform.</p>',
  text: 'Welcome! Thank you for joining our platform.',
  metadata: {
    userId: '12345',
    notificationType: 'welcome'
  }
};

try {
  const result = await emailManager.sendEmail(emailData);
  console.log(`Email sent via ${result.provider}: ${result.messageId}`);
} catch (error) {
  console.error('Email sending failed:', error.message);
}
```

#### Email with Attachments

```javascript
const emailData = {
  to: 'patient@example.com',
  subject: 'Your Prescription',
  html: '<h1>Prescription Ready</h1><p>Please find your prescription attached.</p>',
  attachments: [{
    filename: 'prescription.pdf',
    content: prescriptionPdfBuffer,
    contentType: 'application/pdf'
  }]
};

const result = await emailManager.sendEmail(emailData);
```

#### Template-Based Email

```javascript
const emailData = {
  to: 'doctor@example.com',
  subject: 'New Patient Appointment',
  templateId: 'appointment-notification',
  templateData: {
    doctorName: 'Dr. Smith',
    patientName: 'John Doe',
    appointmentTime: '2024-01-15 10:00 AM',
    appointmentType: 'Consultation'
  }
};

const result = await emailManager.sendEmail(emailData);
```

#### Bulk Email Sending

```javascript
const recipients = [
  'patient1@example.com',
  'patient2@example.com',
  'patient3@example.com'
];

const emailData = {
  subject: 'System Maintenance Notice',
  html: '<h1>Maintenance Notice</h1><p>Our system will be under maintenance tonight.</p>',
  text: 'Maintenance Notice: Our system will be under maintenance tonight.'
};

const result = await emailManager.sendBulkEmail(recipients, emailData);
console.log(`Bulk email completed: ${result.successCount}/${result.totalRecipients} successful`);
```

### Health Monitoring

#### Check Provider Health

```javascript
const healthStatus = emailManager.getProviderHealth();
console.log('Provider Health Status:', healthStatus);

// Example output:
// {
//   'sendgrid': {
//     healthy: true,
//     successRate: 0.98,
//     totalRequests: 1000,
//     successfulRequests: 980,
//     failedRequests: 20,
//     consecutiveFailures: 0,
//     lastSuccess: '2024-01-15T10:30:00.000Z'
//   },
//   'aws-ses': { ... },
//   'nodemailer': { ... }
// }
```

#### Get Delivery Statistics

```javascript
const deliveryStats = emailManager.getDeliveryStats();
console.log('Delivery Statistics:', deliveryStats);

// Example output:
// {
//   'sendgrid': {
//     sent: 1000,
//     delivered: 980,
//     opened: 650,
//     clicked: 120,
//     bounced: 15,
//     failed: 5,
//     unsubscribed: 2
//   },
//   'aws-ses': { ... }
// }
```

### Event Handling

```javascript
// Listen for provider health updates
emailManager.on('providerHealthUpdate', (data) => {
  console.log(`Provider ${data.provider} health updated:`, data.health);
});

// Listen for provider switches
emailManager.on('providerSwitch', (data) => {
  console.log(`Primary provider switched to: ${data.newPrimary}`);
});

// Listen for unhealthy providers
emailManager.on('providerUnhealthy', (data) => {
  console.error(`Provider ${data.provider} is unhealthy: ${data.error}`);
  // Implement alerting logic here
});

// Listen for delivery tracking events
emailManager.on('deliveryTracking', (data) => {
  console.log(`Email ${data.event}: ${data.messageId} via ${data.provider}`);
});
```

### Webhook Handling

```javascript
// Handle delivery status webhooks
app.post('/webhooks/email-delivery', async (req, res) => {
  try {
    const webhookData = {
      provider: req.body.provider || 'sendgrid',
      messageId: req.body.messageId,
      event: req.body.event, // 'delivered', 'opened', 'clicked', 'bounced'
      timestamp: req.body.timestamp,
      recipient: req.body.recipient
    };

    const result = await emailManager.trackEmailDelivery(webhookData);
    res.json({ success: true, processed: result.processed });
  } catch (error) {
    console.error('Webhook processing failed:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});
```

## Provider Configuration

### SendGrid Setup

1. Create a SendGrid account and get API key
2. Set up domain authentication
3. Configure webhook endpoints for delivery tracking
4. Set environment variables:

```bash
SENDGRID_API_KEY=SG.your_api_key_here
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
```

### AWS SES Setup

1. Set up AWS SES in your preferred region
2. Verify your sending domain
3. Configure IAM permissions for SES access
4. Set environment variables:

```bash
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_SES_FROM_EMAIL=noreply@yourdomain.com
```

### SMTP/Gmail Setup

1. Enable 2-factor authentication on Gmail
2. Generate an app-specific password
3. Set environment variables:

```bash
GMAIL_USER=your_email@gmail.com
GMAIL_PASS=your_app_password
```

## Error Handling

The EmailServiceManager implements comprehensive error handling:

### Provider Failures
- Automatic failover to backup providers
- Retry logic with exponential backoff
- Health status tracking and recovery

### Rate Limiting
- Automatic rate limit enforcement
- Provider switching when limits exceeded
- Rate limit monitoring and alerting

### Configuration Errors
- Graceful degradation to available providers
- Test mode fallback for development
- Clear error messages and logging

## Performance Considerations

### Optimization Features
- Connection pooling for external services
- Batch processing for bulk emails
- Rate limit management
- Provider health caching

### Scalability
- Horizontal scaling support
- Stateless design
- Event-driven architecture
- Efficient memory usage

## Testing

### Unit Tests

Run the comprehensive test suite:

```bash
npm test -- EmailServiceManager.test.js
```

### Integration Testing

Test with real providers:

```bash
# Set up test environment variables
export SENDGRID_API_KEY=test_key
export AWS_ACCESS_KEY_ID=test_key

# Run integration tests
node test-email-service-manager.js
```

## Requirements Compliance

### ✅ Requirement 4.1 - Multiple Provider Support
- Supports SendGrid, AWS SES, and Nodemailer
- Automatic provider selection and prioritization
- Seamless provider switching

### ✅ Requirement 4.3 - Provider Failover
- Intelligent failover mechanism
- Health-based provider selection
- Automatic recovery and retry logic

### ✅ Requirement 10.1 - Health Monitoring
- Real-time health status tracking
- Performance metrics collection
- Automated alerting for issues

### ✅ Requirement 10.3 - Provider Integration
- Full integration with external services
- Webhook support for delivery tracking
- Comprehensive API coverage

## API Reference

### Constructor

```javascript
new EmailServiceManager(options)
```

**Parameters:**
- `options.config` - Custom configuration object

### Methods

#### `sendEmail(emailData)`
Sends a single email with automatic provider selection and failover.

**Parameters:**
- `emailData.to` - Recipient email address(es)
- `emailData.subject` - Email subject
- `emailData.html` - HTML email content
- `emailData.text` - Plain text email content
- `emailData.attachments` - Array of attachment objects
- `emailData.metadata` - Custom metadata object
- `emailData.templateId` - Template ID for template-based emails
- `emailData.templateData` - Data for template rendering

**Returns:** Promise resolving to send result object

#### `sendBulkEmail(recipients, emailData)`
Sends emails to multiple recipients in batches.

**Parameters:**
- `recipients` - Array of recipient email addresses
- `emailData` - Email data object (same as sendEmail)

**Returns:** Promise resolving to bulk send result

#### `trackEmailDelivery(webhookData)`
Processes delivery tracking webhooks from email providers.

**Parameters:**
- `webhookData.provider` - Provider name
- `webhookData.messageId` - Message ID
- `webhookData.event` - Delivery event type
- `webhookData.timestamp` - Event timestamp
- `webhookData.recipient` - Recipient email

**Returns:** Promise resolving to tracking result

#### `getProviderHealth()`
Returns health status for all providers.

**Returns:** Object with provider health data

#### `getDeliveryStats()`
Returns delivery statistics for all providers.

**Returns:** Object with provider delivery statistics

### Events

- `providerHealthUpdate` - Emitted when provider health changes
- `providerSwitch` - Emitted when primary provider switches
- `providerUnhealthy` - Emitted when provider becomes unhealthy
- `deliveryTracking` - Emitted for delivery tracking events

## Troubleshooting

### Common Issues

1. **No providers available**
   - Check environment variables
   - Verify API keys and credentials
   - Ensure at least one provider is configured

2. **High failure rates**
   - Check provider health status
   - Verify domain authentication
   - Review rate limiting settings

3. **Webhook not working**
   - Verify webhook URL configuration
   - Check webhook endpoint implementation
   - Review provider webhook settings

### Debug Mode

Enable debug logging:

```javascript
process.env.NODE_ENV = 'development';
const emailManager = new EmailServiceManager();
```

This will provide detailed logging for troubleshooting.

## Contributing

When contributing to the EmailServiceManager:

1. Ensure all tests pass
2. Add tests for new features
3. Update documentation
4. Follow existing code patterns
5. Test with multiple providers

## License

This EmailServiceManager is part of the healthcare platform notification system and follows the project's licensing terms.