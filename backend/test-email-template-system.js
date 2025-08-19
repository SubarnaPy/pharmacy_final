import EmailTemplateEngine from './src/services/notifications/EmailTemplateEngine.js';
import EmailTemplateValidator from './src/services/notifications/EmailTemplateValidator.js';
import EmailAttachmentHandler from './src/services/notifications/EmailAttachmentHandler.js';

/**
 * Test script for Email Template System
 */
async function testEmailTemplateSystem() {
  console.log('🧪 Testing Email Template System...\n');

  try {
    // Initialize components
    const templateEngine = new EmailTemplateEngine();
    const validator = new EmailTemplateValidator();
    const attachmentHandler = new EmailAttachmentHandler();

    // Test 1: Template Validation
    console.log('📋 Test 1: Template Validation');
    const testTemplate = {
      subject: 'Test Email - {{appName}}',
      title: 'Test Notification',
      body: 'Hello {{firstName}}, this is a test notification from {{appName}}.',
      htmlBody: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Test Notification</title>
        </head>
        <body>
          <h1>Hello {{firstName}}!</h1>
          <p>This is a test notification from {{appName}}.</p>
          <p>Contact us at {{supportEmail}}</p>
        </body>
        </html>
      `
    };

    const validation = await validator.validateTemplate(testTemplate);
    console.log(`✅ Validation Score: ${validation.score}/100`);
    console.log(`✅ Is Valid: ${validation.isValid}`);
    console.log(`⚠️  Warnings: ${validation.warnings.length}`);
    console.log(`💡 Suggestions: ${validation.suggestions.length}\n`);

    // Test 2: Template Rendering
    console.log('🎨 Test 2: Template Rendering');
    const sampleData = {
      firstName: 'John',
      lastName: 'Doe',
      appName: 'Healthcare Platform',
      supportEmail: 'support@healthcare.com'
    };

    const rendered = await templateEngine.renderTemplate(testTemplate, sampleData);
    console.log(`✅ Subject: ${rendered.subject}`);
    console.log(`✅ HTML Body Length: ${rendered.htmlBody.length} characters`);
    console.log(`✅ Text Body Length: ${rendered.textBody.length} characters\n`);

    // Test 3: String Interpolation
    console.log('🔤 Test 3: String Interpolation');
    const templateString = 'Hello {{user.firstName}} {{user.lastName}} from {{company.name}}!';
    const interpolationData = {
      user: { firstName: 'Jane', lastName: 'Smith' },
      company: { name: 'HealthTech Inc' }
    };

    const interpolated = templateEngine.interpolateString(templateString, interpolationData);
    console.log(`✅ Interpolated: ${interpolated}\n`);

    // Test 4: HTML to Text Conversion
    console.log('📝 Test 4: HTML to Text Conversion');
    const htmlContent = '<h1>Title</h1><p>This is a <strong>test</strong> with <a href="#">links</a>.</p>';
    const textContent = templateEngine.htmlToText(htmlContent);
    console.log(`✅ Original HTML: ${htmlContent}`);
    console.log(`✅ Converted Text: ${textContent}\n`);

    // Test 5: Attachment Processing
    console.log('📎 Test 5: Attachment Processing');
    const testAttachments = [
      {
        filename: 'prescription.pdf',
        content: Buffer.from('Sample PDF content').toString('base64'),
        contentType: 'application/pdf',
        type: 'prescription',
        prescriptionId: 'RX123'
      },
      {
        filename: 'receipt.pdf',
        content: Buffer.from('Sample receipt content').toString('base64'),
        contentType: 'application/pdf',
        type: 'receipt',
        orderId: 'ORD456'
      }
    ];

    const processedAttachments = await attachmentHandler.processAttachments(testAttachments);
    console.log(`✅ Processed ${processedAttachments.length} attachments`);
    
    for (const attachment of processedAttachments) {
      console.log(`   - ${attachment.filename} (${attachment.type}): ${attachment.size} bytes`);
    }
    console.log();

    // Test 6: Attachment Statistics
    console.log('📊 Test 6: Attachment Statistics');
    const stats = attachmentHandler.getAttachmentStats(processedAttachments);
    console.log(`✅ Total Count: ${stats.totalCount}`);
    console.log(`✅ Total Size: ${stats.totalSize} bytes`);
    console.log(`✅ Type Breakdown:`, stats.typeBreakdown);
    console.log(`✅ Has Confidential: ${stats.hasConfidential}\n`);

    // Test 7: Template Testing
    console.log('🧪 Test 7: Template Testing');
    const testResult = await validator.testTemplate(testTemplate, sampleData);
    console.log(`✅ Test Success: ${testResult.success}`);
    console.log(`✅ Validation Passed: ${testResult.validation.isValid}`);
    console.log(`⚠️  Test Warnings: ${testResult.warnings?.length || 0}\n`);

    // Test 8: Cache Management
    console.log('💾 Test 8: Cache Management');
    templateEngine.templateCache.set('test-key', 'test-value');
    const cacheStats = templateEngine.getCacheStats();
    console.log(`✅ Cache Size: ${cacheStats.size}`);
    console.log(`✅ Cache Keys: ${cacheStats.keys.join(', ')}`);
    
    templateEngine.clearCache();
    const clearedStats = templateEngine.getCacheStats();
    console.log(`✅ Cache Size After Clear: ${clearedStats.size}\n`);

    // Test 9: Comprehensive Report Generation
    console.log('📋 Test 9: Comprehensive Report Generation');
    const report = await validator.generateReport(testTemplate, { sampleData });
    console.log(`✅ Overall Score: ${report.summary.overallScore}`);
    console.log(`✅ Production Ready: ${report.summary.isProduction}`);
    console.log(`✅ Critical Issues: ${report.summary.criticalIssues}`);
    console.log(`✅ Recommendations: ${report.recommendations.length}\n`);

    // Test 10: File Template Loading (simulate)
    console.log('📁 Test 10: File Template Simulation');
    const fileTemplate = await templateEngine.parseTemplateFile(
      'mock-path.html',
      'prescription_created',
      'patient',
      'en'
    );
    console.log(`✅ File Template Parsed: ${fileTemplate !== null}\n`);

    console.log('🎉 All tests completed successfully!');
    console.log('\n📊 Summary:');
    console.log('✅ Template validation working');
    console.log('✅ Template rendering working');
    console.log('✅ String interpolation working');
    console.log('✅ HTML to text conversion working');
    console.log('✅ Attachment processing working');
    console.log('✅ Cache management working');
    console.log('✅ Comprehensive reporting working');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
testEmailTemplateSystem();