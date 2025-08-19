import EventEmitter from 'events';
import nodemailer from 'nodemailer';
import notificationConfig from '../../config/notificationConfig.js';
import EmailTrackingService from './EmailTrackingService.js';

/**
 * Email Service Manager
 * Manages multiple email providers with failover and health monitoring
 */
class EmailServiceManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = options.config || notificationConfig.integration.external_services;
    this.providers = new Map();
    this.currentProvider = null;
    this.backupProvider = null;
    
    // Provider health tracking
    this.providerHealth = new Map();
    
    // Delivery statistics
    this.deliveryStats = new Map();
    
    // Rate limiting tracking
    this.rateLimits = new Map();
    
    // Initialize email tracking service
    this.trackingService = new EmailTrackingService(options.tracking);
    
    // Initialize providers
    this.initializeProviders();
    
    console.log('✅ Email Service Manager initialized');
  }

  /**
   * Initialize email providers
   */
  async initializeProviders() {
    try {
      // Initialize SendGrid provider
      if (this.config.sendgrid?.enabled) {
        await this.initializeSendGridProvider();
      }
      
      // Initialize AWS SES provider
      if (this.config.aws?.enabled) {
        await this.initializeAWSSESProvider();
      }
      
      // Initialize Nodemailer provider (fallback)
      await this.initializeNodemailerProvider();
      
      // Set primary and backup providers
      this.selectProviders();
      
      console.log(`📧 Email providers initialized: ${Array.from(this.providers.keys()).join(', ')}`);
      
    } catch (error) {
      console.error('❌ Failed to initialize email providers:', error);
      throw error;
    }
  }

  /**
   * Initialize SendGrid provider
   */
  async initializeSendGridProvider() {
    try {
      const sgMail = await import('@sendgrid/mail');
      sgMail.default.setApiKey(this.config.sendgrid.apiKey);
      
      const provider = {
        name: 'sendgrid',
        service: sgMail.default,
        type: 'sendgrid',
        priority: 1,
        rateLimit: {
          maxPerSecond: 100,
          maxPerDay: 100000
        },
        features: ['templates', 'tracking', 'webhooks', 'attachments']
      };
      
      this.providers.set('sendgrid', provider);
      this.initializeProviderHealth('sendgrid');
      this.initializeProviderStats('sendgrid');
      
      console.log('✅ SendGrid provider initialized');
      
    } catch (error) {
      console.warn('⚠️ SendGrid provider initialization failed:', error.message);
    }
  }

  /**
   * Initialize AWS SES provider
   */
  async initializeAWSSESProvider() {
    try {
      const { SESClient, SendEmailCommand, SendRawEmailCommand } = await import('@aws-sdk/client-ses');
      
      const sesClient = new SESClient({
        region: this.config.aws.region || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
      });
      
      const provider = {
        name: 'aws-ses',
        service: sesClient,
        type: 'aws-ses',
        priority: 2,
        rateLimit: {
          maxPerSecond: 14, // AWS SES default
          maxPerDay: 200
        },
        features: ['templates', 'tracking', 'webhooks', 'attachments'],
        commands: { SendEmailCommand, SendRawEmailCommand }
      };
      
      this.providers.set('aws-ses', provider);
      this.initializeProviderHealth('aws-ses');
      this.initializeProviderStats('aws-ses');
      
      console.log('✅ AWS SES provider initialized');
      
    } catch (error) {
      console.warn('⚠️ AWS SES provider initialization failed:', error.message);
    }
  }

  /**
   * Initialize Nodemailer provider (fallback)
   */
  async initializeNodemailerProvider() {
    try {
      // Check if any email configuration is available
      const hasEmailConfig = process.env.SMTP_HOST || process.env.GMAIL_USER;
      
      if (!hasEmailConfig) {
        // Create a test-only provider for development/testing
        console.log('⚠️ No email configuration found, creating test-only provider');
        
        const provider = {
          name: 'nodemailer-test',
          service: {
            sendMail: async (options) => {
              console.log('📧 Test email would be sent:', {
                to: options.to,
                subject: options.subject,
                from: options.from
              });
              return {
                messageId: 'test-' + Date.now() + '@test.local',
                response: 'Test email simulated'
              };
            }
          },
          type: 'nodemailer',
          priority: 3,
          rateLimit: {
            maxPerSecond: 10,
            maxPerDay: 1000
          },
          features: ['attachments'],
          testMode: true
        };
        
        this.providers.set('nodemailer-test', provider);
        this.initializeProviderHealth('nodemailer-test');
        this.initializeProviderStats('nodemailer-test');
        
        console.log('✅ Test Nodemailer provider initialized');
        return;
      }
      
      // Use SMTP configuration or Gmail for development
      const transportConfig = process.env.SMTP_HOST ? {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      } : {
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_PASS
        }
      };
      
      const transporter = nodemailer.createTransport(transportConfig);
      
      // Skip verification in test mode
      if (process.env.NODE_ENV !== 'test') {
        await transporter.verify();
      }
      
      const provider = {
        name: 'nodemailer',
        service: transporter,
        type: 'nodemailer',
        priority: 3,
        rateLimit: {
          maxPerSecond: 1,
          maxPerDay: 500
        },
        features: ['attachments']
      };
      
      this.providers.set('nodemailer', provider);
      this.initializeProviderHealth('nodemailer');
      this.initializeProviderStats('nodemailer');
      
      console.log('✅ Nodemailer provider initialized');
      
    } catch (error) {
      console.warn('⚠️ Nodemailer provider initialization failed:', error.message);
      
      // Create a fallback test provider even if real provider fails
      const testProvider = {
        name: 'nodemailer-fallback',
        service: {
          sendMail: async (options) => {
            console.log('📧 Fallback test email:', {
              to: options.to,
              subject: options.subject
            });
            return {
              messageId: 'fallback-' + Date.now() + '@test.local',
              response: 'Fallback email simulated'
            };
          }
        },
        type: 'nodemailer',
        priority: 4,
        rateLimit: {
          maxPerSecond: 10,
          maxPerDay: 1000
        },
        features: ['attachments'],
        testMode: true
      };
      
      this.providers.set('nodemailer-fallback', testProvider);
      this.initializeProviderHealth('nodemailer-fallback');
      this.initializeProviderStats('nodemailer-fallback');
      
      console.log('✅ Fallback test provider initialized');
    }
  }

  /**
   * Select primary and backup providers
   */
  selectProviders() {
    const availableProviders = Array.from(this.providers.values())
      .filter(provider => this.isProviderHealthy(provider.name))
      .sort((a, b) => a.priority - b.priority);
    
    if (availableProviders.length > 0) {
      this.currentProvider = availableProviders[0];
      console.log(`📧 Primary email provider: ${this.currentProvider.name}`);
    }
    
    if (availableProviders.length > 1) {
      this.backupProvider = availableProviders[1];
      console.log(`📧 Backup email provider: ${this.backupProvider.name}`);
    }
    
    if (!this.currentProvider) {
      throw new Error('No healthy email providers available');
    }
  }

  /**
   * Send email with automatic provider selection and failover
   * @param {Object} emailData - Email data
   * @returns {Object} Send result
   */
  async sendEmail(emailData) {
    const {
      to,
      subject,
      html,
      text,
      attachments = [],
      metadata = {},
      templateId = null,
      templateData = {},
      userId = null,
      notificationId = null,
      enableTracking = true
    } = emailData;

    let lastError = null;
    
    // Try primary provider
    if (this.currentProvider) {
      try {
        const result = await this.sendWithProvider(this.currentProvider, {
          to, subject, html, text, attachments, metadata, templateId, templateData,
          userId, notificationId, enableTracking
        });
        
        this.updateProviderHealth(this.currentProvider.name, true);
        this.updateDeliveryStats(this.currentProvider.name, 'success');
        
        return {
          success: true,
          provider: this.currentProvider.name,
          messageId: result.messageId,
          result
        };
        
      } catch (error) {
        console.warn(`⚠️ Primary provider ${this.currentProvider.name} failed:`, error.message);
        lastError = error;
        this.updateProviderHealth(this.currentProvider.name, false, error);
        this.updateDeliveryStats(this.currentProvider.name, 'failed');
      }
    }
    
    // Try backup provider
    if (this.backupProvider) {
      try {
        const result = await this.sendWithProvider(this.backupProvider, {
          to, subject, html, text, attachments, metadata, templateId, templateData
        });
        
        this.updateProviderHealth(this.backupProvider.name, true);
        this.updateDeliveryStats(this.backupProvider.name, 'success');
        
        // Consider switching primary provider if backup is more reliable
        this.considerProviderSwitch();
        
        return {
          success: true,
          provider: this.backupProvider.name,
          messageId: result.messageId,
          result,
          fallbackUsed: true
        };
        
      } catch (error) {
        console.error(`❌ Backup provider ${this.backupProvider.name} also failed:`, error.message);
        this.updateProviderHealth(this.backupProvider.name, false, error);
        this.updateDeliveryStats(this.backupProvider.name, 'failed');
      }
    }
    
    // All providers failed
    throw new Error(`All email providers failed. Last error: ${lastError?.message}`);
  }

  /**
   * Send email with specific provider
   * @param {Object} provider - Email provider
   * @param {Object} emailData - Email data
   * @returns {Object} Send result
   */
  async sendWithProvider(provider, emailData) {
    const { 
      to, subject, html, text, attachments, metadata, templateId, templateData,
      userId, notificationId, enableTracking = true
    } = emailData;
    
    // Check rate limits
    if (!this.checkRateLimit(provider.name)) {
      throw new Error(`Rate limit exceeded for provider ${provider.name}`);
    }
    
    this.updateRateLimit(provider.name);
    
    // Add tracking to HTML content if enabled
    let enhancedHtml = html;
    let enhancedMetadata = { ...metadata };
    
    if (enableTracking && userId && notificationId && html) {
      enhancedHtml = await this.addEmailTracking(html, userId, notificationId, metadata);
      enhancedMetadata.userId = userId;
      enhancedMetadata.notificationId = notificationId;
    }
    
    switch (provider.type) {
      case 'sendgrid':
        return await this.sendWithSendGrid(provider, { 
          to, subject, html: enhancedHtml, text, attachments, 
          metadata: enhancedMetadata, templateId, templateData 
        });
      
      case 'aws-ses':
        return await this.sendWithAWSSES(provider, { 
          to, subject, html: enhancedHtml, text, attachments, 
          metadata: enhancedMetadata 
        });
      
      case 'nodemailer':
        return await this.sendWithNodemailer(provider, { 
          to, subject, html: enhancedHtml, text, attachments, 
          metadata: enhancedMetadata 
        });
      
      default:
        throw new Error(`Unknown provider type: ${provider.type}`);
    }
  }

  /**
   * Send email with SendGrid
   * @param {Object} provider - SendGrid provider
   * @param {Object} emailData - Email data
   * @returns {Object} Send result
   */
  async sendWithSendGrid(provider, emailData) {
    const { to, subject, html, text, attachments, metadata, templateId, templateData } = emailData;
    
    const msg = {
      to: Array.isArray(to) ? to : [to],
      from: this.config.sendgrid.fromEmail,
      subject,
      html,
      text,
      customArgs: metadata
    };
    
    // Add template if specified
    if (templateId && templateData) {
      msg.templateId = templateId;
      msg.dynamicTemplateData = templateData;
      delete msg.html;
      delete msg.text;
    }
    
    // Add attachments
    if (attachments && attachments.length > 0) {
      msg.attachments = attachments.map(attachment => ({
        content: attachment.content,
        filename: attachment.filename,
        type: attachment.contentType,
        disposition: 'attachment'
      }));
    }
    
    const result = await provider.service.send(msg);
    
    return {
      messageId: result[0]?.headers?.['x-message-id'] || 'sendgrid-' + Date.now(),
      provider: 'sendgrid',
      result
    };
  }

  /**
   * Send email with AWS SES
   * @param {Object} provider - AWS SES provider
   * @param {Object} emailData - Email data
   * @returns {Object} Send result
   */
  async sendWithAWSSES(provider, emailData) {
    const { to, subject, html, text, attachments, metadata } = emailData;
    
    const params = {
      Source: this.config.aws.ses.fromEmail,
      Destination: {
        ToAddresses: Array.isArray(to) ? to : [to]
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8'
        },
        Body: {
          Html: html ? {
            Data: html,
            Charset: 'UTF-8'
          } : undefined,
          Text: text ? {
            Data: text,
            Charset: 'UTF-8'
          } : undefined
        }
      }
    };
    
    // Add tags for metadata
    if (metadata && Object.keys(metadata).length > 0) {
      params.Tags = Object.entries(metadata).map(([key, value]) => ({
        Name: key,
        Value: String(value)
      }));
    }
    
    const command = new provider.commands.SendEmailCommand(params);
    const result = await provider.service.send(command);
    
    return {
      messageId: result.MessageId,
      provider: 'aws-ses',
      result
    };
  }

  /**
   * Send email with Nodemailer
   * @param {Object} provider - Nodemailer provider
   * @param {Object} emailData - Email data
   * @returns {Object} Send result
   */
  async sendWithNodemailer(provider, emailData) {
    const { to, subject, html, text, attachments, metadata } = emailData;
    
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.GMAIL_USER,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
      text,
      attachments: attachments?.map(attachment => ({
        filename: attachment.filename,
        content: attachment.content,
        contentType: attachment.contentType
      }))
    };
    
    // Add custom headers for metadata
    if (metadata && Object.keys(metadata).length > 0) {
      mailOptions.headers = {};
      Object.entries(metadata).forEach(([key, value]) => {
        mailOptions.headers[`X-${key}`] = String(value);
      });
    }
    
    const result = await provider.service.sendMail(mailOptions);
    
    return {
      messageId: result.messageId,
      provider: 'nodemailer',
      result
    };
  }

  /**
   * Send bulk emails
   * @param {Array} recipients - Array of recipient email addresses
   * @param {Object} emailData - Email data
   * @returns {Object} Bulk send result
   */
  async sendBulkEmail(recipients, emailData) {
    const { subject, html, text, attachments, metadata, templateId, templateData } = emailData;
    
    const results = [];
    const batchSize = 100; // Process in batches
    
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (recipient) => {
        try {
          const result = await this.sendEmail({
            to: recipient,
            subject,
            html,
            text,
            attachments,
            metadata: { ...metadata, batchIndex: Math.floor(i / batchSize) },
            templateId,
            templateData
          });
          
          return {
            recipient,
            success: true,
            messageId: result.messageId,
            provider: result.provider
          };
          
        } catch (error) {
          return {
            recipient,
            success: false,
            error: error.message
          };
        }
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults.map(r => r.value || { success: false, error: r.reason?.message }));
      
      // Add delay between batches to respect rate limits
      if (i + batchSize < recipients.length) {
        await this.sleep(1000); // 1 second delay
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;
    
    return {
      totalRecipients: recipients.length,
      successCount,
      failureCount,
      results
    };
  }

  /**
   * Track email delivery status (webhook handler)
   * @param {Object} webhookData - Webhook data from email provider
   * @returns {Object} Processing result
   */
  async trackEmailDelivery(webhookData) {
    try {
      const { provider, messageId, event, timestamp, recipient } = webhookData;
      
      // Update delivery statistics
      this.updateDeliveryStats(provider, event);
      
      // Emit tracking event
      this.emit('deliveryTracking', {
        provider,
        messageId,
        event,
        timestamp: new Date(timestamp),
        recipient
      });
      
      console.log(`📊 Email tracking: ${event} for message ${messageId} via ${provider}`);
      
      return {
        success: true,
        processed: true,
        event,
        messageId
      };
      
    } catch (error) {
      console.error('❌ Failed to track email delivery:', error);
      throw error;
    }
  }

  /**
   * Initialize provider health tracking
   * @param {string} providerName - Provider name
   */
  initializeProviderHealth(providerName) {
    this.providerHealth.set(providerName, {
      healthy: true,
      lastSuccess: new Date(),
      lastFailure: null,
      consecutiveFailures: 0,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0
    });
  }

  /**
   * Initialize provider statistics
   * @param {string} providerName - Provider name
   */
  initializeProviderStats(providerName) {
    this.deliveryStats.set(providerName, {
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      failed: 0,
      unsubscribed: 0
    });
  }

  /**
   * Update provider health status
   * @param {string} providerName - Provider name
   * @param {boolean} success - Was operation successful
   * @param {Error} error - Error if failed
   */
  updateProviderHealth(providerName, success, error = null) {
    const health = this.providerHealth.get(providerName);
    if (!health) return;
    
    health.totalRequests++;
    
    if (success) {
      health.successfulRequests++;
      health.lastSuccess = new Date();
      health.consecutiveFailures = 0;
      health.healthy = true;
    } else {
      health.failedRequests++;
      health.lastFailure = new Date();
      health.consecutiveFailures++;
      
      // Mark as unhealthy after 3 consecutive failures
      if (health.consecutiveFailures >= 3) {
        health.healthy = false;
        this.emit('providerUnhealthy', { provider: providerName, error: error?.message });
      }
    }
    
    // Calculate success rate
    health.successRate = health.successfulRequests / health.totalRequests;
    
    this.emit('providerHealthUpdate', { provider: providerName, health: { ...health } });
  }

  /**
   * Update delivery statistics
   * @param {string} providerName - Provider name
   * @param {string} event - Delivery event
   */
  updateDeliveryStats(providerName, event) {
    const stats = this.deliveryStats.get(providerName);
    if (!stats) return;
    
    switch (event) {
      case 'success':
      case 'sent':
        stats.sent++;
        break;
      case 'delivered':
        stats.delivered++;
        break;
      case 'opened':
        stats.opened++;
        break;
      case 'clicked':
        stats.clicked++;
        break;
      case 'bounced':
        stats.bounced++;
        break;
      case 'failed':
        stats.failed++;
        break;
      case 'unsubscribed':
        stats.unsubscribed++;
        break;
    }
  }

  /**
   * Check if provider is healthy
   * @param {string} providerName - Provider name
   * @returns {boolean} Is provider healthy
   */
  isProviderHealthy(providerName) {
    const health = this.providerHealth.get(providerName);
    return health ? health.healthy : false;
  }

  /**
   * Check rate limit for provider
   * @param {string} providerName - Provider name
   * @returns {boolean} Is within rate limit
   */
  checkRateLimit(providerName) {
    const provider = this.providers.get(providerName);
    if (!provider) return false;
    
    const now = Date.now();
    const rateLimit = this.rateLimits.get(providerName) || { requests: [], dailyCount: 0, lastReset: now };
    
    // Reset daily count if it's a new day
    if (now - rateLimit.lastReset > 24 * 60 * 60 * 1000) {
      rateLimit.dailyCount = 0;
      rateLimit.lastReset = now;
    }
    
    // Check daily limit
    if (rateLimit.dailyCount >= provider.rateLimit.maxPerDay) {
      return false;
    }
    
    // Check per-second limit
    const recentRequests = rateLimit.requests.filter(time => now - time < 1000);
    if (recentRequests.length >= provider.rateLimit.maxPerSecond) {
      return false;
    }
    
    return true;
  }

  /**
   * Update rate limit tracking
   * @param {string} providerName - Provider name
   */
  updateRateLimit(providerName) {
    const now = Date.now();
    const rateLimit = this.rateLimits.get(providerName) || { requests: [], dailyCount: 0, lastReset: now };
    
    rateLimit.requests.push(now);
    rateLimit.dailyCount++;
    
    // Clean old requests (keep only last minute)
    rateLimit.requests = rateLimit.requests.filter(time => now - time < 60000);
    
    this.rateLimits.set(providerName, rateLimit);
  }

  /**
   * Consider switching primary provider based on performance
   */
  considerProviderSwitch() {
    if (!this.backupProvider) return;
    
    const primaryHealth = this.providerHealth.get(this.currentProvider.name);
    const backupHealth = this.providerHealth.get(this.backupProvider.name);
    
    if (backupHealth && primaryHealth) {
      // Switch if backup has significantly better success rate
      if (backupHealth.successRate > primaryHealth.successRate + 0.1) {
        console.log(`🔄 Switching primary provider from ${this.currentProvider.name} to ${this.backupProvider.name}`);
        
        const temp = this.currentProvider;
        this.currentProvider = this.backupProvider;
        this.backupProvider = temp;
        
        this.emit('providerSwitch', {
          newPrimary: this.currentProvider.name,
          newBackup: this.backupProvider.name
        });
      }
    }
  }

  /**
   * Get provider health status
   * @returns {Object} Health status for all providers
   */
  getProviderHealth() {
    const health = {};
    
    for (const [name, status] of this.providerHealth.entries()) {
      health[name] = { ...status };
    }
    
    return health;
  }

  /**
   * Get delivery statistics
   * @returns {Object} Delivery stats for all providers
   */
  getDeliveryStats() {
    const stats = {};
    
    for (const [name, providerStats] of this.deliveryStats.entries()) {
      stats[name] = { ...providerStats };
    }
    
    return stats;
  }

  /**
   * Add email tracking to HTML content
   * @param {string} html - Original HTML content
   * @param {string} userId - User ID
   * @param {string} notificationId - Notification ID
   * @param {Object} metadata - Email metadata
   * @returns {string} Enhanced HTML with tracking
   */
  async addEmailTracking(html, userId, notificationId, metadata = {}) {
    try {
      // Generate a temporary message ID for tracking
      const tempMessageId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Generate tracking pixel URL
      const trackingPixelUrl = this.trackingService.generateTrackingPixelUrl(
        tempMessageId,
        userId,
        notificationId
      );
      
      // Generate unsubscribe link
      const unsubscribeLink = this.trackingService.generateUnsubscribeLink(
        userId,
        metadata.notificationType || 'all'
      );
      
      // Add tracking pixel before closing body tag
      let enhancedHtml = html;
      
      // Add tracking pixel
      const trackingPixel = `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />`;
      
      if (enhancedHtml.includes('</body>')) {
        enhancedHtml = enhancedHtml.replace('</body>', `${trackingPixel}</body>`);
      } else {
        enhancedHtml += trackingPixel;
      }
      
      // Convert links to trackable links
      enhancedHtml = this.convertLinksToTrackable(enhancedHtml, tempMessageId, userId, notificationId);
      
      // Add unsubscribe link if not present
      if (!enhancedHtml.includes('unsubscribe') && !enhancedHtml.includes('Unsubscribe')) {
        const unsubscribeSection = `
          <div style="text-align: center; font-size: 12px; color: #666; margin-top: 20px; padding: 10px;">
            <p>If you no longer wish to receive these emails, you can <a href="${unsubscribeLink}" style="color: #666;">unsubscribe here</a>.</p>
          </div>
        `;
        
        if (enhancedHtml.includes('</body>')) {
          enhancedHtml = enhancedHtml.replace('</body>', `${unsubscribeSection}</body>`);
        } else {
          enhancedHtml += unsubscribeSection;
        }
      }
      
      return enhancedHtml;
      
    } catch (error) {
      console.error('❌ Failed to add email tracking:', error);
      return html; // Return original HTML if tracking fails
    }
  }

  /**
   * Convert links in HTML to trackable links
   * @param {string} html - HTML content
   * @param {string} messageId - Message ID
   * @param {string} userId - User ID
   * @param {string} notificationId - Notification ID
   * @returns {string} HTML with trackable links
   */
  convertLinksToTrackable(html, messageId, userId, notificationId) {
    try {
      // Regular expression to find links (excluding tracking pixel and unsubscribe links)
      const linkRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])((?:(?!\1)[^\\]|\\.)*)(\1)(?:[^>]*?)>/gi;
      
      return html.replace(linkRegex, (match, quote, url, endQuote, ...args) => {
        // Skip if it's already a tracking URL or unsubscribe link
        if (url.includes('/track/') || url.includes('/unsubscribe/') || url.includes('mailto:')) {
          return match;
        }
        
        // Generate trackable link
        const trackableUrl = this.trackingService.generateTrackableLink(
          url,
          messageId,
          userId,
          notificationId
        );
        
        // Replace the href with trackable URL
        return match.replace(`href=${quote}${url}${endQuote}`, `href=${quote}${trackableUrl}${endQuote}`);
      });
      
    } catch (error) {
      console.error('❌ Failed to convert links to trackable:', error);
      return html; // Return original HTML if conversion fails
    }
  }

  /**
   * Get email tracking service instance
   * @returns {EmailTrackingService} Tracking service instance
   */
  getTrackingService() {
    return this.trackingService;
  }

  /**
   * Utility method to sleep
   * @param {number} ms - Milliseconds to sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default EmailServiceManager;