import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Email Template Validator
 * Provides comprehensive validation and testing utilities for email templates
 */
class EmailTemplateValidator {
  constructor() {
    this.validationRules = {
      // Content validation rules
      subject: { 
        required: true, 
        maxLength: 200, 
        minLength: 10,
        patterns: {
          noAllCaps: /^(?!.*[A-Z]{5,})/,
          noExcessivePunctuation: /^(?!.*[!?]{3,})/
        }
      },
      title: { 
        required: true, 
        maxLength: 100, 
        minLength: 5 
      },
      body: { 
        required: true, 
        maxLength: 50000, 
        minLength: 50 
      },
      htmlBody: { 
        maxLength: 100000,
        minLength: 100
      }
    };

    // HTML validation rules
    this.htmlRules = {
      requiredTags: ['html', 'head', 'body'],
      recommendedTags: ['title', 'meta'],
      problematicTags: ['script', 'iframe', 'object', 'embed', 'form'],
      requiredAttributes: {
        'meta[name="viewport"]': 'viewport meta tag for mobile responsiveness',
        'meta[charset]': 'character encoding declaration'
      }
    };

    // Accessibility rules
    this.accessibilityRules = {
      requiredAttributes: {
        'img': ['alt'],
        'a': ['href'],
        'table': ['role'],
        'input': ['type', 'id']
      },
      colorContrast: {
        minRatio: 4.5,
        largeTextRatio: 3.0
      }
    };

    // Email client compatibility rules
    this.compatibilityRules = {
      maxWidth: 600,
      supportedCss: [
        'background', 'background-color', 'border', 'border-radius',
        'color', 'font-family', 'font-size', 'font-weight',
        'margin', 'padding', 'text-align', 'text-decoration',
        'line-height', 'width', 'height'
      ],
      unsupportedCss: [
        'position', 'float', 'z-index', 'box-shadow', 'transform',
        'animation', 'transition', 'flexbox', 'grid'
      ]
    };
  }

  /**
   * Validate email template comprehensively
   * @param {Object} template - Template object to validate
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  async validateTemplate(template, options = {}) {
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: [],
      score: 100,
      details: {}
    };

    try {
      // Basic structure validation
      await this.validateBasicStructure(template, result);
      
      // Content validation
      await this.validateContent(template, result);
      
      // HTML validation
      if (template.htmlBody) {
        await this.validateHTML(template.htmlBody, result);
      }
      
      // Accessibility validation
      if (template.htmlBody && options.checkAccessibility !== false) {
        await this.validateAccessibility(template.htmlBody, result);
      }
      
      // Email client compatibility
      if (template.htmlBody && options.checkCompatibility !== false) {
        await this.validateCompatibility(template.htmlBody, result);
      }
      
      // Personalization validation
      await this.validatePersonalization(template, result);
      
      // Performance validation
      if (template.htmlBody) {
        await this.validatePerformance(template.htmlBody, result);
      }

      // Calculate final score
      result.score = this.calculateScore(result);
      result.isValid = result.errors.length === 0;

    } catch (error) {
      result.isValid = false;
      result.errors.push(`Validation failed: ${error.message}`);
      result.score = 0;
    }

    return result;
  }

  /**
   * Validate basic template structure
   * @param {Object} template - Template object
   * @param {Object} result - Validation result object
   */
  async validateBasicStructure(template, result) {
    if (!template) {
      result.errors.push('Template object is required');
      return;
    }

    // Check required fields
    const requiredFields = ['subject', 'title', 'body'];
    for (const field of requiredFields) {
      if (!template[field] || template[field].trim() === '') {
        result.errors.push(`${field} is required and cannot be empty`);
      }
    }

    // Check field lengths
    for (const [field, rules] of Object.entries(this.validationRules)) {
      const value = template[field];
      if (!value) continue;

      if (rules.maxLength && value.length > rules.maxLength) {
        result.errors.push(`${field} exceeds maximum length of ${rules.maxLength} characters`);
      }

      if (rules.minLength && value.length < rules.minLength) {
        result.warnings.push(`${field} is shorter than recommended minimum of ${rules.minLength} characters`);
      }

      // Pattern validation
      if (rules.patterns) {
        for (const [patternName, pattern] of Object.entries(rules.patterns)) {
          if (!pattern.test(value)) {
            result.warnings.push(`${field} fails ${patternName} validation`);
          }
        }
      }
    }
  }

  /**
   * Validate template content
   * @param {Object} template - Template object
   * @param {Object} result - Validation result object
   */
  async validateContent(template, result) {
    const content = template.htmlBody || template.body || '';
    
    // Check for spam trigger words
    const spamWords = [
      'free', 'urgent', 'act now', 'limited time', 'click here',
      'guarantee', 'no risk', 'winner', 'congratulations'
    ];
    
    const foundSpamWords = spamWords.filter(word => 
      content.toLowerCase().includes(word.toLowerCase())
    );
    
    if (foundSpamWords.length > 0) {
      result.warnings.push(`Potential spam trigger words found: ${foundSpamWords.join(', ')}`);
    }

    // Check for balanced content
    const textLength = this.extractTextContent(content).length;
    const htmlLength = content.length;
    const htmlRatio = (htmlLength - textLength) / htmlLength;
    
    if (htmlRatio > 0.7) {
      result.warnings.push('Template has high HTML-to-text ratio, may trigger spam filters');
    }

    // Check for proper call-to-action
    const ctaPatterns = [
      /href\s*=\s*["'][^"']*["']/gi,
      /button/gi,
      /click/gi,
      /view/gi,
      /download/gi
    ];
    
    const hasCallToAction = ctaPatterns.some(pattern => pattern.test(content));
    if (!hasCallToAction) {
      result.suggestions.push('Consider adding a clear call-to-action button or link');
    }
  }

  /**
   * Validate HTML structure and syntax
   * @param {string} html - HTML content
   * @param {Object} result - Validation result object
   */
  async validateHTML(html, result) {
    // Check for required HTML structure
    for (const tag of this.htmlRules.requiredTags) {
      if (!html.toLowerCase().includes(`<${tag}`)) {
        result.errors.push(`Missing required HTML tag: <${tag}>`);
      }
    }

    // Check for recommended tags
    for (const tag of this.htmlRules.recommendedTags) {
      if (!html.toLowerCase().includes(`<${tag}`)) {
        result.warnings.push(`Missing recommended HTML tag: <${tag}>`);
      }
    }

    // Check for problematic tags
    for (const tag of this.htmlRules.problematicTags) {
      if (html.toLowerCase().includes(`<${tag}`)) {
        result.errors.push(`Problematic tag found: <${tag}> (not supported in email clients)`);
      }
    }

    // Check for required attributes
    for (const [selector, description] of Object.entries(this.htmlRules.requiredAttributes)) {
      if (selector.includes('[') && !this.checkAttributePresence(html, selector)) {
        result.warnings.push(`Missing ${description}`);
      }
    }

    // Check for proper table structure (important for email layout)
    if (html.includes('<table')) {
      if (!html.includes('cellpadding') && !html.includes('cellspacing')) {
        result.suggestions.push('Consider adding cellpadding="0" cellspacing="0" to tables for consistent rendering');
      }
    }

    // Check for inline styles vs external CSS
    const hasExternalCSS = html.includes('<link') || html.includes('@import');
    const hasInlineStyles = html.includes('style=');
    
    if (hasExternalCSS && !hasInlineStyles) {
      result.warnings.push('External CSS may not work in all email clients, consider inline styles');
    }
  }

  /**
   * Validate accessibility compliance
   * @param {string} html - HTML content
   * @param {Object} result - Validation result object
   */
  async validateAccessibility(html, result) {
    // Check for alt attributes on images
    const imgTags = html.match(/<img[^>]*>/gi) || [];
    for (const img of imgTags) {
      if (!img.includes('alt=')) {
        result.errors.push('Image missing alt attribute for accessibility');
      }
    }

    // Check for proper heading structure
    const headings = html.match(/<h[1-6][^>]*>/gi) || [];
    if (headings.length === 0) {
      result.suggestions.push('Consider using heading tags (h1-h6) for better structure');
    }

    // Check for proper link text
    const links = html.match(/<a[^>]*>([^<]*)<\/a>/gi) || [];
    for (const link of links) {
      const linkText = link.replace(/<[^>]*>/g, '').trim();
      if (linkText.toLowerCase().includes('click here') || linkText.toLowerCase().includes('here')) {
        result.warnings.push('Avoid generic link text like "click here" for better accessibility');
      }
    }

    // Check for table headers
    if (html.includes('<table')) {
      if (!html.includes('<th')) {
        result.suggestions.push('Consider using table headers (<th>) for data tables');
      }
    }
  }

  /**
   * Validate email client compatibility
   * @param {string} html - HTML content
   * @param {Object} result - Validation result object
   */
  async validateCompatibility(html, result) {
    // Check for unsupported CSS properties
    for (const property of this.compatibilityRules.unsupportedCss) {
      if (html.includes(property + ':')) {
        result.warnings.push(`CSS property "${property}" may not be supported in all email clients`);
      }
    }

    // Check for responsive design
    if (!html.includes('max-width') && !html.includes('width: 100%')) {
      result.suggestions.push('Consider adding responsive design elements for mobile compatibility');
    }

    // Check for web fonts
    if (html.includes('@font-face') || html.includes('fonts.googleapis.com')) {
      result.warnings.push('Web fonts may not load in all email clients, provide fallbacks');
    }

    // Check for background images
    if (html.includes('background-image:')) {
      result.warnings.push('Background images may not display in all email clients');
    }

    // Check overall width
    const widthMatch = html.match(/width\s*:\s*(\d+)px/i);
    if (widthMatch && parseInt(widthMatch[1]) > this.compatibilityRules.maxWidth) {
      result.warnings.push(`Template width exceeds recommended maximum of ${this.compatibilityRules.maxWidth}px`);
    }
  }

  /**
   * Validate personalization placeholders
   * @param {Object} template - Template object
   * @param {Object} result - Validation result object
   */
  async validatePersonalization(template, result) {
    const content = template.htmlBody || template.body || '';
    const subject = template.subject || '';
    
    // Find all placeholders
    const placeholders = [...content.matchAll(/\{\{([^}]+)\}\}/g), ...subject.matchAll(/\{\{([^}]+)\}\}/g)];
    const uniquePlaceholders = [...new Set(placeholders.map(match => match[1].trim()))];
    
    if (uniquePlaceholders.length === 0) {
      result.suggestions.push('Consider adding personalization placeholders (e.g., {{firstName}})');
    }

    // Check for common required placeholders
    const recommendedPlaceholders = ['appName', 'supportEmail', 'currentYear'];
    for (const placeholder of recommendedPlaceholders) {
      if (!uniquePlaceholders.includes(placeholder)) {
        result.suggestions.push(`Consider adding {{${placeholder}}} placeholder`);
      }
    }

    // Check for potentially unsafe placeholders
    const unsafePlaceholders = uniquePlaceholders.filter(p => 
      p.includes('password') || p.includes('token') || p.includes('secret')
    );
    
    if (unsafePlaceholders.length > 0) {
      result.warnings.push(`Potentially unsafe placeholders found: ${unsafePlaceholders.join(', ')}`);
    }

    result.details.placeholders = uniquePlaceholders;
  }

  /**
   * Validate template performance
   * @param {string} html - HTML content
   * @param {Object} result - Validation result object
   */
  async validatePerformance(html, result) {
    // Check file size
    const sizeKB = Buffer.byteLength(html, 'utf8') / 1024;
    if (sizeKB > 100) {
      result.warnings.push(`Template size (${sizeKB.toFixed(1)}KB) is large, may cause loading issues`);
    }

    // Check for excessive inline styles
    const inlineStyleCount = (html.match(/style\s*=/gi) || []).length;
    if (inlineStyleCount > 50) {
      result.suggestions.push('Consider consolidating inline styles to reduce template size');
    }

    // Check for image optimization
    const images = html.match(/<img[^>]*src\s*=\s*["']([^"']+)["'][^>]*>/gi) || [];
    for (const img of images) {
      if (!img.includes('width=') || !img.includes('height=')) {
        result.suggestions.push('Specify image dimensions for better loading performance');
      }
    }

    result.details.performance = {
      sizeKB: Math.round(sizeKB * 10) / 10,
      inlineStyleCount,
      imageCount: images.length
    };
  }

  /**
   * Test template with sample data
   * @param {Object} template - Template object
   * @param {Object} sampleData - Sample data for testing
   * @returns {Object} Test result
   */
  async testTemplate(template, sampleData = {}) {
    const testResult = {
      success: true,
      rendered: null,
      validation: null,
      errors: [],
      warnings: []
    };

    try {
      // Validate template first
      testResult.validation = await this.validateTemplate(template);
      
      // Prepare test data
      const testData = {
        appName: 'Healthcare Platform',
        supportEmail: 'support@healthcare.com',
        currentYear: new Date().getFullYear(),
        currentDate: new Date().toLocaleDateString(),
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        ...sampleData
      };

      // Render template
      const rendered = {
        subject: this.interpolateString(template.subject || '', testData),
        title: this.interpolateString(template.title || '', testData),
        htmlBody: this.interpolateString(template.htmlBody || template.body || '', testData),
        textBody: this.htmlToText(template.htmlBody || template.body || '')
      };

      testResult.rendered = rendered;

      // Check for unresolved placeholders
      const unresolvedPlaceholders = this.findUnresolvedPlaceholders(rendered.htmlBody);
      if (unresolvedPlaceholders.length > 0) {
        testResult.warnings.push(`Unresolved placeholders: ${unresolvedPlaceholders.join(', ')}`);
      }

    } catch (error) {
      testResult.success = false;
      testResult.errors.push(`Template test failed: ${error.message}`);
    }

    return testResult;
  }

  /**
   * Generate comprehensive template report
   * @param {Object} template - Template object
   * @param {Object} options - Report options
   * @returns {Object} Detailed report
   */
  async generateReport(template, options = {}) {
    const report = {
      timestamp: new Date().toISOString(),
      template: {
        type: template.type || 'unknown',
        channel: 'email',
        userRole: template.userRole || 'unknown'
      },
      validation: await this.validateTemplate(template, options),
      test: await this.testTemplate(template, options.sampleData),
      recommendations: [],
      summary: {}
    };

    // Generate recommendations based on validation results
    report.recommendations = this.generateRecommendations(report.validation);
    
    // Generate summary
    report.summary = {
      overallScore: report.validation.score,
      isProduction: report.validation.errors.length === 0,
      needsImprovement: report.validation.warnings.length > 0,
      criticalIssues: report.validation.errors.length,
      warnings: report.validation.warnings.length,
      suggestions: report.validation.suggestions.length
    };

    return report;
  }

  /**
   * Helper method to interpolate string with data
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
   * Extract text content from HTML
   * @param {string} html - HTML string
   * @returns {string} Text content
   */
  extractTextContent(html) {
    return this.htmlToText(html);
  }

  /**
   * Check if attribute is present in HTML
   * @param {string} html - HTML string
   * @param {string} selector - CSS selector
   * @returns {boolean} Whether attribute is present
   */
  checkAttributePresence(html, selector) {
    // Simple check for meta viewport
    if (selector.includes('viewport')) {
      return html.toLowerCase().includes('viewport');
    }
    if (selector.includes('charset')) {
      return html.toLowerCase().includes('charset');
    }
    return false;
  }

  /**
   * Find unresolved placeholders in rendered content
   * @param {string} content - Rendered content
   * @returns {Array} Array of unresolved placeholders
   */
  findUnresolvedPlaceholders(content) {
    const matches = content.match(/\{\{([^}]+)\}\}/g) || [];
    return [...new Set(matches)];
  }

  /**
   * Calculate validation score
   * @param {Object} result - Validation result
   * @returns {number} Score (0-100)
   */
  calculateScore(result) {
    let score = 100;
    
    // Deduct points for errors (critical issues)
    score -= result.errors.length * 20;
    
    // Deduct points for warnings (moderate issues)
    score -= result.warnings.length * 5;
    
    // Deduct points for suggestions (minor improvements)
    score -= result.suggestions.length * 2;
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate recommendations based on validation results
   * @param {Object} validation - Validation result
   * @returns {Array} Array of recommendations
   */
  generateRecommendations(validation) {
    const recommendations = [];
    
    if (validation.errors.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'errors',
        message: 'Fix critical errors before using in production',
        items: validation.errors
      });
    }
    
    if (validation.warnings.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'warnings',
        message: 'Address warnings to improve template quality',
        items: validation.warnings
      });
    }
    
    if (validation.suggestions.length > 0) {
      recommendations.push({
        priority: 'low',
        category: 'suggestions',
        message: 'Consider implementing suggestions for better user experience',
        items: validation.suggestions
      });
    }
    
    return recommendations;
  }
}

export { EmailTemplateValidator };
export default EmailTemplateValidator;