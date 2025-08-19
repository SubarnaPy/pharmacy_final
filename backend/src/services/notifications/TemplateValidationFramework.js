/**
 * Template Validation Framework
 * Comprehensive validation system for notification templates
 */
class TemplateValidationFramework {
  constructor(options = {}) {
    this.validationRules = new Map();
    this.customValidators = new Map();
    this.securityRules = new Map();
    
    // Initialize default validation rules
    this.initializeDefaultRules();
    this.initializeSecurityRules();
    
    console.log('✅ Template Validation Framework initialized');
  }

  /**
   * Initialize default validation rules
   */
  initializeDefaultRules() {
    // Field validation rules
    this.validationRules.set('name', {
      required: true,
      minLength: 3,
      maxLength: 100,
      pattern: /^[a-zA-Z0-9\s\-_]+$/,
      message: 'Name must be 3-100 characters, alphanumeric with spaces, hyphens, and underscores'
    });

    this.validationRules.set('type', {
      required: true,
      enum: [
        'prescription_created', 'prescription_updated', 'prescription_ready', 'prescription_review_required',
        'order_placed', 'order_confirmed', 'order_ready', 'order_delivered', 'order_cancelled',
        'appointment_scheduled', 'appointment_reminder', 'appointment_cancelled', 'appointment_completed',
        'payment_successful', 'payment_failed', 'payment_refunded',
        'inventory_low_stock', 'inventory_expired', 'inventory_near_expiry',
        'user_registered', 'user_verified', 'password_reset', 'security_alert',
        'system_maintenance', 'system_update', 'system_alert',
        'consultation_scheduled', 'consultation_reminder', 'consultation_completed',
        'profile_updated', 'document_uploaded', 'verification_required'
      ],
      message: 'Invalid notification type'
    });

    this.validationRules.set('category', {
      required: true,
      enum: ['medical', 'administrative', 'system', 'marketing'],
      message: 'Category must be one of: medical, administrative, system, marketing'
    });

    this.validationRules.set('subject', {
      required: true,
      minLength: 5,
      maxLength: 200,
      message: 'Subject must be 5-200 characters'
    });

    this.validationRules.set('title', {
      required: true,
      minLength: 3,
      maxLength: 100,
      message: 'Title must be 3-100 characters'
    });

    this.validationRules.set('body', {
      required: true,
      minLength: 10,
      maxLength: 10000,
      message: 'Body must be 10-10000 characters'
    });

    this.validationRules.set('htmlBody', {
      maxLength: 50000,
      message: 'HTML body must not exceed 50000 characters'
    });

    // Channel-specific rules
    this.validationRules.set('sms_body', {
      required: true,
      maxLength: 160,
      message: 'SMS body must not exceed 160 characters'
    });

    this.validationRules.set('email_subject', {
      required: true,
      maxLength: 78, // RFC 2822 recommendation
      message: 'Email subject should not exceed 78 characters for best compatibility'
    });
  }

  /**
   * Initialize security validation rules
   */
  initializeSecurityRules() {
    // XSS prevention patterns
    this.securityRules.set('xss_patterns', [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi,
      /<object[^>]*>.*?<\/object>/gi,
      /<embed[^>]*>.*?<\/embed>/gi,
      /<form[^>]*>.*?<\/form>/gi
    ]);

    // SQL injection patterns (for dynamic content)
    this.securityRules.set('sql_patterns', [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
      /(--|\/\*|\*\/)/g
    ]);

    // Sensitive data patterns
    this.securityRules.set('sensitive_patterns', [
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, // Credit card
      /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g // Email (in templates)
    ]);
  }

  /**
   * Validate complete template data
   * @param {Object} templateData - Template data to validate
   * @returns {Object} Validation result
   */
  async validateTemplate(templateData) {
    const errors = [];
    const warnings = [];
    const securityIssues = [];

    try {
      // Basic structure validation
      if (!templateData || typeof templateData !== 'object') {
        return {
          isValid: false,
          errors: ['Template data must be a valid object'],
          warnings: [],
          securityIssues: []
        };
      }

      // Validate required top-level fields
      await this.validateField('name', templateData.name, errors, warnings);
      await this.validateField('type', templateData.type, errors, warnings);
      await this.validateField('category', templateData.category, errors, warnings);

      // Validate variants
      if (!templateData.variants || !Array.isArray(templateData.variants)) {
        errors.push('Variants array is required');
      } else if (templateData.variants.length === 0) {
        errors.push('At least one template variant is required');
      } else {
        for (let i = 0; i < templateData.variants.length; i++) {
          const variantResult = await this.validateVariant(templateData.variants[i], i);
          errors.push(...variantResult.errors);
          warnings.push(...variantResult.warnings);
          securityIssues.push(...variantResult.securityIssues);
        }
      }

      // Business logic validation
      const businessValidation = await this.validateBusinessLogic(templateData);
      errors.push(...businessValidation.errors);
      warnings.push(...businessValidation.warnings);

      // Security validation
      const securityValidation = await this.validateSecurity(templateData);
      securityIssues.push(...securityValidation.issues);

      return {
        isValid: errors.length === 0 && securityIssues.length === 0,
        errors,
        warnings,
        securityIssues
      };

    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation failed: ${error.message}`],
        warnings: [],
        securityIssues: []
      };
    }
  }

  /**
   * Validate a single template variant
   * @param {Object} variant - Template variant
   * @param {number} index - Variant index
   * @returns {Object} Validation result
   */
  async validateVariant(variant, index) {
    const errors = [];
    const warnings = [];
    const securityIssues = [];

    if (!variant || typeof variant !== 'object') {
      errors.push(`Variant ${index + 1}: Must be a valid object`);
      return { errors, warnings, securityIssues };
    }

    // Required fields
    const requiredFields = ['channel', 'userRole', 'title', 'body'];
    for (const field of requiredFields) {
      if (!variant[field] || (typeof variant[field] === 'string' && variant[field].trim() === '')) {
        errors.push(`Variant ${index + 1}: ${field} is required`);
      }
    }

    // Channel validation
    if (variant.channel) {
      const channelValidation = await this.validateChannel(variant, index);
      errors.push(...channelValidation.errors);
      warnings.push(...channelValidation.warnings);
    }

    // User role validation
    if (variant.userRole && !['patient', 'doctor', 'pharmacy', 'admin'].includes(variant.userRole)) {
      errors.push(`Variant ${index + 1}: Invalid user role`);
    }

    // Language validation
    if (variant.language && !/^[a-z]{2}(-[A-Z]{2})?$/.test(variant.language)) {
      warnings.push(`Variant ${index + 1}: Language code should follow ISO 639-1 format (e.g., 'en', 'en-US')`);
    }

    // Content validation
    await this.validateField('title', variant.title, errors, warnings, `Variant ${index + 1}: `);
    await this.validateField('body', variant.body, errors, warnings, `Variant ${index + 1}: `);

    if (variant.subject) {
      await this.validateField('subject', variant.subject, errors, warnings, `Variant ${index + 1}: `);
    }

    if (variant.htmlBody) {
      await this.validateField('htmlBody', variant.htmlBody, errors, warnings, `Variant ${index + 1}: `);
      
      // HTML-specific validation
      const htmlValidation = await this.validateHTML(variant.htmlBody, index);
      errors.push(...htmlValidation.errors);
      warnings.push(...htmlValidation.warnings);
      securityIssues.push(...htmlValidation.securityIssues);
    }

    // Actions validation
    if (variant.actions && Array.isArray(variant.actions)) {
      for (let i = 0; i < variant.actions.length; i++) {
        const actionValidation = await this.validateAction(variant.actions[i], index, i);
        errors.push(...actionValidation.errors);
        warnings.push(...actionValidation.warnings);
      }
    }

    return { errors, warnings, securityIssues };
  }

  /**
   * Validate channel-specific requirements
   * @param {Object} variant - Template variant
   * @param {number} index - Variant index
   * @returns {Object} Validation result
   */
  async validateChannel(variant, index) {
    const errors = [];
    const warnings = [];

    switch (variant.channel) {
      case 'email':
        if (!variant.subject) {
          errors.push(`Variant ${index + 1}: Email templates require a subject`);
        }
        if (variant.subject && variant.subject.length > 78) {
          warnings.push(`Variant ${index + 1}: Email subject exceeds recommended length of 78 characters`);
        }
        if (!variant.htmlBody && variant.body) {
          warnings.push(`Variant ${index + 1}: Consider providing HTML version for better email rendering`);
        }
        break;

      case 'sms':
        if (variant.body && variant.body.length > 160) {
          errors.push(`Variant ${index + 1}: SMS body exceeds 160 character limit`);
        }
        if (variant.htmlBody) {
          warnings.push(`Variant ${index + 1}: HTML body is not applicable for SMS`);
        }
        break;

      case 'websocket':
        if (variant.subject) {
          warnings.push(`Variant ${index + 1}: Subject is not typically used for websocket notifications`);
        }
        break;

      default:
        errors.push(`Variant ${index + 1}: Invalid channel '${variant.channel}'`);
    }

    return { errors, warnings };
  }

  /**
   * Validate HTML content
   * @param {string} html - HTML content
   * @param {number} variantIndex - Variant index
   * @returns {Object} Validation result
   */
  async validateHTML(html, variantIndex) {
    const errors = [];
    const warnings = [];
    const securityIssues = [];

    if (!html || typeof html !== 'string') {
      return { errors, warnings, securityIssues };
    }

    // Security validation
    const xssPatterns = this.securityRules.get('xss_patterns');
    for (const pattern of xssPatterns) {
      if (pattern.test(html)) {
        securityIssues.push(`Variant ${variantIndex + 1}: Potentially dangerous HTML content detected`);
      }
    }

    // Structure validation
    if (!html.includes('<html') && !html.includes('<body') && html.includes('<')) {
      warnings.push(`Variant ${variantIndex + 1}: Consider using proper HTML document structure`);
    }

    // Accessibility validation
    if (html.includes('<img') && !html.includes('alt=')) {
      warnings.push(`Variant ${variantIndex + 1}: Images should include alt attributes for accessibility`);
    }

    // Email client compatibility
    if (html.includes('<link') && html.includes('rel="stylesheet"')) {
      warnings.push(`Variant ${variantIndex + 1}: External stylesheets may not work in all email clients`);
    }

    // Table-based layout check for emails
    if (!html.includes('<table') && html.includes('<div') && html.length > 1000) {
      warnings.push(`Variant ${variantIndex + 1}: Consider using table-based layout for better email client compatibility`);
    }

    return { errors, warnings, securityIssues };
  }

  /**
   * Validate action buttons
   * @param {Object} action - Action object
   * @param {number} variantIndex - Variant index
   * @param {number} actionIndex - Action index
   * @returns {Object} Validation result
   */
  async validateAction(action, variantIndex, actionIndex) {
    const errors = [];
    const warnings = [];

    if (!action || typeof action !== 'object') {
      errors.push(`Variant ${variantIndex + 1}, Action ${actionIndex + 1}: Must be a valid object`);
      return { errors, warnings };
    }

    // Required fields
    if (!action.text || action.text.trim() === '') {
      errors.push(`Variant ${variantIndex + 1}, Action ${actionIndex + 1}: Text is required`);
    }

    if (!action.url || action.url.trim() === '') {
      errors.push(`Variant ${variantIndex + 1}, Action ${actionIndex + 1}: URL is required`);
    }

    // URL validation
    if (action.url) {
      try {
        new URL(action.url);
      } catch {
        // Check if it's a relative URL or template variable
        if (!action.url.startsWith('/') && !action.url.includes('{{')) {
          errors.push(`Variant ${variantIndex + 1}, Action ${actionIndex + 1}: Invalid URL format`);
        }
      }
    }

    // Style validation
    if (action.style && !['primary', 'secondary', 'danger'].includes(action.style)) {
      errors.push(`Variant ${variantIndex + 1}, Action ${actionIndex + 1}: Invalid style`);
    }

    // Text length validation
    if (action.text && action.text.length > 50) {
      warnings.push(`Variant ${variantIndex + 1}, Action ${actionIndex + 1}: Action text is quite long, consider shortening`);
    }

    return { errors, warnings };
  }

  /**
   * Validate business logic rules
   * @param {Object} templateData - Template data
   * @returns {Object} Validation result
   */
  async validateBusinessLogic(templateData) {
    const errors = [];
    const warnings = [];

    // Check for duplicate variants
    if (templateData.variants) {
      const variantKeys = templateData.variants.map(v => 
        `${v.channel}_${v.userRole}_${v.language || 'en'}`
      );
      const uniqueKeys = [...new Set(variantKeys)];
      
      if (variantKeys.length !== uniqueKeys.length) {
        errors.push('Duplicate variants detected (same channel, role, and language combination)');
      }
    }

    // Category-specific validation
    if (templateData.category === 'medical' && templateData.variants) {
      const hasPatientVariant = templateData.variants.some(v => v.userRole === 'patient');
      if (!hasPatientVariant) {
        warnings.push('Medical notifications typically should include a patient variant');
      }
    }

    // Type-specific validation
    if (templateData.type && templateData.type.includes('prescription') && templateData.variants) {
      const hasPharmacyVariant = templateData.variants.some(v => v.userRole === 'pharmacy');
      if (!hasPharmacyVariant) {
        warnings.push('Prescription notifications typically should include a pharmacy variant');
      }
    }

    return { errors, warnings };
  }

  /**
   * Validate security aspects
   * @param {Object} templateData - Template data
   * @returns {Object} Validation result
   */
  async validateSecurity(templateData) {
    const issues = [];

    // Check all text content for security issues
    const textFields = this.extractAllTextContent(templateData);
    
    for (const field of textFields) {
      // Check for SQL injection patterns
      const sqlPatterns = this.securityRules.get('sql_patterns');
      for (const pattern of sqlPatterns) {
        if (pattern.test(field.content)) {
          issues.push(`${field.location}: Potential SQL injection pattern detected`);
        }
      }

      // Check for sensitive data patterns
      const sensitivePatterns = this.securityRules.get('sensitive_patterns');
      for (const pattern of sensitivePatterns) {
        if (pattern.test(field.content)) {
          issues.push(`${field.location}: Potential sensitive data detected`);
        }
      }
    }

    return { issues };
  }

  /**
   * Validate a single field against rules
   * @param {string} fieldName - Field name
   * @param {any} value - Field value
   * @param {Array} errors - Errors array
   * @param {Array} warnings - Warnings array
   * @param {string} prefix - Error message prefix
   */
  async validateField(fieldName, value, errors, warnings, prefix = '') {
    const rules = this.validationRules.get(fieldName);
    if (!rules) return;

    // Required validation
    if (rules.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      errors.push(`${prefix}${fieldName} is required`);
      return;
    }

    // Skip other validations if value is empty and not required
    if (!value) return;

    // Type validation
    if (rules.type && typeof value !== rules.type) {
      errors.push(`${prefix}${fieldName} must be of type ${rules.type}`);
      return;
    }

    // String-specific validations
    if (typeof value === 'string') {
      // Length validations
      if (rules.minLength && value.length < rules.minLength) {
        errors.push(`${prefix}${fieldName} must be at least ${rules.minLength} characters`);
      }
      
      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push(`${prefix}${fieldName} must not exceed ${rules.maxLength} characters`);
      }

      // Pattern validation
      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push(`${prefix}${rules.message || `${fieldName} format is invalid`}`);
      }

      // Enum validation
      if (rules.enum && !rules.enum.includes(value)) {
        errors.push(`${prefix}${rules.message || `${fieldName} must be one of: ${rules.enum.join(', ')}`}`);
      }
    }

    // Custom validator
    if (this.customValidators.has(fieldName)) {
      const customValidator = this.customValidators.get(fieldName);
      const customResult = await customValidator(value, prefix);
      if (customResult.errors) errors.push(...customResult.errors);
      if (customResult.warnings) warnings.push(...customResult.warnings);
    }
  }

  /**
   * Extract all text content from template for security scanning
   * @param {Object} templateData - Template data
   * @returns {Array} Array of text content with locations
   */
  extractAllTextContent(templateData) {
    const textFields = [];

    if (templateData.name) {
      textFields.push({ location: 'name', content: templateData.name });
    }

    if (templateData.variants) {
      templateData.variants.forEach((variant, index) => {
        const prefix = `Variant ${index + 1}`;
        
        if (variant.subject) {
          textFields.push({ location: `${prefix} subject`, content: variant.subject });
        }
        if (variant.title) {
          textFields.push({ location: `${prefix} title`, content: variant.title });
        }
        if (variant.body) {
          textFields.push({ location: `${prefix} body`, content: variant.body });
        }
        if (variant.htmlBody) {
          textFields.push({ location: `${prefix} htmlBody`, content: variant.htmlBody });
        }

        if (variant.actions) {
          variant.actions.forEach((action, actionIndex) => {
            if (action.text) {
              textFields.push({ 
                location: `${prefix} Action ${actionIndex + 1} text`, 
                content: action.text 
              });
            }
            if (action.url) {
              textFields.push({ 
                location: `${prefix} Action ${actionIndex + 1} url`, 
                content: action.url 
              });
            }
          });
        }
      });
    }

    return textFields;
  }

  /**
   * Add custom validator for a field
   * @param {string} fieldName - Field name
   * @param {Function} validator - Validator function
   */
  addCustomValidator(fieldName, validator) {
    this.customValidators.set(fieldName, validator);
  }

  /**
   * Add custom validation rule
   * @param {string} fieldName - Field name
   * @param {Object} rule - Validation rule
   */
  addValidationRule(fieldName, rule) {
    this.validationRules.set(fieldName, rule);
  }

  /**
   * Get validation summary for a template
   * @param {Object} templateData - Template data
   * @returns {Object} Validation summary
   */
  async getValidationSummary(templateData) {
    const result = await this.validateTemplate(templateData);
    
    return {
      isValid: result.isValid,
      score: this.calculateValidationScore(result),
      summary: {
        totalErrors: result.errors.length,
        totalWarnings: result.warnings.length,
        totalSecurityIssues: result.securityIssues.length,
        criticalIssues: result.errors.length + result.securityIssues.length
      },
      recommendations: this.generateRecommendations(result)
    };
  }

  /**
   * Calculate validation score (0-100)
   * @param {Object} validationResult - Validation result
   * @returns {number} Score
   */
  calculateValidationScore(validationResult) {
    let score = 100;
    
    // Deduct points for errors (critical)
    score -= validationResult.errors.length * 20;
    
    // Deduct points for security issues (critical)
    score -= validationResult.securityIssues.length * 25;
    
    // Deduct points for warnings (minor)
    score -= validationResult.warnings.length * 5;
    
    return Math.max(0, score);
  }

  /**
   * Generate recommendations based on validation results
   * @param {Object} validationResult - Validation result
   * @returns {Array} Recommendations
   */
  generateRecommendations(validationResult) {
    const recommendations = [];

    if (validationResult.errors.length > 0) {
      recommendations.push('Fix all validation errors before using this template');
    }

    if (validationResult.securityIssues.length > 0) {
      recommendations.push('Address security issues immediately - template may be unsafe');
    }

    if (validationResult.warnings.length > 5) {
      recommendations.push('Consider addressing warnings to improve template quality');
    }

    // Add specific recommendations based on common issues
    const allIssues = [...validationResult.errors, ...validationResult.warnings];
    
    if (allIssues.some(issue => issue.includes('HTML'))) {
      recommendations.push('Review HTML structure and consider email client compatibility');
    }

    if (allIssues.some(issue => issue.includes('accessibility'))) {
      recommendations.push('Improve accessibility by adding alt text and proper markup');
    }

    if (allIssues.some(issue => issue.includes('length'))) {
      recommendations.push('Review content length to ensure optimal user experience');
    }

    return recommendations;
  }
}

export { TemplateValidationFramework };
export default TemplateValidationFramework;