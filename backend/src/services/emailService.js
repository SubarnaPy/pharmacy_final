import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Email service for sending various types of emails
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.templates = new Map();
    this.init();
  }

  /**
   * Initialize email service
   */
  async init() {
    // Create reusable transporter object using SMTP transport
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Load email templates
    await this.loadTemplates();

    // Verify connection configuration
    try {
      await this.transporter.verify();
      console.log('Email service initialized successfully');
    } catch (error) {
      console.error('Email service initialization failed:', error.message);
    }
  }

  /**
   * Load email templates from templates directory
   */
  async loadTemplates() {
    const templatesDir = path.join(__dirname, '../templates/email');
    
    try {
      // Create templates directory if it doesn't exist
      await fs.mkdir(templatesDir, { recursive: true });

      // Default templates
      const defaultTemplates = {
        emailVerification: this.getEmailVerificationTemplate(),
        passwordReset: this.getPasswordResetTemplate(),
        welcomeEmail: this.getWelcomeTemplate(),
        twoFactorEnabled: this.getTwoFactorEnabledTemplate(),
        twoFactorDisabled: this.getTwoFactorDisabledTemplate(),
        emergencyAccessUsed: this.getEmergencyAccessTemplate(),
        passwordChanged: this.getPasswordChangedTemplate(),
        accountLocked: this.getAccountLockedTemplate(),
        loginAlert: this.getLoginAlertTemplate()
      };

      // Load or create templates
      for (const [name, template] of Object.entries(defaultTemplates)) {
        const templatePath = path.join(templatesDir, `${name}.html`);
        
        try {
          const templateContent = await fs.readFile(templatePath, 'utf-8');
          this.templates.set(name, templateContent);
        } catch (error) {
          // Template file doesn't exist, create it with default content
          await fs.writeFile(templatePath, template);
          this.templates.set(name, template);
        }
      }

      console.log(`Loaded ${this.templates.size} email templates`);
    } catch (error) {
      console.error('Failed to load email templates:', error.message);
    }
  }

  /**
   * Send email
   * @param {Object} options - Email options
   * @param {string} options.to - Recipient email
   * @param {string} options.subject - Email subject
   * @param {string} options.template - Template name
   * @param {Object} options.data - Template data
   * @param {string} options.html - Raw HTML content (alternative to template)
   * @param {string} options.text - Plain text content
   */
  async sendEmail({ to, subject, template, data = {}, html, text }) {
    try {
      if (!this.transporter) {
        console.log('Email service in mock mode. Would send email:', {
          to,
          subject,
          template,
          data
        });
        return {
          success: true,
          messageId: 'mock-' + Date.now(),
          mock: true
        };
      }

      let emailHtml = html;
      let emailText = text;

      // Use template if provided
      if (template) {
        const templateContent = this.templates.get(template);
        if (!templateContent) {
          throw new Error(`Template '${template}' not found`);
        }

        emailHtml = this.processTemplate(templateContent, data);
        emailText = this.htmlToText(emailHtml);
      }

      const mailOptions = {
        from: `"${process.env.APP_NAME || 'Pharmacy System'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USERNAME}>`,
        to,
        subject,
        html: emailHtml,
        text: emailText
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      
      return {
        success: true,
        messageId: result.messageId
      };

    } catch (error) {
      console.error('Failed to send email:', error.message);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  /**
   * Process template with data
   * @param {string} template - Template content
   * @param {Object} data - Template data
   * @returns {string} Processed template
   */
  processTemplate(template, data) {
    let processed = template;

    // Simple template processing - replace {{variable}} with data
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      processed = processed.replace(regex, data[key] || '');
    });

    // Add common variables
    const commonData = {
      appName: process.env.APP_NAME || 'Pharmacy System',
      appUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
      supportEmail: process.env.SUPPORT_EMAIL || process.env.SMTP_USERNAME,
      currentYear: new Date().getFullYear()
    };

    Object.keys(commonData).forEach(key => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      processed = processed.replace(regex, commonData[key]);
    });

    return processed;
  }

  /**
   * Convert HTML to plain text (basic implementation)
   * @param {string} html - HTML content
   * @returns {string} Plain text
   */
  htmlToText(html) {
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
      .replace(/&amp;/g, '&') // Replace &amp; with &
      .replace(/&lt;/g, '<') // Replace &lt; with <
      .replace(/&gt;/g, '>') // Replace &gt; with >
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim();
  }

  /**
   * Send bulk emails
   * @param {Array} recipients - Array of recipient objects
   * @param {string} subject - Email subject
   * @param {string} template - Template name
   * @param {Object} commonData - Common data for all emails
   */
  async sendBulkEmails(recipients, subject, template, commonData = {}) {
    const results = [];

    for (const recipient of recipients) {
      try {
        const data = { ...commonData, ...recipient.data };
        const result = await this.sendEmail({
          to: recipient.email,
          subject,
          template,
          data
        });
        results.push({ email: recipient.email, success: true, messageId: result.messageId });
      } catch (error) {
        results.push({ email: recipient.email, success: false, error: error.message });
      }
    }

    return results;
  }

  // Email templates
  getEmailVerificationTemplate() {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Verify Your Email</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4f46e5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #4f46e5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Welcome to {{appName}}</h1>
    </div>
    <div class="content">
        <h2>Verify Your Email Address</h2>
        <p>Hello {{firstName}},</p>
        <p>Thank you for registering with {{appName}}. To complete your registration, please verify your email address by clicking the button below:</p>
        <p style="text-align: center;">
            <a href="{{verificationLink}}" class="button">Verify Email Address</a>
        </p>
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p><a href="{{verificationLink}}">{{verificationLink}}</a></p>
        <p>This verification link will expire in 24 hours for security reasons.</p>
        <p>If you didn't create an account with us, please ignore this email.</p>
    </div>
    <div class="footer">
        <p>© {{currentYear}} {{appName}}. All rights reserved.</p>
        <p>If you have any questions, contact us at {{supportEmail}}</p>
    </div>
</body>
</html>`;
  }

  getPasswordResetTemplate() {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Reset Your Password</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Password Reset Request</h1>
    </div>
    <div class="content">
        <p>Hello {{firstName}},</p>
        <p>We received a request to reset your password for your {{appName}} account.</p>
        <p style="text-align: center;">
            <a href="{{resetLink}}" class="button">Reset Password</a>
        </p>
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p><a href="{{resetLink}}">{{resetLink}}</a></p>
        <p>This password reset link will expire in 1 hour for security reasons.</p>
        <p><strong>If you didn't request a password reset, please ignore this email and your password will remain unchanged.</strong></p>
    </div>
    <div class="footer">
        <p>© {{currentYear}} {{appName}}. All rights reserved.</p>
        <p>If you have any questions, contact us at {{supportEmail}}</p>
    </div>
</body>
</html>`;
  }

  getWelcomeTemplate() {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Welcome to {{appName}}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #059669; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Welcome to {{appName}}!</h1>
    </div>
    <div class="content">
        <p>Hello {{firstName}},</p>
        <p>Welcome to {{appName}}! Your account has been successfully created and verified.</p>
        <p>You can now access all the features of our platform:</p>
        <ul>
            <li>Browse and search pharmacies</li>
            <li>Order medications online</li>
            <li>Track your orders</li>
            <li>Consult with healthcare professionals</li>
            <li>Manage your health records</li>
        </ul>
        <p style="text-align: center;">
            <a href="{{appUrl}}" class="button">Get Started</a>
        </p>
        <p>If you have any questions or need assistance, don't hesitate to contact our support team.</p>
    </div>
    <div class="footer">
        <p>© {{currentYear}} {{appName}}. All rights reserved.</p>
        <p>If you have any questions, contact us at {{supportEmail}}</p>
    </div>
</body>
</html>`;
  }

  getTwoFactorEnabledTemplate() {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Two-Factor Authentication Enabled</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Security Enhanced</h1>
    </div>
    <div class="content">
        <p>Hello {{firstName}},</p>
        <p>Two-factor authentication has been successfully enabled for your {{appName}} account.</p>
        <p><strong>Enabled on:</strong> {{enabledAt}}</p>
        <p>Your account is now more secure. You'll need your authentication app to generate a code each time you log in.</p>
        <p>If you didn't enable two-factor authentication, please contact our support team immediately.</p>
    </div>
    <div class="footer">
        <p>© {{currentYear}} {{appName}}. All rights reserved.</p>
        <p>If you have any questions, contact us at {{supportEmail}}</p>
    </div>
</body>
</html>`;
  }

  getTwoFactorDisabledTemplate() {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Two-Factor Authentication Disabled</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Security Notice</h1>
    </div>
    <div class="content">
        <p>Hello {{firstName}},</p>
        <p>Two-factor authentication has been disabled for your {{appName}} account.</p>
        <p><strong>Disabled on:</strong> {{disabledAt}}</p>
        <p>Your account security has been reduced. We recommend re-enabling two-factor authentication to keep your account secure.</p>
        <p>If you didn't disable two-factor authentication, please contact our support team immediately.</p>
    </div>
    <div class="footer">
        <p>© {{currentYear}} {{appName}}. All rights reserved.</p>
        <p>If you have any questions, contact us at {{supportEmail}}</p>
    </div>
</body>
</html>`;
  }

  getEmergencyAccessTemplate() {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Emergency Access Used</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Security Alert</h1>
    </div>
    <div class="content">
        <p>Hello {{firstName}},</p>
        <p><strong>Emergency access was used on your {{appName}} account.</strong></p>
        <p><strong>Time:</strong> {{accessTime}}</p>
        <p><strong>IP Address:</strong> {{ipAddress}}</p>
        <p>Your password has been changed and two-factor authentication has been temporarily disabled.</p>
        <p><strong>Please take the following actions immediately:</strong></p>
        <ul>
            <li>Log in to your account and verify all account settings</li>
            <li>Re-enable two-factor authentication</li>
            <li>Review your account activity</li>
        </ul>
        <p>If you didn't perform this action, please contact our support team immediately.</p>
    </div>
    <div class="footer">
        <p>© {{currentYear}} {{appName}}. All rights reserved.</p>
        <p>If you have any questions, contact us at {{supportEmail}}</p>
    </div>
</body>
</html>`;
  }

  getPasswordChangedTemplate() {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Password Changed</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Password Updated</h1>
    </div>
    <div class="content">
        <p>Hello {{firstName}},</p>
        <p>Your password for {{appName}} has been successfully changed.</p>
        <p><strong>Changed on:</strong> {{changedAt}}</p>
        <p>If you didn't change your password, please contact our support team immediately.</p>
    </div>
    <div class="footer">
        <p>© {{currentYear}} {{appName}}. All rights reserved.</p>
        <p>If you have any questions, contact us at {{supportEmail}}</p>
    </div>
</body>
</html>`;
  }

  getAccountLockedTemplate() {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Account Temporarily Locked</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Security Notice</h1>
    </div>
    <div class="content">
        <p>Hello {{firstName}},</p>
        <p>Your {{appName}} account has been temporarily locked due to multiple failed login attempts.</p>
        <p><strong>Locked on:</strong> {{lockedAt}}</p>
        <p><strong>Unlock time:</strong> {{unlockAt}}</p>
        <p>This is a security measure to protect your account. You can try logging in again after the unlock time.</p>
        <p>If you didn't attempt to log in, please contact our support team.</p>
    </div>
    <div class="footer">
        <p>© {{currentYear}} {{appName}}. All rights reserved.</p>
        <p>If you have any questions, contact us at {{supportEmail}}</p>
    </div>
</body>
</html>`;
  }

  getLoginAlertTemplate() {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>New Login Alert</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>New Login Detected</h1>
    </div>
    <div class="content">
        <p>Hello {{firstName}},</p>
        <p>A new login was detected on your {{appName}} account.</p>
        <p><strong>Time:</strong> {{loginTime}}</p>
        <p><strong>Location:</strong> {{location}}</p>
        <p><strong>Device:</strong> {{device}}</p>
        <p><strong>IP Address:</strong> {{ipAddress}}</p>
        <p>If this was you, you can safely ignore this email.</p>
        <p>If you don't recognize this login, please secure your account immediately by changing your password.</p>
    </div>
    <div class="footer">
        <p>© {{currentYear}} {{appName}}. All rights reserved.</p>
        <p>If you have any questions, contact us at {{supportEmail}}</p>
    </div>
</body>
</html>`;
  }
}

// Create singleton instance
const emailService = new EmailService();

/**
 * Send email function
 * @param {Object} options - Email options
 */
export const sendEmail = async (options) => {
  return await emailService.sendEmail(options);
};

/**
 * Send bulk emails function
 * @param {Array} recipients - Array of recipients
 * @param {string} subject - Email subject
 * @param {string} template - Template name
 * @param {Object} commonData - Common data
 */
export const sendBulkEmails = async (recipients, subject, template, commonData) => {
  return await emailService.sendBulkEmails(recipients, subject, template, commonData);
};

export default emailService;
