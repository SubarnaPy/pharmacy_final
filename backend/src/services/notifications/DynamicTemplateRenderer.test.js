import { jest } from '@jest/globals';
import DynamicTemplateRenderer from './DynamicTemplateRenderer.js';

// Mock dependencies
jest.mock('./TemplateManagementService.js');
jest.mock('./TemplatePerformanceMonitor.js');

describe('DynamicTemplateRenderer', () => {
  let renderer;
  let mockTemplateManager;
  let mockPerformanceMonitor;

  beforeEach(() => {
    // Create mocks
    mockTemplateManager = {
      getTemplate: jest.fn()
    };
    
    mockPerformanceMonitor = {
      recordRenderingPerformance: jest.fn()
    };

    // Create renderer with mocked dependencies
    renderer = new DynamicTemplateRenderer({
      cacheEnabled: true,
      cacheMaxSize: 100,
      cacheTTL: 60000
    });
    
    renderer.templateManager = mockTemplateManager;
    renderer.performanceMonitor = mockPerformanceMonitor;
  });

  describe('renderTemplate', () => {
    const mockTemplate = {
      _id: 'template123',
      version: '1.0.0',
      type: 'prescription_created'
    };

    const mockVariant = {
      channel: 'email',
      userRole: 'patient',
      language: 'en',
      subject: 'Your prescription is ready, {{firstName}}!',
      title: 'Prescription Ready',
      body: 'Hello {{firstName}}, your prescription for {{medicationName}} is ready for pickup.',
      htmlBody: '<h1>Prescription Ready</h1><p>Hello {{firstName}}, your prescription for {{medicationName}} is ready.</p>',
      actions: [{
        text: 'View Details',
        url: '/prescriptions/{{prescriptionId}}',
        style: 'primary'
      }]
    };

    beforeEach(() => {
      mockTemplateManager.getTemplate.mockResolvedValue({
        template: mockTemplate,
        variant: mockVariant
      });
    });

    it('should render template with personalization', async () => {
      const renderRequest = {
        templateType: 'prescription_created',
        channel: 'email',
        userRole: 'patient',
        userId: 'user123',
        language: 'en',
        data: {
          firstName: 'John',
          medicationName: 'Aspirin',
          prescriptionId: 'rx123'
        },
        context: {
          user: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com'
          }
        }
      };

      const result = await renderer.renderTemplate(renderRequest);

      expect(result).toBeDefined();
      expect(result.templateId).toBe('template123');
      expect(result.content.subject).toBe('Your prescription is ready, John!');
      expect(result.content.body).toContain('Hello John, your prescription for Aspirin is ready');
      expect(result.content.actions[0].url).toBe('/prescriptions/rx123');
      expect(result.metadata.personalized).toBe(true);
    });

    it('should handle missing data gracefully', async () => {
      const renderRequest = {
        templateType: 'prescription_created',
        channel: 'email',
        userRole: 'patient',
        userId: 'user123',
        data: {
          firstName: 'John'
          // Missing medicationName and prescriptionId
        },
        context: {}
      };

      const result = await renderer.renderTemplate(renderRequest);

      expect(result.content.body).toContain('Hello John, your prescription for  is ready');
      expect(result.content.actions[0].url).toBe('/prescriptions/');
    });

    it('should use cache when available', async () => {
      const renderRequest = {
        templateType: 'prescription_created',
        channel: 'email',
        userRole: 'patient',
        userId: 'user123',
        data: { firstName: 'John' },
        context: {}
      };

      // First render
      const result1 = await renderer.renderTemplate(renderRequest);
      
      // Second render (should use cache)
      const result2 = await renderer.renderTemplate(renderRequest);

      expect(mockTemplateManager.getTemplate).toHaveBeenCalledTimes(1);
      expect(result1.content.subject).toBe(result2.content.subject);
    });

    it('should bypass cache when requested', async () => {
      const renderRequest = {
        templateType: 'prescription_created',
        channel: 'email',
        userRole: 'patient',
        userId: 'user123',
        data: { firstName: 'John' },
        context: {},
        options: { bypassCache: true }
      };

      // First render
      await renderer.renderTemplate(renderRequest);
      
      // Second render with cache bypass
      await renderer.renderTemplate(renderRequest);

      expect(mockTemplateManager.getTemplate).toHaveBeenCalledTimes(2);
    });
  });

  describe('determineLanguage', () => {
    it('should use requested language if supported', async () => {
      const language = await renderer.determineLanguage('es', 'user123', {});
      expect(language).toBe('es');
    });

    it('should fall back to user preference', async () => {
      const context = {
        userPreferences: {
          preferredLanguage: 'fr'
        }
      };
      
      const language = await renderer.determineLanguage('unsupported', 'user123', context);
      expect(language).toBe('fr');
    });

    it('should fall back to default language', async () => {
      const language = await renderer.determineLanguage('unsupported', 'user123', {});
      expect(language).toBe('en');
    });

    it('should use context-based language detection', async () => {
      const context = {
        location: {
          country: 'ES'
        }
      };
      
      const language = await renderer.determineLanguage(null, 'user123', context);
      expect(language).toBe('es');
    });
  });

  describe('personalization engines', () => {
    describe('personalizeForUser', () => {
      it('should add user-specific data', async () => {
        const data = { message: 'Hello' };
        const context = {
          user: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com'
          }
        };

        const result = await renderer.personalizeForUser(data, context, 'user123');

        expect(result.firstName).toBe('John');
        expect(result.lastName).toBe('Doe');
        expect(result.fullName).toBe('John Doe');
        expect(result.email).toBe('john@example.com');
        expect(result.greeting).toContain('John');
      });

      it('should handle missing user data', async () => {
        const data = { message: 'Hello' };
        const context = {};

        const result = await renderer.personalizeForUser(data, context, null);

        expect(result).toEqual(data);
      });
    });

    describe('personalizeForRole', () => {
      it('should add role-specific data for patient', async () => {
        const data = {};
        const context = {};

        const result = await renderer.personalizeForRole(data, context, 'user123', 'patient');

        expect(result.roleTitle).toBe('Patient');
        expect(result.dashboardUrl).toContain('/patient/dashboard');
        expect(result.supportContact).toBeDefined();
      });

      it('should add role-specific data for doctor', async () => {
        const data = {};
        const context = {
          doctor: {
            specialization: 'Cardiology',
            licenseNumber: 'MD123456'
          }
        };

        const result = await renderer.personalizeForRole(data, context, 'user123', 'doctor');

        expect(result.roleTitle).toBe('Doctor');
        expect(result.specialization).toBe('Cardiology');
        expect(result.licenseNumber).toBe('MD123456');
      });
    });

    describe('personalizeForTime', () => {
      it('should add time-based personalization', async () => {
        const data = {};
        const context = {};

        const result = await renderer.personalizeForTime(data, context);

        expect(result.timeOfDay).toBeDefined();
        expect(result.timeGreeting).toBeDefined();
        expect(result.dayName).toBeDefined();
        expect(result.season).toBeDefined();
        expect(typeof result.isWeekend).toBe('boolean');
      });
    });
  });

  describe('template compilation', () => {
    it('should compile static templates', async () => {
      const variant = {
        subject: 'Static Subject',
        title: 'Static Title',
        body: 'Static body content'
      };

      const compiled = await renderer.compileTemplate(variant, { _id: 'test' });

      expect(compiled.compiledSubject.type).toBe('static');
      expect(compiled.compiledSubject.value).toBe('Static Subject');
      expect(compiled.metadata.hasConditionals).toBe(false);
      expect(compiled.metadata.hasLoops).toBe(false);
    });

    it('should compile dynamic templates', async () => {
      const variant = {
        subject: 'Hello {{firstName}}',
        title: 'Welcome {{firstName}} {{lastName}}',
        body: 'Your order {{orderId}} is ready'
      };

      const compiled = await renderer.compileTemplate(variant, { _id: 'test' });

      expect(compiled.compiledSubject.type).toBe('dynamic');
      expect(compiled.compiledSubject.tokens).toBeDefined();
      expect(compiled.metadata.complexity).toBeGreaterThan(0);
    });

    it('should detect conditional logic', async () => {
      const variant = {
        body: 'Hello {{firstName}}{{#if isVip}} - VIP Member{{/if}}'
      };

      const compiled = await renderer.compileTemplate(variant, { _id: 'test' });

      expect(compiled.metadata.hasConditionals).toBe(true);
    });

    it('should detect loop logic', async () => {
      const variant = {
        body: 'Items: {{#each items}}{{name}} {{/each}}'
      };

      const compiled = await renderer.compileTemplate(variant, { _id: 'test' });

      expect(compiled.metadata.hasLoops).toBe(true);
    });
  });

  describe('template rendering', () => {
    it('should render simple placeholders', () => {
      const compiled = {
        type: 'dynamic',
        template: 'Hello {{firstName}} {{lastName}}!',
        tokens: [
          { type: 'text', value: 'Hello ' },
          { type: 'placeholder', key: 'firstName' },
          { type: 'text', value: ' ' },
          { type: 'placeholder', key: 'lastName' },
          { type: 'text', value: '!' }
        ]
      };

      const context = { firstName: 'John', lastName: 'Doe' };
      const result = renderer.renderCompiledString(compiled, context);

      expect(result).toBe('Hello John Doe!');
    });

    it('should handle nested object properties', () => {
      const compiled = {
        type: 'dynamic',
        template: 'Hello {{user.firstName}} from {{company.name}}!',
        hasConditionals: false,
        hasLoops: false
      };

      const context = {
        user: { firstName: 'John' },
        company: { name: 'ACME Corp' }
      };

      const result = renderer.renderDynamicTemplate(compiled, context);

      expect(result).toBe('Hello John from ACME Corp!');
    });

    it('should process conditionals', () => {
      const template = 'Hello {{firstName}}{{#if isVip}} - VIP Member{{/if}}!';
      
      const context1 = { firstName: 'John', isVip: true };
      const result1 = renderer.processConditionals(template, context1);
      expect(result1).toBe('Hello {{firstName}} - VIP Member!');

      const context2 = { firstName: 'John', isVip: false };
      const result2 = renderer.processConditionals(template, context2);
      expect(result2).toBe('Hello {{firstName}}!');
    });

    it('should process loops', () => {
      const template = 'Items: {{#each items}}{{name}} {{/each}}';
      const context = {
        items: [
          { name: 'Item 1' },
          { name: 'Item 2' },
          { name: 'Item 3' }
        ]
      };

      const result = renderer.processLoops(template, context);
      expect(result).toBe('Items: Item 1 Item 2 Item 3 ');
    });
  });

  describe('condition evaluation', () => {
    it('should evaluate existence conditions', () => {
      const context = { name: 'John', empty: '', nullValue: null };

      expect(renderer.evaluateCondition('name', context)).toBe(true);
      expect(renderer.evaluateCondition('empty', context)).toBe(false);
      expect(renderer.evaluateCondition('nullValue', context)).toBe(false);
      expect(renderer.evaluateCondition('missing', context)).toBe(false);
    });

    it('should evaluate comparison conditions', () => {
      const context = { age: 25, name: 'John' };

      expect(renderer.evaluateCondition('age > 18', context)).toBe(true);
      expect(renderer.evaluateCondition('age < 18', context)).toBe(false);
      expect(renderer.evaluateCondition('name === "John"', context)).toBe(true);
      expect(renderer.evaluateCondition('name !== "Jane"', context)).toBe(true);
    });
  });

  describe('post-processing', () => {
    describe('email post-processing', () => {
      it('should wrap content in HTML structure', async () => {
        const content = {
          htmlBody: '<p>Test content</p>',
          styling: { primaryColor: '#ff0000' }
        };

        const result = await renderer.postProcessEmail(content, 'patient', {});

        expect(result.htmlBody).toContain('<!DOCTYPE html>');
        expect(result.htmlBody).toContain('#ff0000');
        expect(result.htmlBody).toContain('<p>Test content</p>');
      });

      it('should add email tracking', async () => {
        const content = {
          htmlBody: '<html><body><p>Test</p></body></html>'
        };

        const result = await renderer.postProcessEmail(content, 'patient', {
          trackingEnabled: true,
          trackingId: 'track123'
        });

        expect(result.htmlBody).toContain('track/open/track123');
      });

      it('should generate plain text version', async () => {
        const content = {
          htmlBody: '<h1>Title</h1><p>Content with <strong>bold</strong> text</p>'
        };

        const result = await renderer.postProcessEmail(content, 'patient', {});

        expect(result.textBody).toBe('Title Content with bold text');
      });
    });

    describe('SMS post-processing', () => {
      it('should truncate long messages', async () => {
        const longMessage = 'A'.repeat(200);
        const content = { body: longMessage };

        const result = await renderer.postProcessSMS(content, 'patient', {});

        expect(result.body.length).toBeLessThanOrEqual(160);
        expect(result.body).toEndWith('...');
        expect(result.truncated).toBe(true);
      });

      it('should add unsubscribe info', async () => {
        const content = { body: 'Test message' };

        const result = await renderer.postProcessSMS(content, 'patient', {
          includeUnsubscribe: true
        });

        expect(result.body).toContain('Reply STOP to opt out');
      });

      it('should strip HTML', async () => {
        const content = { body: '<p>Test <strong>message</strong></p>' };

        const result = await renderer.postProcessSMS(content, 'patient', {});

        expect(result.body).toBe('Test message');
      });
    });

    describe('WebSocket post-processing', () => {
      it('should structure for real-time notifications', async () => {
        const content = {
          title: 'Test Title',
          body: 'Test Body',
          actions: [{ text: 'Action', url: '/test' }]
        };

        const result = await renderer.postProcessWebSocket(content, 'patient', {
          notificationId: 'notif123',
          priority: 'high',
          category: 'medical'
        });

        expect(result.notification).toBeDefined();
        expect(result.notification.id).toBe('notif123');
        expect(result.notification.priority).toBe('high');
        expect(result.notification.category).toBe('medical');
        expect(result.notification.timestamp).toBeDefined();
      });
    });
  });

  describe('A/B testing', () => {
    beforeEach(() => {
      renderer.abTestConfig.enabled = true;
      renderer.configureABTest('prescription_created', 'email', 'patient', {
        groupA: { name: 'Control', templateType: 'prescription_created' },
        groupB: { name: 'Variant', templateType: 'prescription_created_v2' },
        splitRatio: 0.5
      });
    });

    it('should assign users to test groups consistently', () => {
      const testKey = 'prescription_created_email_patient';
      const abTest = renderer.abTestConfig.testGroups.get(testKey);

      const group1 = renderer.determineABTestGroup('user123', abTest);
      const group2 = renderer.determineABTestGroup('user123', abTest);

      expect(group1).toEqual(group2); // Same user should get same group
    });

    it('should distribute users across groups', () => {
      const testKey = 'prescription_created_email_patient';
      const abTest = renderer.abTestConfig.testGroups.get(testKey);

      const groups = [];
      for (let i = 0; i < 100; i++) {
        const group = renderer.determineABTestGroup(`user${i}`, abTest);
        groups.push(group.name);
      }

      const controlCount = groups.filter(g => g === 'Control').length;
      const variantCount = groups.filter(g => g === 'Variant').length;

      // Should be roughly 50/50 split
      expect(controlCount).toBeGreaterThan(30);
      expect(controlCount).toBeLessThan(70);
      expect(variantCount).toBeGreaterThan(30);
      expect(variantCount).toBeLessThan(70);
    });
  });

  describe('caching', () => {
    it('should cache rendered results', async () => {
      const cacheKey = 'test_key';
      const result = { content: 'test' };

      renderer.cacheRender(cacheKey, result);
      const cached = renderer.getCachedRender(cacheKey);

      expect(cached).toEqual(result);
    });

    it('should respect TTL', async () => {
      renderer.cacheConfig.ttl = 100; // 100ms TTL
      
      const cacheKey = 'test_key';
      const result = { content: 'test' };

      renderer.cacheRender(cacheKey, result);
      
      // Should be cached immediately
      expect(renderer.getCachedRender(cacheKey)).toEqual(result);

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be expired
      expect(renderer.getCachedRender(cacheKey)).toBeNull();
    });

    it('should implement LRU eviction', () => {
      renderer.cacheConfig.maxSize = 2;

      renderer.cacheRender('key1', { content: 'test1' });
      renderer.cacheRender('key2', { content: 'test2' });
      renderer.cacheRender('key3', { content: 'test3' }); // Should evict key1

      expect(renderer.getCachedRender('key1')).toBeNull();
      expect(renderer.getCachedRender('key2')).toBeDefined();
      expect(renderer.getCachedRender('key3')).toBeDefined();
    });
  });

  describe('utility methods', () => {
    it('should validate render requests', () => {
      const validRequest = {
        templateType: 'test',
        channel: 'email',
        userRole: 'patient'
      };

      expect(() => renderer.validateRenderRequest(validRequest)).not.toThrow();

      const invalidRequest = {
        templateType: 'test'
        // Missing channel and userRole
      };

      expect(() => renderer.validateRenderRequest(invalidRequest)).toThrow();
    });

    it('should generate personalized greetings', () => {
      const morningTime = new Date('2024-01-01T09:00:00Z');
      const afternoonTime = new Date('2024-01-01T15:00:00Z');
      const eveningTime = new Date('2024-01-01T20:00:00Z');

      expect(renderer.generatePersonalizedGreeting('John', morningTime)).toContain('Good morning, John');
      expect(renderer.generatePersonalizedGreeting('John', afternoonTime)).toContain('Good afternoon, John');
      expect(renderer.generatePersonalizedGreeting('John', eveningTime)).toContain('Good evening, John');
    });

    it('should get language from country', () => {
      expect(renderer.getLanguageFromCountry('US')).toBe('en');
      expect(renderer.getLanguageFromCountry('ES')).toBe('es');
      expect(renderer.getLanguageFromCountry('FR')).toBe('fr');
      expect(renderer.getLanguageFromCountry('DE')).toBe('de');
    });

    it('should get currency from country', () => {
      expect(renderer.getCurrencyFromCountry('US')).toBe('USD');
      expect(renderer.getCurrencyFromCountry('GB')).toBe('GBP');
      expect(renderer.getCurrencyFromCountry('ES')).toBe('EUR');
    });

    it('should hash strings consistently', () => {
      const hash1 = renderer.hashString('test');
      const hash2 = renderer.hashString('test');
      const hash3 = renderer.hashString('different');

      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hash3);
      expect(hash1).toBeGreaterThanOrEqual(0);
      expect(hash1).toBeLessThanOrEqual(1);
    });

    it('should get nested values', () => {
      const obj = {
        user: {
          profile: {
            name: 'John'
          }
        }
      };

      expect(renderer.getNestedValue(obj, 'user.profile.name')).toBe('John');
      expect(renderer.getNestedValue(obj, 'user.missing')).toBeUndefined();
      expect(renderer.getNestedValue(obj, 'missing.path')).toBeUndefined();
    });
  });

  describe('content sanitization', () => {
    it('should sanitize XSS content', () => {
      const content = {
        subject: 'Test <script>alert("xss")</script>',
        body: 'Content with javascript:void(0)',
        htmlBody: '<p onclick="alert()">Click me</p>'
      };

      const sanitized = renderer.sanitizeContent(content);

      expect(sanitized.subject).not.toContain('<script>');
      expect(sanitized.body).not.toContain('javascript:');
      expect(sanitized.htmlBody).not.toContain('onclick=');
    });
  });

  describe('accessibility enhancement', () => {
    it('should add alt text to images', () => {
      const content = {
        htmlBody: '<img src="test.jpg"><img src="test2.jpg" alt="existing">'
      };

      const enhanced = renderer.enhanceAccessibility(content, 'email');

      expect(enhanced.htmlBody).toContain('alt="Image"');
      expect(enhanced.htmlBody).toContain('alt="existing"');
    });
  });
});