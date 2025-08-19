import { jest } from '@jest/globals';
import SMSTemplateEngine from './SMSTemplateEngine.js';

describe('SMSTemplateEngine', () => {
  let templateEngine;

  beforeEach(() => {
    templateEngine = new SMSTemplateEngine();
  });

  describe('Initialization', () => {
    test('should initialize with default templates', () => {
      expect(templateEngine.templates.size).toBeGreaterThan(0);
      expect(templateEngine.getTemplate('user_registered')).toBeDefined();
      expect(templateEngine.getTemplate('appointment_reminder')).toBeDefined();
      expect(templateEngine.getTemplate('prescription_created')).toBeDefined();
    });

    test('should initialize with custom options', () => {
      const customEngine = new SMSTemplateEngine({
        maxSMSLength: 140,
        cacheTimeout: 1800000
      });
      
      expect(customEngine.maxSMSLength).toBe(140);
      expect(customEngine.cacheTimeout).toBe(1800000);
    });
  });

  describe('Template Management', () => {
    test('should add new template successfully', () => {
      const template = {
        id: 'test_template',
        name: 'Test Template',
        category: 'test',
        priority: 'medium',
        template: 'Hello {{name}}, this is a test message.',
        variables: ['name'],
        maxLength: 160
      };

      const result = templateEngine.addTemplate(template);
      
      expect(result).toBe(true);
      expect(templateEngine.getTemplate('test_template')).toEqual(template);
    });

    test('should reject invalid template', () => {
      const invalidTemplate = {
        id: 'invalid_template',
        // Missing required fields
        category: 'test'
      };

      const result = templateEngine.addTemplate(invalidTemplate);
      
      expect(result).toBe(false);
      expect(templateEngine.getTemplate('invalid_template')).toBeNull();
    });

    test('should validate template syntax', () => {
      expect(templateEngine.validateTemplateSyntax('Hello {{name}}')).toBe(true);
      expect(templateEngine.validateTemplateSyntax('{{#if condition}}text{{/if}}')).toBe(true);
      expect(templateEngine.validateTemplateSyntax('Hello {{name')).toBe(false); // Unbalanced braces
      expect(templateEngine.validateTemplateSyntax('{{#if condition}}text')).toBe(false); // Missing endif
    });

    test('should get templates by category', () => {
      const medicalTemplates = templateEngine.getTemplatesByCategory('medical');
      
      expect(medicalTemplates.length).toBeGreaterThan(0);
      expect(medicalTemplates.every(t => t.category === 'medical')).toBe(true);
    });

    test('should remove template', () => {
      const templateId = 'user_registered';
      
      expect(templateEngine.getTemplate(templateId)).toBeDefined();
      
      const result = templateEngine.removeTemplate(templateId);
      
      expect(result).toBe(true);
      expect(templateEngine.getTemplate(templateId)).toBeNull();
    });
  });

  describe('Template Rendering', () => {
    test('should render simple template with variables', () => {
      const result = templateEngine.renderTemplate('user_registered', {
        platformName: 'HealthCare Platform'
      });

      expect(result.templateId).toBe('user_registered');
      expect(result.optimizedText).toContain('HealthCare Platform');
      expect(result.length).toBeGreaterThan(0);
      expect(result.smsCount).toBe(1);
    });

    test('should render template with conditional blocks', () => {
      const result = templateEngine.renderTemplate('user_registered', {
        platformName: 'HealthCare Platform',
        verificationRequired: true
      });

      expect(result.optimizedText).toContain('Please verify your account');
    });

    test('should handle missing template', () => {
      expect(() => {
        templateEngine.renderTemplate('non_existent_template', {});
      }).toThrow('Template \'non_existent_template\' not found');
    });

    test('should handle missing variables gracefully', () => {
      const result = templateEngine.renderTemplate('user_registered', {
        // Missing platformName
      });

      expect(result.optimizedText).toBeDefined();
      expect(result.optimizedText).not.toContain('{{platformName}}');
    });

    test('should process nested object variables', () => {
      const template = {
        id: 'nested_test',
        name: 'Nested Test',
        category: 'test',
        priority: 'medium',
        template: 'Hello {{user.name}}, your order {{order.id}} is ready.',
        variables: ['user.name', 'order.id']
      };

      templateEngine.addTemplate(template);

      const result = templateEngine.renderTemplate('nested_test', {
        user: { name: 'John Doe' },
        order: { id: 'ORD123' }
      });

      expect(result.optimizedText).toBe('Hello John Doe, your order ORD123 is ready.');
    });
  });

  describe('Message Optimization', () => {
    test('should keep short messages unchanged', () => {
      const shortMessage = 'Short message';
      const result = templateEngine.optimizeForSMS(shortMessage);

      expect(result.text).toBe(shortMessage);
      expect(result.truncated).toBe(false);
    });

    test('should truncate long messages at word boundary', () => {
      const longMessage = 'This is a very long message that exceeds the SMS character limit and should be truncated at a word boundary to maintain readability.';
      const result = templateEngine.optimizeForSMS(longMessage, 100);

      expect(result.text.length).toBeLessThanOrEqual(100);
      expect(result.text.endsWith('...')).toBe(true);
      expect(result.truncated).toBe(true);
    });

    test('should hard truncate when no good word boundary exists', () => {
      const longMessage = 'Thisisaverylongmessagewithoutanyspacesorwordboundariesthatexceedsthesmslimitandneedstobehardtruncated';
      const result = templateEngine.optimizeForSMS(longMessage, 50);

      expect(result.text.length).toBe(50);
      expect(result.text.endsWith('...')).toBe(true);
      expect(result.truncated).toBe(true);
    });
  });

  describe('SMS Count Calculation', () => {
    test('should calculate single SMS correctly', () => {
      expect(templateEngine.calculateSMSCount('')).toBe(0);
      expect(templateEngine.calculateSMSCount('Short message')).toBe(1);
      expect(templateEngine.calculateSMSCount('A'.repeat(160))).toBe(1);
    });

    test('should calculate multiple SMS parts correctly', () => {
      expect(templateEngine.calculateSMSCount('A'.repeat(161))).toBe(2);
      expect(templateEngine.calculateSMSCount('A'.repeat(306))).toBe(2);
      expect(templateEngine.calculateSMSCount('A'.repeat(307))).toBe(3);
    });
  });

  describe('Content Validation', () => {
    test('should validate normal SMS content', () => {
      const result = templateEngine.validateSMSContent('Hello, this is a normal SMS message.');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.length).toBe(38);
      expect(result.smsCount).toBe(1);
    });

    test('should reject empty content', () => {
      const result = templateEngine.validateSMSContent('');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('SMS content cannot be empty');
    });

    test('should reject excessively long content', () => {
      const longContent = 'A'.repeat(2000);
      const result = templateEngine.validateSMSContent(longContent);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('exceeds maximum length'))).toBe(true);
    });

    test('should warn about non-ASCII characters', () => {
      const result = templateEngine.validateSMSContent('Hello 🎉 emoji message');

      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes('non-ASCII characters'))).toBe(true);
    });

    test('should warn about URLs', () => {
      const result = templateEngine.validateSMSContent('Check out https://example.com for more info');

      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes('URLs'))).toBe(true);
    });

    test('should warn about multiple SMS parts', () => {
      const longMessage = 'A'.repeat(200);
      const result = templateEngine.validateSMSContent(longMessage);

      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes('SMS parts'))).toBe(true);
    });
  });

  describe('Caching', () => {
    test('should cache rendered templates', () => {
      const templateData = { platformName: 'Test Platform' };
      
      // First render
      const result1 = templateEngine.renderTemplate('user_registered', templateData);
      
      // Second render should use cache
      const result2 = templateEngine.renderTemplate('user_registered', templateData);
      
      expect(result1).toEqual(result2);
      expect(templateEngine.templateCache.size).toBeGreaterThan(0);
    });

    test('should clear template cache', () => {
      // Render a template to populate cache
      templateEngine.renderTemplate('user_registered', { platformName: 'Test' });
      
      expect(templateEngine.templateCache.size).toBeGreaterThan(0);
      
      templateEngine.clearTemplateCache();
      
      expect(templateEngine.templateCache.size).toBe(0);
    });

    test('should clear cache for specific template', () => {
      // Render multiple templates
      templateEngine.renderTemplate('user_registered', { platformName: 'Test' });
      templateEngine.renderTemplate('password_reset', { resetCode: '123456' });
      
      const initialCacheSize = templateEngine.templateCache.size;
      
      templateEngine.clearTemplateCache('user_registered');
      
      expect(templateEngine.templateCache.size).toBeLessThan(initialCacheSize);
    });
  });

  describe('Statistics', () => {
    test('should provide template statistics', () => {
      const stats = templateEngine.getStats();

      expect(stats.totalTemplates).toBeGreaterThan(0);
      expect(stats.categories).toBeDefined();
      expect(stats.priorities).toBeDefined();
      expect(stats.categories.medical).toBeGreaterThan(0);
      expect(stats.priorities.high).toBeGreaterThan(0);
    });
  });

  describe('Template Processing', () => {
    test('should process handlebars-like syntax correctly', () => {
      const template = 'Hello {{name}}, {{#if urgent}}URGENT: {{/if}}Your appointment is {{status}}.';
      
      const result1 = templateEngine.processTemplate(template, {
        name: 'John',
        urgent: true,
        status: 'confirmed'
      });
      
      expect(result1).toBe('Hello John, URGENT: Your appointment is confirmed.');
      
      const result2 = templateEngine.processTemplate(template, {
        name: 'Jane',
        urgent: false,
        status: 'pending'
      });
      
      expect(result2).toBe('Hello Jane, Your appointment is pending.');
    });

    test('should handle nested conditionals', () => {
      const template = '{{#if user}}Hello {{user.name}}{{#if user.premium}}, Premium Member{{/if}}{{/if}}';
      
      const result = templateEngine.processTemplate(template, {
        user: {
          name: 'John',
          premium: true
        }
      });
      
      expect(result).toBe('Hello John, Premium Member');
    });
  });

  describe('Error Handling', () => {
    test('should handle template rendering errors gracefully', () => {
      // Create a template with invalid syntax that passes basic validation
      const badTemplate = {
        id: 'bad_template',
        name: 'Bad Template',
        category: 'test',
        priority: 'medium',
        template: 'Hello {{name}}'
      };
      
      templateEngine.addTemplate(badTemplate);
      
      // Should not throw, but handle gracefully
      expect(() => {
        templateEngine.renderTemplate('bad_template', { name: 'Test' });
      }).not.toThrow();
    });

    test('should handle missing nested properties', () => {
      const template = 'Hello {{user.profile.name}}';
      
      const result = templateEngine.processTemplate(template, {
        user: {} // Missing profile
      });
      
      expect(result).toBe('Hello ');
    });
  });
});