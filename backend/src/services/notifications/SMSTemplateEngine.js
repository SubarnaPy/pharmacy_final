/**
 * SMS Template Engine
 * Handles SMS template management, rendering, and optimization
 */
class SMSTemplateEngine {
  constructor(options = {}) {
    this.templates = new Map();
    this.templateCache = new Map();
    this.cacheTimeout = options.cacheTimeout || 3600000; // 1 hour
    this.maxSMSLength = options.maxSMSLength || 160;
    this.maxConcatenatedLength = options.maxConcatenatedLength || 1600; // 10 SMS parts
    
    // Initialize default templates
    this.initializeDefaultTemplates();
    
    console.log('✅ SMS Template Engine initialized');
  }

  /**
   * Initialize default SMS templates
   */
  initializeDefaultTemplates() {
    const defaultTemplates = {
      // User authentication templates
      user_registered: {
        id: 'user_registered',
        name: 'User Registration Welcome',
        category: 'authentication',
        priority: 'medium',
        template: 'Welcome to {{platformName}}! Your account has been created successfully. {{#if verificationRequired}}Please verify your account using the link sent to your email.{{/if}}',
        variables: ['platformName', 'verificationRequired'],
        maxLength: 160
      },

      password_reset: {
        id: 'password_reset',
        name: 'Password Reset',
        category: 'authentication',
        priority: 'high',
        template: 'Password reset requested for {{platformName}}. Your reset code: {{resetCode}}. Valid for {{expiryMinutes}} minutes. If you didn\'t request this, ignore this message.',
        variables: ['platformName', 'resetCode', 'expiryMinutes'],
        maxLength: 160
      },

      // Appointment templates
      appointment_scheduled: {
        id: 'appointment_scheduled',
        name: 'Appointment Scheduled',
        category: 'medical',
        priority: 'high',
        template: 'Appointment confirmed with Dr. {{doctorName}} on {{date}} at {{time}}. Location: {{location}}. {{#if instructions}}Note: {{instructions}}{{/if}}',
        variables: ['doctorName', 'date', 'time', 'location', 'instructions'],
        maxLength: 160
      },

      appointment_reminder: {
        id: 'appointment_reminder',
        name: 'Appointment Reminder',
        category: 'medical',
        priority: 'high',
        template: 'Reminder: Appointment with Dr. {{doctorName}} {{timeUntil}}. {{date}} at {{time}}. {{#if prepInstructions}}Prep: {{prepInstructions}}{{/if}} Reply CONFIRM to confirm.',
        variables: ['doctorName', 'timeUntil', 'date', 'time', 'prepInstructions'],
        maxLength: 160
      },

      appointment_cancelled: {
        id: 'appointment_cancelled',
        name: 'Appointment Cancelled',
        category: 'medical',
        priority: 'high',
        template: 'Your appointment with Dr. {{doctorName}} on {{date}} at {{time}} has been cancelled. {{#if reason}}Reason: {{reason}}.{{/if}} Please reschedule if needed.',
        variables: ['doctorName', 'date', 'time', 'reason'],
        maxLength: 160
      },

      // Prescription templates
      prescription_created: {
        id: 'prescription_created',
        name: 'Prescription Created',
        category: 'medical',
        priority: 'high',
        template: 'New prescription from Dr. {{doctorName}}: {{medicationName}}. Sent to {{pharmacyCount}} nearby pharmacies. You\'ll receive quotes soon. Ref: {{prescriptionId}}',
        variables: ['doctorName', 'medicationName', 'pharmacyCount', 'prescriptionId'],
        maxLength: 160
      },

      prescription_ready: {
        id: 'prescription_ready',
        name: 'Prescription Ready',
        category: 'medical',
        priority: 'high',
        template: 'Your prescription for {{medicationName}} is ready for pickup at {{pharmacyName}}. Total: ${{totalCost}}. Hours: {{pharmacyHours}}. Ref: {{prescriptionId}}',
        variables: ['medicationName', 'pharmacyName', 'totalCost', 'pharmacyHours', 'prescriptionId'],
        maxLength: 160
      },

      // Order templates
      order_confirmed: {
        id: 'order_confirmed',
        name: 'Order Confirmed',
        category: 'administrative',
        priority: 'medium',
        template: 'Order #{{orderNumber}} confirmed. {{itemCount}} items, total ${{totalAmount}}. {{#if deliveryDate}}Delivery: {{deliveryDate}}.{{/if}} Track: {{trackingUrl}}',
        variables: ['orderNumber', 'itemCount', 'totalAmount', 'deliveryDate', 'trackingUrl'],
        maxLength: 160
      },

      order_shipped: {
        id: 'order_shipped',
        name: 'Order Shipped',
        category: 'administrative',
        priority: 'medium',
        template: 'Order #{{orderNumber}} shipped! Tracking: {{trackingNumber}}. Expected delivery: {{deliveryDate}}. Track at {{trackingUrl}}',
        variables: ['orderNumber', 'trackingNumber', 'deliveryDate', 'trackingUrl'],
        maxLength: 160
      },

      order_delivered: {
        id: 'order_delivered',
        name: 'Order Delivered',
        category: 'administrative',
        priority: 'medium',
        template: 'Order #{{orderNumber}} delivered! {{#if signature}}Signed by: {{signature}}.{{/if}} Questions? Contact support. Rate your experience: {{ratingUrl}}',
        variables: ['orderNumber', 'signature', 'ratingUrl'],
        maxLength: 160
      },

      // Payment templates
      payment_successful: {
        id: 'payment_successful',
        name: 'Payment Successful',
        category: 'administrative',
        priority: 'medium',
        template: 'Payment of ${{amount}} processed successfully. {{#if method}}Method: {{method}}.{{/if}} Receipt: {{receiptUrl}}. Transaction ID: {{transactionId}}',
        variables: ['amount', 'method', 'receiptUrl', 'transactionId'],
        maxLength: 160
      },

      payment_failed: {
        id: 'payment_failed',
        name: 'Payment Failed',
        category: 'administrative',
        priority: 'high',
        template: 'Payment of ${{amount}} failed. {{#if reason}}Reason: {{reason}}.{{/if}} Please update payment method or try again. Support: {{supportUrl}}',
        variables: ['amount', 'reason', 'supportUrl'],
        maxLength: 160
      },

      // System templates
      system_maintenance: {
        id: 'system_maintenance',
        name: 'System Maintenance',
        category: 'system',
        priority: 'high',
        template: 'Scheduled maintenance: {{startTime}} - {{endTime}} on {{date}}. {{#if services}}Affected: {{services}}.{{/if}} We apologize for any inconvenience.',
        variables: ['startTime', 'endTime', 'date', 'services'],
        maxLength: 160
      },

      // Emergency templates
      emergency_alert: {
        id: 'emergency_alert',
        name: 'Emergency Alert',
        category: 'emergency',
        priority: 'critical',
        template: 'URGENT: {{alertMessage}} {{#if actionRequired}}Action required: {{actionRequired}}.{{/if}} More info: {{infoUrl}}',
        variables: ['alertMessage', 'actionRequired', 'infoUrl'],
        maxLength: 160
      }
    };

    // Store templates
    Object.values(defaultTemplates).forEach(template => {
      this.templates.set(template.id, template);
    });

    console.log(`📱 Loaded ${this.templates.size} default SMS templates`);
  }

  /**
   * Get SMS template by ID
   * @param {string} templateId - Template ID
   * @returns {Object|null} Template object
   */
  getTemplate(templateId) {
    return this.templates.get(templateId) || null;
  }

  /**
   * Get templates by category
   * @param {string} category - Template category
   * @returns {Array} Array of templates
   */
  getTemplatesByCategory(category) {
    return Array.from(this.templates.values()).filter(template => 
      template.category === category
    );
  }

  /**
   * Add or update SMS template
   * @param {Object} template - Template object
   * @returns {boolean} Success status
   */
  addTemplate(template) {
    try {
      // Validate template
      if (!this.validateTemplate(template)) {
        throw new Error('Invalid template structure');
      }

      this.templates.set(template.id, template);
      
      // Clear cache for this template
      this.clearTemplateCache(template.id);
      
      console.log(`📱 SMS template '${template.id}' added/updated`);
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to add SMS template '${template.id}':`, error);
      return false;
    }
  }

  /**
   * Validate template structure
   * @param {Object} template - Template to validate
   * @returns {boolean} Is valid
   */
  validateTemplate(template) {
    const requiredFields = ['id', 'name', 'category', 'priority', 'template'];
    
    for (const field of requiredFields) {
      if (!template[field]) {
        console.error(`❌ Template missing required field: ${field}`);
        return false;
      }
    }

    // Validate priority
    const validPriorities = ['low', 'medium', 'high', 'critical', 'emergency'];
    if (!validPriorities.includes(template.priority)) {
      console.error(`❌ Invalid template priority: ${template.priority}`);
      return false;
    }

    // Validate template syntax (basic check for handlebars)
    if (!this.validateTemplateSyntax(template.template)) {
      console.error(`❌ Invalid template syntax in: ${template.id}`);
      return false;
    }

    return true;
  }

  /**
   * Validate template syntax
   * @param {string} template - Template string
   * @returns {boolean} Is valid syntax
   */
  validateTemplateSyntax(template) {
    try {
      // Check for balanced handlebars
      const openBraces = (template.match(/\{\{/g) || []).length;
      const closeBraces = (template.match(/\}\}/g) || []).length;
      
      if (openBraces !== closeBraces) {
        return false;
      }

      // Check for balanced conditionals
      const ifStatements = (template.match(/\{\{#if/g) || []).length;
      const endIfStatements = (template.match(/\{\{\/if\}\}/g) || []).length;
      
      if (ifStatements !== endIfStatements) {
        return false;
      }

      return true;
      
    } catch (error) {
      return false;
    }
  }

  /**
   * Render SMS template with data
   * @param {string} templateId - Template ID
   * @param {Object} data - Template data
   * @param {Object} options - Rendering options
   * @returns {Object} Rendered result
   */
  renderTemplate(templateId, data = {}, options = {}) {
    try {
      const template = this.getTemplate(templateId);
      if (!template) {
        throw new Error(`Template '${templateId}' not found`);
      }

      // Check cache first
      const cacheKey = this.generateCacheKey(templateId, data, options);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }

      // Render template
      let rendered = this.processTemplate(template.template, data);
      
      // Optimize for SMS length
      const optimized = this.optimizeForSMS(rendered, template.maxLength || this.maxSMSLength);
      
      const result = {
        templateId,
        originalText: rendered,
        optimizedText: optimized.text,
        length: optimized.text.length,
        truncated: optimized.truncated,
        smsCount: this.calculateSMSCount(optimized.text),
        priority: template.priority,
        category: template.category,
        variables: this.extractUsedVariables(template.template, data)
      };

      // Cache the result
      this.setCache(cacheKey, result);
      
      return result;
      
    } catch (error) {
      console.error(`❌ Failed to render SMS template '${templateId}':`, error);
      throw error;
    }
  }

  /**
   * Process template with handlebars-like syntax
   * @param {string} template - Template string
   * @param {Object} data - Template data
   * @returns {string} Processed template
   */
  processTemplate(template, data) {
    let processed = template;

    // Process simple variables {{variable}}
    processed = processed.replace(/\{\{([^#\/\s}]+)\}\}/g, (match, variable) => {
      const value = this.getNestedValue(data, variable.trim());
      return value !== undefined ? String(value) : '';
    });

    // Process conditional blocks {{#if condition}}...{{/if}}
    processed = processed.replace(/\{\{#if\s+([^}]+)\}\}(.*?)\{\{\/if\}\}/gs, (match, condition, content) => {
      const conditionValue = this.getNestedValue(data, condition.trim());
      return conditionValue ? content : '';
    });

    // Clean up extra spaces
    processed = processed.replace(/\s+/g, ' ').trim();

    return processed;
  }

  /**
   * Get nested value from object using dot notation
   * @param {Object} obj - Object to search
   * @param {string} path - Dot notation path
   * @returns {*} Value or undefined
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Optimize text for SMS length constraints
   * @param {string} text - Original text
   * @param {number} maxLength - Maximum length
   * @returns {Object} Optimization result
   */
  optimizeForSMS(text, maxLength = this.maxSMSLength) {
    if (text.length <= maxLength) {
      return {
        text,
        truncated: false,
        originalLength: text.length
      };
    }

    // Try to truncate at word boundary
    const truncated = text.substring(0, maxLength - 3); // Leave space for "..."
    const lastSpace = truncated.lastIndexOf(' ');
    
    let optimizedText;
    if (lastSpace > maxLength * 0.8) { // If we can truncate at a word boundary without losing too much
      optimizedText = truncated.substring(0, lastSpace) + '...';
    } else {
      // Hard truncate
      optimizedText = truncated + '...';
    }

    return {
      text: optimizedText,
      truncated: true,
      originalLength: text.length,
      truncatedLength: optimizedText.length
    };
  }

  /**
   * Calculate SMS count based on message length
   * @param {string} text - SMS text
   * @returns {number} Number of SMS parts
   */
  calculateSMSCount(text) {
    if (text.length === 0) return 0;
    if (text.length <= 160) return 1;
    
    // For concatenated SMS, each part can hold 153 characters (7 chars for headers)
    return Math.ceil(text.length / 153);
  }

  /**
   * Extract variables used in template
   * @param {string} template - Template string
   * @param {Object} data - Template data
   * @returns {Object} Used variables and their values
   */
  extractUsedVariables(template, data) {
    const variables = {};
    
    // Extract simple variables
    const simpleVars = template.match(/\{\{([^#\/\s}]+)\}\}/g) || [];
    simpleVars.forEach(match => {
      const variable = match.replace(/[{}]/g, '').trim();
      variables[variable] = this.getNestedValue(data, variable);
    });

    // Extract conditional variables
    const conditionalVars = template.match(/\{\{#if\s+([^}]+)\}\}/g) || [];
    conditionalVars.forEach(match => {
      const variable = match.replace(/\{\{#if\s+|\}\}/g, '').trim();
      variables[variable] = this.getNestedValue(data, variable);
    });

    return variables;
  }

  /**
   * Generate cache key for template rendering
   * @param {string} templateId - Template ID
   * @param {Object} data - Template data
   * @param {Object} options - Rendering options
   * @returns {string} Cache key
   */
  generateCacheKey(templateId, data, options) {
    const dataHash = this.hashObject(data);
    const optionsHash = this.hashObject(options);
    return `${templateId}_${dataHash}_${optionsHash}`;
  }

  /**
   * Simple object hash function
   * @param {Object} obj - Object to hash
   * @returns {string} Hash string
   */
  hashObject(obj) {
    return JSON.stringify(obj, Object.keys(obj).sort());
  }

  /**
   * Get from cache
   * @param {string} key - Cache key
   * @returns {*} Cached value or null
   */
  getFromCache(key) {
    const cached = this.templateCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.value;
    }
    
    // Remove expired cache entry
    if (cached) {
      this.templateCache.delete(key);
    }
    
    return null;
  }

  /**
   * Set cache value
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   */
  setCache(key, value) {
    this.templateCache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  /**
   * Clear template cache
   * @param {string} templateId - Template ID (optional, clears all if not provided)
   */
  clearTemplateCache(templateId = null) {
    if (templateId) {
      // Clear cache entries for specific template
      const keysToDelete = [];
      for (const key of this.templateCache.keys()) {
        if (key.startsWith(`${templateId}_`)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => this.templateCache.delete(key));
    } else {
      // Clear all cache
      this.templateCache.clear();
    }
  }

  /**
   * Get template statistics
   * @returns {Object} Template statistics
   */
  getStats() {
    const stats = {
      totalTemplates: this.templates.size,
      cacheSize: this.templateCache.size,
      categories: {},
      priorities: {}
    };

    // Count by category and priority
    for (const template of this.templates.values()) {
      stats.categories[template.category] = (stats.categories[template.category] || 0) + 1;
      stats.priorities[template.priority] = (stats.priorities[template.priority] || 0) + 1;
    }

    return stats;
  }

  /**
   * Validate SMS content for delivery
   * @param {string} content - SMS content
   * @returns {Object} Validation result
   */
  validateSMSContent(content) {
    const result = {
      isValid: true,
      warnings: [],
      errors: [],
      length: content.length,
      smsCount: this.calculateSMSCount(content)
    };

    // Check for empty content
    if (!content || content.trim().length === 0) {
      result.isValid = false;
      result.errors.push('SMS content cannot be empty');
      return result;
    }

    // Check for excessive length
    if (content.length > this.maxConcatenatedLength) {
      result.isValid = false;
      result.errors.push(`SMS content exceeds maximum length of ${this.maxConcatenatedLength} characters`);
    }

    // Check for potentially problematic characters
    const problematicChars = content.match(/[^\x00-\x7F]/g);
    if (problematicChars && problematicChars.length > 0) {
      result.warnings.push('SMS contains non-ASCII characters which may increase cost or cause delivery issues');
    }

    // Check for URLs
    const urlPattern = /https?:\/\/[^\s]+/g;
    const urls = content.match(urlPattern);
    if (urls && urls.length > 0) {
      result.warnings.push('SMS contains URLs which may be flagged by carriers');
    }

    // Check for multiple SMS parts
    if (result.smsCount > 1) {
      result.warnings.push(`Message will be sent as ${result.smsCount} SMS parts, increasing cost`);
    }

    return result;
  }

  /**
   * Get all available templates
   * @returns {Array} Array of all templates
   */
  getAllTemplates() {
    return Array.from(this.templates.values());
  }

  /**
   * Remove template
   * @param {string} templateId - Template ID to remove
   * @returns {boolean} Success status
   */
  removeTemplate(templateId) {
    const removed = this.templates.delete(templateId);
    if (removed) {
      this.clearTemplateCache(templateId);
      console.log(`📱 SMS template '${templateId}' removed`);
    }
    return removed;
  }
}

export default SMSTemplateEngine;