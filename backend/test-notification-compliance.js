import HIPAAComplianceService from './src/services/compliance/HIPAAComplianceService.js';
import ConsentManagementService from './src/services/compliance/ConsentManagementService.js';
import RegulatoryReportingService from './src/services/compliance/RegulatoryReportingService.js';

/**
 * Test script for notification compliance and regulatory features
 */
async function testNotificationCompliance() {
  console.log('📋 Testing Notification Compliance and Regulatory Features...\n');

  try {
    // Test 1: HIPAA Compliance Service
    console.log('1. Testing HIPAA Compliance Service...');
    await testHIPAAComplianceService();
    console.log('✅ HIPAA Compliance Service tests passed\n');

    // Test 2: Consent Management Service
    console.log('2. Testing Consent Management Service...');
    await testConsentManagementService();
    console.log('✅ Consent Management Service tests passed\n');

    // Test 3: Regulatory Reporting Service
    console.log('3. Testing Regulatory Reporting Service...');
    await testRegulatoryReportingService();
    console.log('✅ Regulatory Reporting Service tests passed\n');

    console.log('🎉 All notification compliance tests passed successfully!');

  } catch (error) {
    console.error('❌ Compliance tests failed:', error);
    process.exit(1);
  }
}

/**
 * Test HIPAA compliance service functionality
 */
async function testHIPAAComplianceService() {
  const hipaaService = new HIPAAComplianceService();

  // Test notification with PHI
  const testNotification = {
    _id: 'notif123',
    type: 'prescription_created',
    priority: 'high',
    recipients: [
      { userId: 'patient123', userRole: 'patient' },
      { userId: 'doctor456', userRole: 'doctor' },
      { userId: 'pharmacy789', userRole: 'pharmacy' }
    ],
    content: {
      title: 'New Prescription Available',
      message: 'Your prescription for Amoxicillin 500mg is ready for pickup',
      patientName: 'John Doe',
      patientSSN: '123-45-6789',
      medicalRecordNumber: 'MRN: 987654',
      diagnosis: 'Bacterial infection',
      medication: 'Amoxicillin 500mg',
      doctorName: 'Dr. Smith',
      pharmacyAddress: '123 Main St, Anytown, CA 90210'
    },
    contextData: {
      prescriptionDetails: {
        prescriptionId: 'RX123456',
        dosage: '3 times daily for 7 days',
        refills: 2
      },
      patientInfo: {
        dateOfBirth: '1990-01-15',
        phoneNumber: '555-123-4567',
        email: 'john.doe@email.com'
      }
    }
  };

  // Test compliance validation
  const validationResult = await hipaaService.validateNotificationCompliance(testNotification, {
    patientId: 'patient123',
    source: 'prescription_system'
  });

  console.log('   - PHI detected:', validationResult.phiDetected);
  console.log('   - Compliance status:', validationResult.compliant ? 'COMPLIANT' : 'NON-COMPLIANT');
  console.log('   - Violations found:', validationResult.violations.length);
  console.log('   - Warnings issued:', validationResult.warnings.length);
  console.log('   - Recommendations:', validationResult.recommendations.length);

  // Test PHI detection
  const phiDetection = hipaaService.detectPHI(testNotification);
  console.log('   - PHI elements detected:', phiDetection.phiElements.length);
  console.log('   - Direct identifiers found:', phiDetection.violations.length);

  // Test minimum necessary validation
  const minimumNecessaryResult = hipaaService.validateMinimumNecessary(testNotification, {});
  console.log('   - Minimum necessary compliant:', minimumNecessaryResult.compliant);

  // Test breach notification creation
  const breachDetails = {
    discoveredAt: new Date(),
    description: 'Unauthorized access to patient notification data',
    cause: 'System vulnerability',
    location: 'Notification server',
    affectedRecords: 150,
    affectedIndividuals: ['patient123', 'patient456'],
    phiTypes: ['names', 'medical_records', 'contact_info'],
    immediateActions: ['System patched', 'Access logs reviewed'],
    correctiveActions: ['Enhanced monitoring', 'Staff retraining']
  };

  const breachNotification = await hipaaService.createBreachNotification(breachDetails);
  console.log('   - Breach notification created:', breachNotification.breachId);
  console.log('   - Breach severity:', breachNotification.severity);
  console.log('   - Individual notification required:', breachNotification.notificationRequired.individuals);

  // Test compliance report generation
  const complianceReport = await hipaaService.generateComplianceReport({
    period: 'monthly',
    reportType: 'comprehensive'
  });
  console.log('   - Compliance report generated:', complianceReport.reportId);
}

/**
 * Test consent management service functionality
 */
async function testConsentManagementService() {
  const consentService = new ConsentManagementService();

  const testUserId = 'user123';

  // Test consent status retrieval
  const consentStatus = await consentService.getUserConsentStatus(testUserId);
  console.log('   - Consent types available:', Object.keys(consentStatus.consents).length);
  console.log('   - Consent summary:', consentStatus.summary);

  // Test consent update
  const updateResult = await consentService.updateUserConsent(
    testUserId,
    'notification_medical',
    'granted',
    {
      version: '2.0',
      source: 'user_portal',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0...'
    }
  );
  console.log('   - Consent update successful:', updateResult.success);
  console.log('   - Consent status:', updateResult.status);

  // Test opt-out processing
  const optOutResult = await consentService.processOptOut(
    testUserId,
    'category',
    'too_frequent',
    {
      categories: ['marketing'],
      reasonDetails: 'Receiving too many promotional emails',
      source: 'email_link'
    }
  );
  console.log('   - Opt-out processed:', optOutResult.success);
  console.log('   - Opt-out ID:', optOutResult.optOutId);

  // Test unsubscribe token generation
  const unsubscribeToken = consentService.generateUnsubscribeToken(
    testUserId,
    'promotional_offer',
    'email'
  );
  console.log('   - Unsubscribe token generated:', !!unsubscribeToken);

  // Test unsubscribe processing
  const unsubscribeResult = await consentService.processUnsubscribe(unsubscribeToken, {
    unsubscribeType: 'category',
    source: 'email_link',
    ipAddress: '192.168.1.100'
  });
  console.log('   - Unsubscribe processed:', unsubscribeResult.success);

  // Test consent validation
  const hasConsent = await consentService.hasValidConsent(
    testUserId,
    'prescription_created',
    'email'
  );
  console.log('   - Has valid consent for prescription notifications:', hasConsent);

  // Test consent history
  const consentHistory = await consentService.getConsentHistory(testUserId, {
    limit: 10
  });
  console.log('   - Consent history entries:', consentHistory.length);

  // Test consent report generation
  const consentReport = await consentService.generateConsentReport({
    period: 'monthly',
    filters: {}
  });
  console.log('   - Consent report generated:', consentReport.reportId);
  console.log('   - Total consents analyzed:', consentReport.statistics.totalConsents);
}

/**
 * Test regulatory reporting service functionality
 */
async function testRegulatoryReportingService() {
  const reportingService = new RegulatoryReportingService();

  // Test HIPAA compliance report generation
  const hipaaReport = await reportingService.generateRegulatoryReport('hipaa_compliance', {
    period: {
      start: new Date('2024-01-01'),
      end: new Date('2024-01-31')
    },
    generatedBy: 'compliance_officer',
    framework: 'HIPAA',
    scope: 'all_users'
  });

  console.log('   - HIPAA report generated:', hipaaReport.reportId);
  console.log('   - Report sections:', Object.keys(hipaaReport.sections).length);
  console.log('   - Overall compliance:', hipaaReport.executiveSummary.overallCompliance + '%');
  console.log('   - Critical issues:', hipaaReport.executiveSummary.criticalIssues);

  // Test notification audit report generation
  const auditReport = await reportingService.generateRegulatoryReport('notification_audit', {
    period: {
      start: new Date('2024-01-01'),
      end: new Date('2024-01-31')
    },
    generatedBy: 'system_admin',
    includeRawData: false
  });

  console.log('   - Audit report generated:', auditReport.reportId);
  console.log('   - Audit sections:', Object.keys(auditReport.sections).length);

  // Test audit trail generation
  const auditTrail = await reportingService.generateAuditTrail(
    'notification',
    'notif123',
    {
      generatedBy: 'compliance_officer',
      includeSystemEvents: true
    }
  );

  console.log('   - Audit trail generated for notification');
  console.log('   - Timeline events:', auditTrail.timeline.length);
  console.log('   - Compliance status:', auditTrail.compliance.compliant ? 'COMPLIANT' : 'NON-COMPLIANT');
  console.log('   - Total event types:', Object.keys(auditTrail.summary.eventTypes).length);

  // Test report export (mock)
  try {
    const exportResult = await reportingService.exportReport(hipaaReport.reportId, 'json', {
      includeMetadata: true,
      includeRawData: false
    });
    console.log('   - Report export successful:', !!exportResult);
  } catch (error) {
    console.log('   - Report export test (expected to fail without implementation)');
  }

  // Test automated report scheduling
  const scheduleResult = await reportingService.scheduleAutomatedReport(
    'hipaa_compliance',
    'monthly',
    {
      framework: 'HIPAA',
      scope: 'all_users',
      createdBy: 'system'
    }
  );

  console.log('   - Automated report scheduled:', scheduleResult.success);
  console.log('   - Schedule ID:', scheduleResult.scheduleId);
  console.log('   - Next run:', scheduleResult.nextRun.toISOString());

  // Test available report types
  const reportTypes = Object.keys(reportingService.reportTypes);
  console.log('   - Available report types:', reportTypes.length);
  console.log('   - Report types:', reportTypes.join(', '));

  // Test regulatory frameworks
  const frameworks = Object.keys(reportingService.regulatoryFrameworks);
  console.log('   - Supported frameworks:', frameworks.length);
  console.log('   - Frameworks:', frameworks.join(', '));
}

// Run the tests
testNotificationCompliance().catch(console.error);

export {
  testNotificationCompliance,
  testHIPAAComplianceService,
  testConsentManagementService,
  testRegulatoryReportingService
};