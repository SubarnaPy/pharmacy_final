import { jest } from '@jest/globals';
import EmailTemplateEngine from './EmailTemplateEngine.js';
import EmailTemplateValidator from './EmailTemplateValidator.js';
import EmailAttachmentHandler from './EmailAttachmentHandler.js';
import NotificationTemplate from '../../models/NotificationTemplate.js';

// Mock dependencies
jest.mock('../../models/NotificationTemplate.js');
jest.mock('fs/promises');

describe('EmailTemplateEngine', () => {
  let templateEngine;
  let mockTemplate;

  beforeEach(() => {
    templateEngine = new EmailTemplateEngine();
    
    mockTemplate = {
      type: 'prescription_created',
      variants: [{
        channel: 'email',
        userRole: 'patient',
        language: 'en',
        subject: 'Your Prescription is Ready - {{appName}}',
        title: 'Prescription Created',
        body: 'Hello {{firstName}}, your prescription has been created.',
        htmlBody: '<h1>Hello {{firstName}}</h1><p>Your prescription has been created by Dr. {{doctor.lastName}}.</p>',
        styling: {
          primaryColor: '#059669',
          logoUrl: '',
          footerText: ''
        },
        actions: [{
          text: 'View Prescription',
          url: '{{appUrl}}/prescriptions/{{prescription.id}}',
          style: 'primary'
        }]
      }]
    };

    // Clear cache before each test
    templateEngine.clearCache();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTemplate', () => {
    it('should retrieve template from database', async () => {
      NotificationTemplate.findOne.mockResolvedValue(mockTemplate);

      const result = await templateEngine.getTemplate('prescription_created', 'patient', 'en');

      expect(result).toEqual(mockTemplate.variants[0]);
      expect(NotificationTemplate.findOne).toHaveBeenCalledWith({
        type: 'prescription_created',
        isActive: true,
        'variants.channel': 'email',
        'variants.userRole': 'patient',
        'variants.language': 'en'
      });
    });

    it('should cache retrieved templates', async () => {
      NotificationTemplate.findOne.mockResolvedValue(mockTemplate);

      // First call
      await templateEngine.getTemplate('prescription_created', 'patient', 'en');
      
      // Second call should use cache
      const result = await templateEngine.getTemplate('prescription_created', 'patient', 'en');

      expect(result).toEqual(mockTemplate.variants[0]);
      expect(NotificationTemplate.findOne).toHaveBeenCalledTimes(1);
    });

    it('should fallback to default language if requested language not found', async () => {
      NotificationTemplate.findOne
        .mockResolvedValueOnce(null) // First call for 'es'
        .mockResolvedValueOnce(mockTemplate); // Second call for 'en'

      const result = await templateEngine.getTemplate('prescription_created', 'patient', 'es');

      expect(result).toEqual(mockTemplate.variants[0]);
      expect(NotificationTemplate.findOne).toHaveBeenCalledTimes(2);
    });

    it('should throw error if template not found', async () => {
      NotificationTemplate.findOne.mockResolvedValue(null);

      await expect(
        templateEngine.getTemplate('nonexistent_type', 'patient', 'en')
      ).rejects.toThrow('Template not found');
    });
  });

  describe('renderTemplate', () => {
    const sampleData = {
      firstName: 'John',
      doctor: { lastName: 'Smith' },
      prescription: { id: '12345' },
      appName: 'Healthcare Platform',
      appUrl: 'https://healthcare.com'
    };

    it('should render template with provided data', async () => {
      const template = mockTemplate.variants[0];
      
      const result = await templateEngine.renderTemplate(template, sampleData);

      expect(result.subject).toBe('Your Prescription is Ready - Healthcare Platform');
      expect(result.htmlBody).toContain('Hello John');
      expect(result.htmlBody).toContain('Dr. Smith');
      expect(result.textBody).toContain('Hello John');
      expect(result.textBody).not.toContain('<h1>');
    });

    it('should handle missing data gracefully', async () => {
      const template = mockTemplate.variants[0];
      const incompleteData = { firstName: 'John' };
      
      const result = await templateEngine.renderTemplate(template, incompleteData);

      expect(result.subject).toContain('{{appName}}'); // Should remain unresolved
      expect(result.htmlBody).toContain('John');
      expect(result.htmlBody).toContain('{{doctor.lastName}}'); // Should remain unresolved
    });

    it('should include default template data', async () => {
      const template = {
        subject: 'Test - {{appName}}',
        title: 'Test',
        htmlBody: '<p>Current year: {{currentYear}}</p>'
      };
      
      const result = await templateEngine.renderTemplate(template, {});

      expect(result.subject).toContain('Healthcare Platform');
      expect(result.htmlBody).toContain(new Date().getFullYear().toString());
    });

    it('should handle attachments in render data', async () => {
      const template = mockTemplate.variants[0];
      const dataWithAttachments = {
        ...sampleData,
        attachments: [
          { filename: 'prescription.pdf', content: 'base64content' }
        ]
      };
      
      const result = await templateEngine.renderTemplate(template, dataWithAttachments);

      expect(result.attachments).toHaveLength(1);
      expect(result.attachments[0].filename).toBe('prescription.pdf');
    });
  });

  describe('interpolateString', () => {
    it('should replace simple placeholders', () => {
      const template = 'Hello {{name}}!';
      const data = { name: 'John' };
      
      const result = templateEngine.interpolateString(template, data);
      
      expect(result).toBe('Hello John!');
    });

    it('should replace nested placeholders', () => {
      const template = 'Hello {{user.firstName}} {{user.lastName}}!';
      const data = { user: { firstName: 'John', lastName: 'Doe' } };
      
      const result = templateEngine.interpolateString(template, data);
      
      expect(result).toBe('Hello John Doe!');
    });

    it('should leave unresolved placeholders unchanged', () => {
      const template = 'Hello {{name}} and {{unknown}}!';
      const data = { name: 'John' };
      
      const result = templateEngine.interpolateString(template, data);
      
      expect(result).toBe('Hello John and {{unknown}}!');
    });

    it('should handle null and undefined values', () => {
      const template = 'Value: {{value}}';
      const data = { value: null };
      
      const result = templateEngine.interpolateString(template, data);
      
      expect(result).toBe('Value: ');
    });
  });

  describe('htmlToText', () => {
    it('should convert HTML to plain text', () => {
      const html = '<h1>Title</h1><p>This is a <strong>test</strong> paragraph.</p>';
      
      const result = templateEngine.htmlToText(html);
      
      expect(result).toBe('Title This is a test paragraph.');
    });

    it('should remove style and script tags', () => {
      const html = '<style>body { color: red; }</style><p>Content</p><script>alert("test");</script>';
      
      const result = templateEngine.htmlToText(html);
      
      expect(result).toBe('Content');
    });

    it('should decode HTML entities', () => {
      const html = '<p>&amp; &lt; &gt; &quot; &#39;</p>';
      
      const result = templateEngine.htmlToText(html);
      
      expect(result).toBe('& < > " \'');
    });

    it('should handle empty or null input', () => {
      expect(templateEngine.htmlToText('')).toBe('');
      expect(templateEngine.htmlToText(null)).toBe('');
      expect(templateEngine.htmlToText(undefined)).toBe('');
    });
  });

  describe('validateTemplate', () => {
    it('should validate a correct template', async () => {
      const template = mockTemplate.variants[0];
      
      const result = await templateEngine.validateTemplate(template);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', async () => {
      const invalidTemplate = {
        // Missing subject, title, body
        htmlBody: '<p>Content</p>'
      };
      
      const result = await templateEngine.validateTemplate(invalidTemplate);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('subject is required');
      expect(result.errors).toContain('title is required');
      expect(result.errors).toContain('body is required');
    });

    it('should detect content that exceeds length limits', async () => {
      const template = {
        subject: 'A'.repeat(250), // Exceeds 200 char limit
        title: 'Test',
        body: 'Content'
      };
      
      const result = await templateEngine.validateTemplate(template);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('subject exceeds maximum length of 200 characters');
    });

    it('should warn about missing recommended placeholders', async () => {
      const template = {
        subject: 'Test Subject',
        title: 'Test',
        body: 'Simple content without placeholders',
        htmlBody: '<p>Simple content without placeholders</p>'
      };
      
      const result = await templateEngine.validateTemplate(template);
      
      expect(result.warnings).toContain('Missing recommended placeholder: {{appName}}');
      expect(result.warnings).toContain('Missing recommended placeholder: {{supportEmail}}');
    });
  });

  describe('testTemplate', () => {
    it('should test template rendering with sample data', async () => {
      const template = mockTemplate.variants[0];
      
      const result = await templateEngine.testTemplate(template);
      
      expect(result.success).toBe(true);
      expect(result.rendered).toBeDefined();
      expect(result.rendered.subject).toContain('Healthcare Platform');
      expect(result.rendered.htmlBody).toContain('John');
      expect(result.validation).toBeDefined();
    });

    it('should detect unresolved placeholders in test', async () => {
      const template = {
        subject: 'Test {{unknownField}}',
        title: 'Test',
        body: 'Content with {{anotherUnknown}}',
        htmlBody: '<p>Content with {{anotherUnknown}}</p>'
      };
      
      const result = await templateEngine.testTemplate(template);
      
      expect(result.warnings).toContain('Unresolved placeholders: {{unknownField}}, {{anotherUnknown}}');
    });

    it('should handle template test failures gracefully', async () => {
      const invalidTemplate = null;
      
      const result = await templateEngine.testTemplate(invalidTemplate);
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Template test failed: Template is required for rendering');
    });
  });

  describe('processAttachments', () => {
    it('should process valid attachments', async () => {
      const attachments = [
        {
          filename: 'prescription.pdf',
          content: 'base64content',
          contentType: 'application/pdf'
        }
      ];
      
      const result = await templateEngine.processAttachments(attachments);
      
      expect(result).toHaveLength(1);
      expect(result[0].filename).toBe('prescription.pdf');
      expect(result[0].contentType).toBe('application/pdf');
    });

    it('should filter out invalid attachments', async () => {
      const attachments = [
        {
          filename: 'valid.pdf',
          content: 'base64content',
          contentType: 'application/pdf'
        },
        {
          filename: 'invalid.exe',
          content: 'base64content',
          contentType: 'application/x-executable'
        }
      ];
      
      const result = await templateEngine.processAttachments(attachments);
      
      expect(result).toHaveLength(1);
      expect(result[0].filename).toBe('valid.pdf');
    });

    it('should handle empty attachments array', async () => {
      const result = await templateEngine.processAttachments([]);
      
      expect(result).toHaveLength(0);
    });
  });

  describe('cache management', () => {
    it('should clear cache', () => {
      templateEngine.templateCache.set('test', 'value');
      expect(templateEngine.templateCache.size).toBe(1);
      
      templateEngine.clearCache();
      
      expect(templateEngine.templateCache.size).toBe(0);
    });

    it('should return cache statistics', () => {
      templateEngine.templateCache.set('key1', 'value1');
      templateEngine.templateCache.set('key2', 'value2');
      
      const stats = templateEngine.getCacheStats();
      
      expect(stats.size).toBe(2);
      expect(stats.keys).toContain('key1');
      expect(stats.keys).toContain('key2');
    });
  });
});

describe('EmailTemplateValidator', () => {
  let validator;

  beforeEach(() => {
    validator = new EmailTemplateValidator();
  });

  describe('validateTemplate', () => {
    it('should validate a well-formed template', async () => {
      const template = {
        subject: 'Test Subject',
        title: 'Test Title',
        body: 'This is a test body with sufficient content for validation.',
        htmlBody: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Test</title>
          </head>
          <body>
            <h1>Test Title</h1>
            <p>Hello {{firstName}}, welcome to {{appName}}!</p>
            <p>Contact us at {{supportEmail}}</p>
          </body>
          </html>
        `
      };

      const result = await validator.validateTemplate(template);

      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThan(80);
    });

    it('should detect HTML structure issues', async () => {
      const template = {
        subject: 'Test Subject',
        title: 'Test Title',
        body: 'Test body content',
        htmlBody: '<p>Missing HTML structure</p>'
      };

      const result = await validator.validateTemplate(template);

      expect(result.warnings).toContain('Template should include proper HTML structure');
    });

    it('should detect problematic HTML tags', async () => {
      const template = {
        subject: 'Test Subject',
        title: 'Test Title',
        body: 'Test body content',
        htmlBody: '<html><body><script>alert("test");</script><p>Content</p></body></html>'
      };

      const result = await validator.validateTemplate(template);

      expect(result.errors).toContain('Potentially problematic tag found: <script');
    });

    it('should validate accessibility features', async () => {
      const template = {
        subject: 'Test Subject',
        title: 'Test Title',
        body: 'Test body content',
        htmlBody: '<html><body><img src="test.jpg"><a href="#">here</a></body></html>'
      };

      const result = await validator.validateTemplate(template, { checkAccessibility: true });

      expect(result.errors).toContain('Image missing alt attribute for accessibility');
      expect(result.warnings).toContain('Avoid generic link text like "click here" for better accessibility');
    });
  });

  describe('testTemplate', () => {
    it('should test template with sample data', async () => {
      const template = {
        subject: 'Hello {{firstName}}',
        title: 'Welcome',
        body: 'Welcome {{firstName}} to {{appName}}',
        htmlBody: '<h1>Welcome {{firstName}}</h1><p>Welcome to {{appName}}</p>'
      };

      const result = await validator.testTemplate(template);

      expect(result.success).toBe(true);
      expect(result.rendered.subject).toBe('Hello John');
      expect(result.rendered.htmlBody).toContain('Welcome John');
    });
  });
});

describe('EmailAttachmentHandler', () => {
  let attachmentHandler;

  beforeEach(() => {
    attachmentHandler = new EmailAttachmentHandler();
  });

  describe('processAttachments', () => {
    it('should process valid PDF attachment', async () => {
      const attachments = [{
        filename: 'prescription.pdf',
        content: Buffer.from('PDF content').toString('base64'),
        contentType: 'application/pdf',
        type: 'prescription',
        prescriptionId: '12345'
      }];

      const result = await attachmentHandler.processAttachments(attachments);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('prescription');
      expect(result[0].metadata.prescriptionId).toBe('12345');
      expect(result[0].metadata.isConfidential).toBe(true);
    });

    it('should reject oversized attachments', async () => {
      const largeContent = 'x'.repeat(15 * 1024 * 1024); // 15MB
      const attachments = [{
        filename: 'large.pdf',
        content: Buffer.from(largeContent).toString('base64'),
        contentType: 'application/pdf'
      }];

      const result = await attachmentHandler.processAttachments(attachments);

      expect(result).toHaveLength(0);
    });

    it('should reject unsupported file types', async () => {
      const attachments = [{
        filename: 'malware.exe',
        content: Buffer.from('executable content').toString('base64'),
        contentType: 'application/x-executable'
      }];

      const result = await attachmentHandler.processAttachments(attachments);

      expect(result).toHaveLength(0);
    });

    it('should sanitize filenames', async () => {
      const attachments = [{
        filename: 'file with spaces & special chars!.pdf',
        content: Buffer.from('PDF content').toString('base64'),
        contentType: 'application/pdf'
      }];

      const result = await attachmentHandler.processAttachments(attachments);

      expect(result[0].filename).toBe('file_with_spaces___special_chars_.pdf');
    });

    it('should process image attachments with CID', async () => {
      const attachments = [{
        filename: 'image.jpg',
        content: Buffer.from('JPEG content').toString('base64'),
        contentType: 'image/jpeg',
        type: 'image',
        isInline: true
      }];

      const result = await attachmentHandler.processAttachments(attachments);

      expect(result[0].type).toBe('image');
      expect(result[0].cid).toBeDefined();
      expect(result[0].metadata.isInline).toBe(true);
    });
  });

  describe('validateAttachmentStructure', () => {
    it('should validate correct attachment structure', () => {
      const attachment = {
        filename: 'test.pdf',
        content: 'base64content',
        contentType: 'application/pdf'
      };

      const result = attachmentHandler.validateAttachmentStructure(attachment);

      expect(result).toBe(true);
    });

    it('should reject invalid attachment structure', () => {
      const invalidAttachment = {
        filename: 'test.pdf'
        // Missing content
      };

      const result = attachmentHandler.validateAttachmentStructure(invalidAttachment);

      expect(result).toBe(false);
    });
  });

  describe('getAttachmentStats', () => {
    it('should calculate attachment statistics', () => {
      const attachments = [
        {
          filename: 'doc1.pdf',
          type: 'prescription',
          size: 1024,
          metadata: { isConfidential: true }
        },
        {
          filename: 'doc2.jpg',
          type: 'image',
          size: 2048,
          metadata: { isConfidential: false }
        }
      ];

      const stats = attachmentHandler.getAttachmentStats(attachments);

      expect(stats.totalCount).toBe(2);
      expect(stats.totalSize).toBe(3072);
      expect(stats.typeBreakdown.prescription).toBe(1);
      expect(stats.typeBreakdown.image).toBe(1);
      expect(stats.largestFile.filename).toBe('doc2.jpg');
      expect(stats.hasConfidential).toBe(true);
    });
  });
});

// Integration tests
describe('Email Template System Integration', () => {
  let templateEngine;
  let validator;
  let attachmentHandler;

  beforeEach(() => {
    templateEngine = new EmailTemplateEngine();
    validator = new EmailTemplateValidator();
    attachmentHandler = new EmailAttachmentHandler();
  });

  it('should process complete email with template, validation, and attachments', async () => {
    // Mock template
    const template = {
      subject: 'Your Prescription #{{prescription.id}} is Ready',
      title: 'Prescription Ready',
      body: 'Hello {{patient.firstName}}, your prescription is ready for pickup.',
      htmlBody: `
        <html>
        <head><title>Prescription Ready</title></head>
        <body>
          <h1>Hello {{patient.firstName}}</h1>
          <p>Your prescription #{{prescription.id}} is ready for pickup at {{pharmacy.name}}.</p>
          <p>Contact us at {{supportEmail}}</p>
        </body>
        </html>
      `
    };

    // Sample data
    const data = {
      patient: { firstName: 'John' },
      prescription: { id: 'RX123' },
      pharmacy: { name: 'City Pharmacy' },
      supportEmail: 'support@healthcare.com'
    };

    // Sample attachments
    const attachments = [{
      filename: 'prescription_RX123.pdf',
      content: Buffer.from('Prescription PDF content').toString('base64'),
      contentType: 'application/pdf',
      type: 'prescription',
      prescriptionId: 'RX123'
    }];

    // Validate template
    const validation = await validator.validateTemplate(template);
    expect(validation.isValid).toBe(true);

    // Render template
    const rendered = await templateEngine.renderTemplate(template, data);
    expect(rendered.subject).toBe('Your Prescription #RX123 is Ready');
    expect(rendered.htmlBody).toContain('Hello John');

    // Process attachments
    const processedAttachments = await attachmentHandler.processAttachments(attachments);
    expect(processedAttachments).toHaveLength(1);
    expect(processedAttachments[0].type).toBe('prescription');

    // Complete email object
    const email = {
      ...rendered,
      attachments: processedAttachments
    };

    expect(email.subject).toBeDefined();
    expect(email.htmlBody).toBeDefined();
    expect(email.textBody).toBeDefined();
    expect(email.attachments).toHaveLength(1);
  });
});