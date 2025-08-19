import ComplianceIntegrationService from './src/services/compliance/ComplianceIntegrationService.js';

/**
 * Test script for the complete compliance integration service
 */
async function testComplianceIntegration() {
  console.log('🔐 Testing Complete Compliance Integration...\n');

  try {
    const complianceService = new ComplianceIntegrationService();
    
    // Initialize the service
    console.log('Initializing Compliance Integration Service...');
    await complianceService.initialize();
    console.log('✅ Service initialized successfully\n');

    // Test 1: Process notification with full compliance checks
    console.log('1. Testing notification processing with compliance checks...');
    await testNotificationProcessing(complianceService);
    console.log('✅ Notification processing tests passed\n');

    // Test 2: Generate comprehensive compliance report
    console.log('2. Testing comprehensive compliance reporting...');
    await testComprehensiveReporting(complianceService);
    console.log('✅ Comprehensive reporting tests passed\n');

    // Test 3: Perform compliance health check
    console.log('3. Testing compliance health check...');
    await testComplianceHealthCheck(complianceService);
    console.log('✅ Health check tests passed\n');

    console.log('🎉 All compliance integration tests passed successfully!');

  } catch (error) {
    console.error('❌ Compliance integration tests failed:', error);
    process.exit(1);
  }
}

/**
 * Test notification processing with compliance
 */
async function testNotificationProcessing(complianceService) {
  // Test notification with various compliance challenges
  const testNotification = {
    _id: 'notif_compliance_test_123',
    type: 'prescription_created',
    priority: 'high',
    recipients: [
      { 
        userId: 'patient123', 
        userRole: 'patient',
        deliveryChannels: ['email', 'sms']
      },
      { 
        userId: 'doctor456', 
        userRole: 'doctor',
        deliveryChannels: ['email']
      },
      { 
        userId: 'pharmacy789', 
        userRole: 'pharmacy',
        deliveryChannels: ['email', 'websocket']
      }
    ],
    content: {
      title: 'New Prescription Ready',
      message: 'Your prescription for Amoxicillin 500mg is ready for pickup',
      personalInfo: {
        patientName: 'John Doe',
        patientId: 'P123456',
        dateOfBirth: '1990-01-15',
        phoneNumber: '555-123-4567',
        email: 'john.doe@email.com'
      },
      medicalData: {
        medication: 'Amoxicillin 500mg',
        dosage: '3 times daily',
        duration: '7 days',
        diagnosis: 'Bacterial infection',
        prescribingDoctor: 'Dr. Smith'
      },
      pharmacyInfo: {
        pharmacyName: 'City Pharmacy',
        address: '123 Main St, Anytown, CA 90210',
        phoneNumber: '555-987-6543'
      }
    },
    contextData: {
      prescriptionDetails: {
        prescriptionId: 'RX789456',
        issueDate: new Date(),
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      },
      systemMetadata: {
        source: 'prescription_system',
        version: '2.1',
        processingTime: new Date()
      }
    }
  };

  const context = {
    user: { _id: 'system', role: 'system' },
    source: 'prescription_management',
    ipAddress: '192.168.1.100',
    userAgent: 'HealthSystem/2.1'
  };

  // Process notification with full compliance
  const processingResult = await complianceService.processNotificationWithCompliance(
    testNotification, 
    context
  );

  console.log('   - Processing successful:', processingResult.success);
  console.log('   - HIPAA compliant:', processingResult.compliance.hipaa?.compliant || false);
  console.log('   - Consent valid:', processingResult.compliance.consent?.valid || false);
  console.log('   - Security measures applied:', processingResult.compliance.security?.securityMeasures?.length || 0);
  console.log('   - Errors found:', processingResult.errors.length);
  console.log('   - Warnings issued:', processingResult.warnings.length);
  console.log('   - Recommendations provided:', processingResult.recommendations?.length || 0);

  // Test with a compliant notification
  const compliantNotification = {
    _id: 'notif_compliant_123',
    type: 'appointment_reminder',
    priority: 'medium',
    recipients: [
      { 
        userId: 'patient123', 
        userRole: 'patient',
        deliveryChannels: ['email']
      }
    ],
    content: {
      title: 'Appointment Reminder',
      message: 'You have an appointment tomorrow at 2:00 PM with Dr. Smith',
      appointmentDetails: {
        date: '2024-08-16',
        time: '14:00',
        doctorName: 'Dr. Smith',
        location: 'Medical Center, Room 205'
      }
    }
  };

  const compliantResult = await complianceService.processNotificationWithCompliance(
    compliantNotification,
    context
  );

  console.log('   - Compliant notification processing:', compliantResult.success);
  console.log('   - Compliant notification errors:', compliantResult.errors.length);
}

/**
 * Test comprehensive compliance reporting
 */
async function testComprehensiveReporting(complianceService) {
  const reportCriteria = {
    period: {
      start: new Date('2024-01-01'),
      end: new Date('2024-01-31')
    },
    generatedBy: 'compliance_officer',
    framework: 'HIPAA',
    scope: 'all_notifications',
    includeRawData: false,
    includeTechnicalDetails: true
  };

  const comprehensiveReport = await complianceService.generateComprehensiveComplianceReport(
    reportCriteria
  );

  console.log('   - Report generated:', comprehensiveReport.reportId);
  console.log('   - Report type:', comprehensiveReport.reportType);
  console.log('   - Individual reports included:', Object.keys(comprehensiveReport.reports).length);
  console.log('   - Overall compliance score:', comprehensiveReport.consolidatedMetrics.overallComplianceScore + '%');
  console.log('   - Critical issues:', comprehensiveReport.consolidatedMetrics.criticalIssues);
  console.log('   - Executive summary status:', comprehensiveReport.executiveSummary.status);
  console.log('   - Key findings:', comprehensiveReport.executiveSummary.keyFindings.length);
  console.log('   - Immediate actions:', comprehensiveReport.executiveSummary.immediateActions.length);
  console.log('   - Strategic recommendations:', comprehensiveReport.executiveSummary.strategicRecommendations.length);
}

/**
 * Test compliance health check
 */
async function testComplianceHealthCheck(complianceService) {
  const healthCheck = await complianceService.performComplianceHealthCheck();

  console.log('   - Health check timestamp:', healthCheck.timestamp.toISOString());
  console.log('   - Overall health status:', healthCheck.overall);
  console.log('   - Services checked:', Object.keys(healthCheck.services).length);
  
  // Display individual service health
  Object.entries(healthCheck.services).forEach(([service, status]) => {
    console.log(`   - ${service} service: ${status}`);
  });

  console.log('   - Issues identified:', healthCheck.issues.length);
  console.log('   - Recommendations provided:', healthCheck.recommendations.length);

  // Display recommendations if any
  if (healthCheck.recommendations.length > 0) {
    console.log('   - Health recommendations:');
    healthCheck.recommendations.forEach((rec, index) => {
      console.log(`     ${index + 1}. ${rec.recommendation || rec.message}`);
    });
  }
}

// Run the tests
testComplianceIntegration().catch(console.error);

export {
  testComplianceIntegration,
  testNotificationProcessing,
  testComprehensiveReporting,
  testComplianceHealthCheck
};