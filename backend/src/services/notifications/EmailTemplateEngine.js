import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import NotificationTemplate from '../../models/NotificationTemplate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Email Template Engine
 * Handles email template rendering, validation, and management
 */
class EmailTemplateEngine {
  constructor(options = {}) {
    this.templateCache = new Map();
    this.templateDir = options.templateDir || path.join(__dirname, '../../templates/email');
    this.defaultLanguage = options.defaultLanguage || 'en';
    this.supportedLanguages = options.supportedLanguages || ['en', 'es', 'fr'];
    
    // Template validation rules
    this.validationRules = {
      subject: { required: true, maxLength: 200 },
      title: { required: true, maxLength: 100 },
      body: { required: true, maxLength: 10000 },
      htmlBody: { maxLength: 50000 }
    };
    
    console.log('✅ Email Template Engine initialized');
  }

  /**
   * Get email template for specific notification type and user role
   * @param {string} type - Notification type
   * @param {string} userRole - User role
   * @param {string} language - Language preference
   * @returns {Object} Template data
   */
  async getTemplate(type, userRole, language = 'en') {
    try {
      const cacheKey = `${type}_${userRole}_${language}`;
      
      // Check cache first
      if (this.templateCache.has(cacheKey)) {
        return this.templateCache.get(cacheKey);
      }

      // Try to get template from database first
      let template = await NotificationTemplate.findOne({
        type,
        isActive: true,
        'variants.channel': 'email',
        'variants.userRole': userRole,
        'variants.language': language
      });

      // Fallback to default language if not found
      if (!template && language !== this.defaultLanguage) {
        template = await NotificationTemplate.findOne({
          type,
          isActive: true,
          'variants.channel': 'email',
          'variants.userRole': userRole,
          'variants.language': this.defaultLanguage
        });
      }

      // If still not found, try to load from file system
      if (!template) {
        template = await this.loadTemplateFromFile(type, userRole, language);
      }

      if (!template) {
        throw new Error(`Template not found for type: ${type}, role: ${userRole}, language: ${language}`);
      }

      // Get the email variant
      const emailVariant = template.variants?.find(v => 
        v.channel === 'email' && 
        v.userRole === userRole && 
        (v.language === language || v.language === this.defaultLanguage)
      );

      if (!emailVariant) {
        throw new Error(`Email variant not found for type: ${type}, role: ${userRole}`);
      }

      // Cache the template
      this.templateCache.set(cacheKey, emailVariant);
      
      return emailVariant;
    } catch (error) {
      console.error('Error getting email template:', error);
      throw error;
    }
  }

  /**
   * Load template from file system
   * @param {string} type - Notification type
   * @param {string} userRole - User role
   * @param {string} language - Language preference
   * @returns {Object} Template data
   */
  async loadTemplateFromFile(type, userRole, language) {
    try {
      const templatePath = path.join(this.templateDir, `${type}_${userRole}_${language}.html`);
      
      // Check if file exists
      try {
        await fs.access(templatePath);
      } catch {
        // Try default language
        const defaultPath = path.join(this.templateDir, `${type}_${userRole}_${this.defaultLanguage}.html`);
        try {
          await fs.access(defaultPath);
          return await this.parseTemplateFile(defaultPath, type, userRole, this.defaultLanguage);
        } catch {
          // Try generic template
          const genericPath = path.join(this.templateDir, `${type}.html`);
          try {
            await fs.access(genericPath);
            return await this.parseTemplateFile(genericPath, type, userRole, language);
          } catch {
            return null;
          }
        }
      }

      return await this.parseTemplateFile(templatePath, type, userRole, language);
    } catch (error) {
      console.error('Error loading template from file:', error);
      return null;
    }
  }

  /**
   * Parse template file and extract metadata
   * @param {string} filePath - Path to template file
   * @param {string} type - Notification type
   * @param {string} userRole - User role
   * @param {string} language - Language
   * @returns {Object} Parsed template
   */
  async parseTemplateFile(filePath, type, userRole, language) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Extract subject from HTML comment or title tag
      const subjectMatch = content.match(/<!--\s*SUBJECT:\s*(.+?)\s*-->/i) || 
                          content.match(/<title[^>]*>([^<]+)<\/title>/i);
      const subject = subjectMatch ? subjectMatch[1].trim() : `Notification: ${type}`;

      // Extract title from first h1 or use subject
      const titleMatch = content.match(/<h1[^>]*>([^<]+)<\/h1>/i);
      const title = titleMatch ? titleMatch[1].trim() : subject;

      return {
        variants: [{
          channel: 'email',
          userRole,
          language,
          subject,
          title,
          body: content,
          htmlBody: content,
          styling: {
            primaryColor: '#059669',
            logoUrl: '',
            footerText: ''
          },
          actions: []
        }]
      };
    } catch (error) {
      console.error('Error parsing template file:', error);
      return null;
    }
  }

  /**
   * Render email template with data
   * @param {Object} template - Template object
   * @param {Object} data - Data to render
   * @param {Object} context - Additional context
   * @returns {Object} Rendered template
   */
  async renderTemplate(template, data = {}, context = {}) {
    try {
      if (!template) {
        throw new Error('Template is required for rendering');
      }

      // Merge data with context
      const renderData = {
        ...this.getDefaultTemplateData(),
        ...data,
        ...context
      };

      // Render subject
      const subject = this.interpolateString(template.subject || '', renderData);
      
      // Render title
      const title = this.interpolateString(template.title || '', renderData);
      
      // Render HTML body
      const htmlBody = this.interpolateString(template.htmlBody || template.body || '', renderData);
      
      // Render plain text body (strip HTML)
      const textBody = this.htmlToText(htmlBody);

      return {
        subject,
        title,
        htmlBody,
        textBody,
        styling: template.styling || {},
        actions: template.actions || [],
        attachments: renderData.attachments || []
      };
    } catch (error) {
      console.error('Error rendering email template:', error);
      throw error;
    }
  }

  /**
   * Interpolate string with data using handlebars-like syntax
   * @param {string} template - Template string
   * @param {Object} data - Data object
   * @returns {string} Interpolated string
   */
  interpolateString(template, data) {
    if (!template || typeof template !== 'string') {
      return '';
    }

    return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const keys = key.trim().split('.');
      let value = data;
      
      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k];
        } else {
          return match; // Return original if key not found
        }
      }
      
      return value !== null && value !== undefined ? String(value) : '';
    });
  }

  /**
   * Convert HTML to plain text
   * @param {string} html - HTML string
   * @returns {string} Plain text
   */
  htmlToText(html) {
    if (!html) return '';
    
    return html
      .replace(/<style[^>]*>.*?<\/style>/gis, '')
      .replace(/<script[^>]*>.*?<\/script>/gis, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Get default template data
   * @returns {Object} Default data
   */
  getDefaultTemplateData() {
    return {
      appName: process.env.APP_NAME || 'Healthcare Platform',
      appUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
      supportEmail: process.env.SUPPORT_EMAIL || 'support@healthcare.com',
      currentYear: new Date().getFullYear(),
      currentDate: new Date().toLocaleDateString(),
      currentDateTime: new Date().toLocaleString()
    };
  }

  /**
   * Validate template content
   * @param {Object} template - Template to validate
   * @returns {Object} Validation result
   */
  async validateTemplate(template) {
    const errors = [];
    const warnings = [];

    try {
      if (!template) {
        errors.push('Template is required');
        return { isValid: false, errors, warnings };
      }

      // Validate required fields
      for (const [field, rules] of Object.entries(this.validationRules)) {
        const value = template[field];
        
        if (rules.required && (!value || value.trim() === '')) {
          errors.push(`${field} is required`);
        }
        
        if (value && rules.maxLength && value.length > rules.maxLength) {
          errors.push(`${field} exceeds maximum length of ${rules.maxLength} characters`);
        }
      }

      // Validate HTML structure
      if (template.htmlBody) {
        const htmlValidation = this.validateHTML(template.htmlBody);
        errors.push(...htmlValidation.errors);
        warnings.push(...htmlValidation.warnings);
      }

      // Check for required placeholders
      const requiredPlaceholders = ['{{appName}}', '{{supportEmail}}'];
      const content = (template.htmlBody || template.body || '').toLowerCase();
      
      for (const placeholder of requiredPlaceholders) {
        if (!content.includes(placeholder.toLowerCase())) {
          warnings.push(`Missing recommended placeholder: ${placeholder}`);
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      console.error('Error validating template:', error);
      return {
        isValid: false,
        errors: ['Template validation failed: ' + error.message],
        warnings
      };
    }
  }

  /**
   * Validate HTML content
   * @param {string} html - HTML content
   * @returns {Object} Validation result
   */
  validateHTML(html) {
    const errors = [];
    const warnings = [];

    try {
      // Check for basic HTML structure
      if (!html.includes('<html') && !html.includes('<body')) {
        warnings.push('Template should include proper HTML structure');
      }

      // Check for responsive meta tag
      if (!html.includes('viewport')) {
        warnings.push('Template should include viewport meta tag for mobile responsiveness');
      }

      // Check for inline styles vs external CSS
      if (html.includes('<link') && html.includes('href=')) {
        warnings.push('External CSS may not work in all email clients, consider inline styles');
      }

      // Check for potentially problematic tags
      const problematicTags = ['<script', '<iframe', '<object', '<embed'];
      for (const tag of problematicTags) {
        if (html.toLowerCase().includes(tag)) {
          errors.push(`Potentially problematic tag found: ${tag}`);
        }
      }

      return { errors, warnings };
    } catch (error) {
      return { 
        errors: ['HTML validation failed: ' + error.message], 
        warnings 
      };
    }
  }

  /**
   * Test template rendering with sample data
   * @param {Object} template - Template to test
   * @param {Object} sampleData - Sample data for testing
   * @returns {Object} Test result
   */
  async testTemplate(template, sampleData = {}) {
    try {
      const testData = {
        ...this.getDefaultTemplateData(),
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        ...sampleData
      };

      const rendered = await this.renderTemplate(template, testData);
      const validation = await this.validateTemplate(template);

      return {
        success: true,
        rendered,
        validation,
        testData
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        validation: await this.validateTemplate(template)
      };
    }
  }

  /**
   * Handle email attachments
   * @param {Array} attachments - Array of attachment objects
   * @returns {Array} Processed attachments
   */
  async processAttachments(attachments = []) {
    const processedAttachments = [];

    for (const attachment of attachments) {
      try {
        if (!attachment.filename || !attachment.content) {
          console.warn('Invalid attachment:', attachment);
          continue;
        }

        // Validate file size (max 10MB per attachment)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (attachment.content.length > maxSize) {
          console.warn(`Attachment ${attachment.filename} exceeds size limit`);
          continue;
        }

        // Validate file type for security
        const allowedTypes = [
          'application/pdf',
          'image/jpeg',
          'image/png',
          'image/gif',
          'text/plain',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];

        if (attachment.contentType && !allowedTypes.includes(attachment.contentType)) {
          console.warn(`Attachment ${attachment.filename} has unsupported type: ${attachment.contentType}`);
          continue;
        }

        processedAttachments.push({
          filename: attachment.filename,
          content: attachment.content,
          contentType: attachment.contentType || 'application/octet-stream',
          encoding: attachment.encoding || 'base64',
          cid: attachment.cid // For inline images
        });
      } catch (error) {
        console.error('Error processing attachment:', error);
      }
    }

    return processedAttachments;
  }

  /**
   * Clear template cache
   */
  clearCache() {
    this.templateCache.clear();
    console.log('Template cache cleared');
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getCacheStats() {
    return {
      size: this.templateCache.size,
      keys: Array.from(this.templateCache.keys())
    };
  }
}

export { EmailTemplateEngine };
export default EmailTemplateEngine;