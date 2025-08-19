import { jest } from '@jest/globals';
import TemplateManagementService from './TemplateManagementService.js';
import NotificationTemplate from '../../models/NotificationTemplate.js';

// Mock the models and dependencies
jest.mock('../../models/NotificationTemplate.js');
jest.mock('./EmailTemplateEngine.js');
jest.mock('./SMSTemplateEngine.js');

describe('TemplateManagementService', () => {
  let templateService;
  let mockTemplate;

  beforeEach(() => {
    templateService = new TemplateManagementService();
    
    mockTemplate = {
      _id: 'template123',
      name: 'Test Template',
      type: 'prescription_created',
      category: 'medical',
      version: '1.0.0',
      isActive: true,
      variants: [{
        channel: 'email',
        userRole: 'patient',
        language: 'en',
        subject: 'Test Subject',
        title: 'Test Title',
        body: 'Test Body {{firstName}}',
        htmlBody: '<h1>Test Title</h1><p>Test Body {{firstName}}</p>'
      }],
      usage: {
        totalSent: 0,
        lastUsed: null,
        averageEngagement: 0
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      save: jest.fn().mockResolvedValue(this),
      toObject: jest.fn().mockReturnValue({})
    };

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('createTemplate', () => {
    it('should create a new template successfully', async () => {
      const templateData = {
        name: 'New Template',
        type: 'order_confirmed',
        category: 'administrative',
        variants: [{
          channel: 'email',
          userRole: 'patient',
          language: 'en',
          subject: 'Order Confirmed',
          title: 'Your Order is Confirmed',
          body: 'Hello {{firstName}}, your order has been confirmed.'
        }]
      };

      NotificationTemplate.findOne.mockResolvedValue(null);
      NotificationTemplate.prototype.save = jest.fn().mockResolvedValue({
        ...templateData,
        _id: 'newTemplate123',
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await templateService.createTemplate(templateData, 'user123');

      expect(result).toBeDefined();
      expect(result.version).toBe('1.0.0');
      expect(NotificationTemplate.prototype.save).toHaveBeenCalled();
    });

    it('should handle validation errors', async () => {
      const invalidTemplateData = {
        name: '', // Invalid: empty name
        type: 'order_confirmed',
        category: 'administrative',
        variants: [] // Invalid: no variants
      };

      await expect(
        templateService.createTemplate(invalidTemplateData, 'user123')
      ).rejects.toThrow('Template validation failed');
    });

    it('should generate new version when template exists', async () => {
      const existingTemplate = {
        ...mockTemplate,
        version: '1.2.3',
        isActive: true,
        save: jest.fn().mockResolvedValue(this)
      };

      const templateData = {
        name: 'Updated Template',
        type: 'prescription_created',
        category: 'medical',
        variants: [{
          channel: 'email',
          userRole: 'patient',
          language: 'en',
          subject: 'Updated Subject',
          title: 'Updated Title',
          body: 'Updated Body'
        }],
        replaceExisting: true
      };

      NotificationTemplate.findOne.mockResolvedValue(existingTemplate);
      NotificationTemplate.prototype.save = jest.fn().mockResolvedValue({
        ...templateData,
        _id: 'newTemplate123',
        version: '1.2.4',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await templateService.createTemplate(templateData, 'user123');

      expect(result.version).toBe('1.2.4');
      expect(existingTemplate.save).toHaveBeenCalled();
      expect(existingTemplate.isActive).toBe(false);
    });
  });

  describe('getTemplate', () => {
    it('should retrieve template from database', async () => {
      NotificationTemplate.findOne.mockResolvedValue(mockTemplate);

      const result = await templateService.getTemplate(
        'prescription_created',
        'email',
        'patient',
        'en'
      );

      expect(result).toBeDefined();
      expect(result.template).toBe(mockTemplate);
      expect(result.variant).toBeDefined();
      expect(NotificationTemplate.findOne).toHaveBeenCalledWith({
        type: 'prescription_created',
        isActive: true,
        'variants.channel': 'email',
        'variants.userRole': 'patient',
        'variants.language': 'en'
      });
    });

    it('should use cache when available', async () => {
      const cacheKey = 'prescription_created_email_patient_en';
      const cachedResult = { template: mockTemplate, variant: mockTemplate.variants[0] };
      
      templateService.templateCache.set(cacheKey, cachedResult);

      const result = await templateService.getTemplate(
        'prescription_created',
        'email',
        'patient',
        'en'
      );

      expect(result).toBe(cachedResult);
      expect(NotificationTemplate.findOne).not.toHaveBeenCalled();
    });

    it('should fallback to default language', async () => {
      const englishTemplate = { ...mockTemplate };
      englishTemplate.variants[0].language = 'en';

      NotificationTemplate.findOne
        .mockResolvedValueOnce(null) // First call for 'es' returns null
        .mockResolvedValueOnce(englishTemplate); // Second call for 'en' returns template

      const result = await templateService.getTemplate(
        'prescription_created',
        'email',
        'patient',
        'es'
      );

      expect(result).toBeDefined();
      expect(result.template).toBe(englishTemplate);
      expect(NotificationTemplate.findOne).toHaveBeenCalledTimes(2);
    });

    it('should throw error when template not found', async () => {
      NotificationTemplate.findOne.mockResolvedValue(null);

      await expect(
        templateService.getTemplate('nonexistent', 'email', 'patient', 'en')
      ).rejects.toThrow('Template not found');
    });
  });

  describe('updateTemplate', () => {
    it('should update template successfully', async () => {
      const updateData = {
        name: 'Updated Template Name',
        variants: [{
          channel: 'email',
          userRole: 'patient',
          language: 'en',
          subject: 'Updated Subject',
          title: 'Updated Title',
          body: 'Updated Body'
        }]
      };

      NotificationTemplate.findById.mockResolvedValue(mockTemplate);
      NotificationTemplate.findByIdAndUpdate.mockResolvedValue({
        ...mockTemplate,
        ...updateData,
        version: '1.0.1',
        updatedAt: new Date()
      });

      const result = await templateService.updateTemplate('template123', updateData, 'user123');

      expect(result).toBeDefined();
      expect(result.version).toBe('1.0.1');
      expect(NotificationTemplate.findByIdAndUpdate).toHaveBeenCalled();
    });

    it('should throw error when template not found', async () => {
      NotificationTemplate.findById.mockResolvedValue(null);

      await expect(
        templateService.updateTemplate('nonexistent', {}, 'user123')
      ).rejects.toThrow('Template not found');
    });
  });

  describe('deleteTemplate', () => {
    it('should soft delete template', async () => {
      mockTemplate.save = jest.fn().mockResolvedValue(mockTemplate);
      NotificationTemplate.findById.mockResolvedValue(mockTemplate);

      const result = await templateService.deleteTemplate('template123');

      expect(result).toBe(true);
      expect(mockTemplate.isActive).toBe(false);
      expect(mockTemplate.save).toHaveBeenCalled();
    });

    it('should throw error when template not found', async () => {
      NotificationTemplate.findById.mockResolvedValue(null);

      await expect(
        templateService.deleteTemplate('nonexistent')
      ).rejects.toThrow('Template not found');
    });
  });

  describe('getTemplates', () => {
    it('should retrieve templates with pagination', async () => {
      const mockTemplates = [mockTemplate];
      const mockCount = 1;

      NotificationTemplate.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              populate: jest.fn().mockResolvedValue(mockTemplates)
            })
          })
        })
      });
      NotificationTemplate.countDocuments.mockResolvedValue(mockCount);

      const result = await templateService.getTemplates(
        { type: 'prescription_created' },
        { page: 1, limit: 10 }
      );

      expect(result.templates).toBe(mockTemplates);
      expect(result.pagination.total).toBe(mockCount);
      expect(result.pagination.pages).toBe(1);
    });

    it('should handle search filters', async () => {
      const filters = {
        search: 'prescription',
        category: 'medical',
        isActive: true
      };

      NotificationTemplate.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              populate: jest.fn().mockResolvedValue([])
            })
          })
        })
      });
      NotificationTemplate.countDocuments.mockResolvedValue(0);

      await templateService.getTemplates(filters);

      expect(NotificationTemplate.find).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: true,
          category: 'medical',
          $or: expect.any(Array)
        })
      );
    });
  });

  describe('rollbackTemplate', () => {
    it('should rollback to previous version', async () => {
      const targetVersion = '1.0.0';
      const versionData = {
        version: targetVersion,
        data: { ...mockTemplate, version: targetVersion },
        timestamp: new Date()
      };

      templateService.versionHistory.set('template123', [versionData]);
      
      NotificationTemplate.findById.mockResolvedValue({
        ...mockTemplate,
        version: '1.0.2'
      });
      NotificationTemplate.findByIdAndUpdate.mockResolvedValue({
        ...mockTemplate,
        version: '1.0.3'
      });

      const result = await templateService.rollbackTemplate('template123', targetVersion);

      expect(result).toBeDefined();
      expect(result.version).toBe('1.0.3');
      expect(NotificationTemplate.findByIdAndUpdate).toHaveBeenCalled();
    });

    it('should throw error when version not found', async () => {
      NotificationTemplate.findById.mockResolvedValue(mockTemplate);
      templateService.versionHistory.set('template123', []);

      await expect(
        templateService.rollbackTemplate('template123', '2.0.0')
      ).rejects.toThrow('Version 2.0.0 not found in history');
    });
  });

  describe('validateTemplateData', () => {
    it('should validate valid template data', async () => {
      const validData = {
        name: 'Valid Template',
        type: 'order_confirmed',
        category: 'administrative',
        variants: [{
          channel: 'email',
          userRole: 'patient',
          language: 'en',
          subject: 'Valid Subject',
          title: 'Valid Title',
          body: 'Valid Body'
        }]
      };

      const result = await templateService.validateTemplateData(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect validation errors', async () => {
      const invalidData = {
        name: '', // Missing name
        type: 'order_confirmed',
        category: 'administrative',
        variants: [] // No variants
      };

      const result = await templateService.validateTemplateData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors).toContain('Template name is required');
      expect(result.errors).toContain('At least one template variant is required');
    });
  });

  describe('testTemplate', () => {
    it('should test template rendering', async () => {
      NotificationTemplate.findById.mockResolvedValue(mockTemplate);

      const testData = {
        firstName: 'John',
        lastName: 'Doe'
      };

      const result = await templateService.testTemplate('template123', testData);

      expect(result).toBeDefined();
      expect(result.templateId).toBe('template123');
      expect(result.results).toBeDefined();
    });

    it('should handle template not found', async () => {
      NotificationTemplate.findById.mockResolvedValue(null);

      await expect(
        templateService.testTemplate('nonexistent', {})
      ).rejects.toThrow('Template not found');
    });
  });

  describe('Performance Metrics', () => {
    it('should record performance metrics', () => {
      templateService.recordPerformanceMetric('create', 100, true, false);
      templateService.recordPerformanceMetric('get', 50, true, true);
      templateService.recordPerformanceMetric('get', 75, false, false);

      const metrics = templateService.getPerformanceMetrics();

      expect(metrics.totalOperations).toBe(3);
      expect(metrics.errorRate).toBeCloseTo(1/3);
      expect(metrics.cacheHitRate).toBeCloseTo(1/3);
    });

    it('should calculate average response time', () => {
      templateService.recordPerformanceMetric('test', 100, true);
      templateService.recordPerformanceMetric('test', 200, true);

      const metrics = templateService.getPerformanceMetrics();
      expect(metrics.averageResponseTime).toBe(150);
    });
  });

  describe('Version Management', () => {
    it('should generate next version correctly', () => {
      expect(templateService.generateNextVersion('1.0.0')).toBe('1.0.1');
      expect(templateService.generateNextVersion('2.5.9')).toBe('2.5.10');
      expect(templateService.generateNextVersion('0.1.99')).toBe('0.1.100');
    });

    it('should detect content changes', () => {
      const oldTemplate = {
        variants: [{ title: 'Old Title', body: 'Old Body' }]
      };
      const newData = {
        variants: [{ title: 'New Title', body: 'New Body' }]
      };

      expect(templateService.hasContentChanged(oldTemplate, newData)).toBe(true);
      expect(templateService.hasContentChanged(oldTemplate, oldTemplate)).toBe(false);
    });

    it('should store version history', () => {
      const template = {
        _id: 'test123',
        version: '1.0.0',
        toObject: () => ({ version: '1.0.0' })
      };

      templateService.storeVersionHistory(template);
      
      const history = templateService.versionHistory.get('test123');
      expect(history).toHaveLength(1);
      expect(history[0].version).toBe('1.0.0');
    });
  });

  describe('Cache Management', () => {
    it('should clear cache for specific type', () => {
      templateService.templateCache.set('prescription_created_email_patient_en', {});
      templateService.templateCache.set('order_confirmed_email_patient_en', {});
      templateService.templateCache.set('prescription_created_sms_patient_en', {});

      templateService.clearCacheForType('prescription_created');

      expect(templateService.templateCache.has('prescription_created_email_patient_en')).toBe(false);
      expect(templateService.templateCache.has('prescription_created_sms_patient_en')).toBe(false);
      expect(templateService.templateCache.has('order_confirmed_email_patient_en')).toBe(true);
    });

    it('should clear all caches', () => {
      templateService.templateCache.set('test1', {});
      templateService.templateCache.set('test2', {});

      templateService.clearAllCaches();

      expect(templateService.templateCache.size).toBe(0);
    });
  });

  describe('String Interpolation', () => {
    it('should interpolate simple placeholders', () => {
      const template = 'Hello {{firstName}} {{lastName}}!';
      const data = { firstName: 'John', lastName: 'Doe' };

      const result = templateService.interpolateString(template, data);
      expect(result).toBe('Hello John Doe!');
    });

    it('should handle nested object properties', () => {
      const template = 'Hello {{user.firstName}} from {{company.name}}!';
      const data = {
        user: { firstName: 'John' },
        company: { name: 'ACME Corp' }
      };

      const result = templateService.interpolateString(template, data);
      expect(result).toBe('Hello John from ACME Corp!');
    });

    it('should handle missing properties gracefully', () => {
      const template = 'Hello {{firstName}} {{missing}}!';
      const data = { firstName: 'John' };

      const result = templateService.interpolateString(template, data);
      expect(result).toBe('Hello John {{missing}}!');
    });
  });
});