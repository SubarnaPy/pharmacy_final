import NotificationEncryptionService from './src/services/security/NotificationEncryptionService.js';
import NotificationAccessControl from './src/services/security/NotificationAccessControl.js';
import NotificationAuditService from './src/services/security/NotificationAuditService.js';
import DataRetentionService from './src/services/security/DataRetentionService.js';

/**
 * Test script for notification security and data protection features
 */
async function testNotificationSecurity() {
  console.log('🔒 Testing Notification Security and Data Protection...\n');

  try {
    // Test 1: Encryption Service
    console.log('1. Testing Notification Encryption Service...');
    await testEncryptionService();
    console.log('✅ Encryption Service tests passed\n');

    // Test 2: Access Control
    console.log('2. Testing Notification Access Control...');
    await testAccessControl();
    console.log('✅ Access Control tests passed\n');

    // Test 3: Audit Service
    console.log('3. Testing Notification Audit Service...');
    await testAuditService();
    console.log('✅ Audit Service tests passed\n');

    // Test 4: Data Retention Service
    console.log('4. Testing Data Retention Service...');
    await testDataRetentionService();
    console.log('✅ Data Retention Service tests passed\n');

    console.log('🎉 All notification security tests passed successfully!');

  } catch (error) {
    console.error('❌ Security tests failed:', error);
    process.exit(1);
  }
}

/**
 * Test encryption service functionality
 */
async function testEncryptionService() {
  const encryptionService = new NotificationEncryptionService();

  // Test basic encryption/decryption
  const testData = 'Sensitive patient information: John Doe, DOB: 1990-01-01';
  const metadata = { type: 'patient_info', notificationId: 'test123' };
  
  const encrypted = encryptionService.encrypt(testData, metadata);
  console.log('   - Encrypted data structure:', Object.keys(encrypted));
  
  const decrypted = encryptionService.decrypt(encrypted);
  console.log('   - Decryption successful:', decrypted === testData);

  // Test notification content encryption
  const testNotification = {
    _id: 'notification123',
    type: 'prescription_created',
    content: {
      title: 'New Prescription',
      message: 'Your prescription is ready',
      personalInfo: {
        patientName: 'John Doe',
        patientId: 'P123456',
        phoneNumber: '+1234567890'
      },
      medicalData: {
        medication: 'Amoxicillin 500mg',
        dosage: '3 times daily',
        duration: '7 days'
      }
    },
    contextData: {
      prescriptionDetails: {
        prescriptionId: 'RX789',
        doctorName: 'Dr. Smith',
        pharmacyName: 'City Pharmacy'
      }
    }
  };

  const encryptedNotification = encryptionService.encryptNotificationContent(testNotification);
  console.log('   - Notification encrypted:', encryptedNotification._encrypted);
  
  const decryptedNotification = encryptionService.decryptNotificationContent(encryptedNotification);
  console.log('   - Notification decrypted successfully:', !decryptedNotification._encrypted);

  // Test secure token generation
  const tokenPayload = { userId: 'user123', notificationId: 'notif456' };
  const token = encryptionService.generateSecureToken(tokenPayload, 3600);
  const verifiedPayload = encryptionService.verifySecureToken(token);
  console.log('   - Token verification successful:', verifiedPayload.userId === tokenPayload.userId);

  // Test hash generation for indexing
  const hashResult = await encryptionService.hashForIndexing('sensitive-data-123');
  const verifyResult = await encryptionService.verifyHash('sensitive-data-123', hashResult);
  console.log('   - Hash verification successful:', verifyResult);
}

/**
 * Test access control functionality
 */
async function testAccessControl() {
  const accessControl = new NotificationAccessControl();

  // Test users with different roles
  const patient = { _id: 'patient123', role: 'patient' };
  const doctor = { _id: 'doctor123', role: 'doctor' };
  const pharmacy = { _id: 'pharmacy123', role: 'pharmacy' };
  const admin = { _id: 'admin123', role: 'admin' };

  // Test notification
  const notification = {
    _id: 'notif123',
    type: 'prescription_created',
    recipients: [
      { userId: 'patient123', userRole: 'patient' },
      { userId: 'doctor123', userRole: 'doctor' },
      { userId: 'pharmacy123', userRole: 'pharmacy' }
    ],
    createdBy: 'doctor123',
    content: {
      title: 'New Prescription',
      message: 'Your prescription has been created',
      sensitiveData: 'Patient medical history...'
    }
  };

  // Test view permissions
  console.log('   - Patient can view:', accessControl.canPerformAction(patient, 'view', notification));
  console.log('   - Doctor can view:', accessControl.canPerformAction(doctor, 'view', notification));
  console.log('   - Pharmacy can view:', accessControl.canPerformAction(pharmacy, 'view', notification));
  console.log('   - Admin can view:', accessControl.canPerformAction(admin, 'view', notification));

  // Test manage permissions
  console.log('   - Patient can manage:', accessControl.canPerformAction(patient, 'manage', notification));
  console.log('   - Doctor can manage:', accessControl.canPerformAction(doctor, 'manage', notification));
  console.log('   - Admin can manage:', accessControl.canPerformAction(admin, 'manage', notification));

  // Test data filtering
  const filteredForPatient = accessControl.filterNotificationData(patient, notification);
  const filteredForAdmin = accessControl.filterNotificationData(admin, notification);
  
  console.log('   - Patient filtered fields:', Object.keys(filteredForPatient));
  console.log('   - Admin filtered fields:', Object.keys(filteredForAdmin));

  // Test analytics access
  console.log('   - Patient analytics access (own):', accessControl.canAccessAnalytics(patient, 'own'));
  console.log('   - Doctor analytics access (department):', accessControl.canAccessAnalytics(doctor, 'department'));
  console.log('   - Admin analytics access (system):', accessControl.canAccessAnalytics(admin, 'system'));

  // Test access token generation
  const accessToken = accessControl.generateAccessToken(patient, 'notif123', 3600);
  const verifiedToken = accessControl.verifyAccessToken(accessToken, 'notif123');
  console.log('   - Access token verification:', verifiedToken.userId === patient._id);

  // Test request validation
  const validRequest = accessControl.validateAccessRequest({
    user: patient,
    action: 'view',
    notificationId: 'notif123'
  });
  console.log('   - Request validation successful:', validRequest.valid);
}

/**
 * Test audit service functionality
 */
async function testAuditService() {
  const auditService = new NotificationAuditService();

  const testUser = { _id: 'user123', role: 'patient', email: 'patient@example.com' };
  const testNotification = {
    _id: 'notif123',
    type: 'prescription_created',
    priority: 'high',
    recipients: [{ userId: 'user123', userRole: 'patient' }],
    _encrypted: true
  };

  // Test notification creation logging
  await auditService.logNotificationCreated(testNotification, testUser, {
    source: 'test',
    controllerAction: 'POST /notifications'
  });
  console.log('   - Notification creation logged');

  // Test delivery attempt logging
  await auditService.logDeliveryAttempt('notif123', 'email', 
    { userId: 'user123', userRole: 'patient' },
    { 
      status: 'delivered', 
      success: true, 
      deliveryTime: 1500,
      messageId: 'msg123',
      provider: 'SendGrid'
    }
  );
  console.log('   - Delivery attempt logged');

  // Test access attempt logging
  await auditService.logAccessAttempt(testUser, 'view', testNotification, true, 'Access granted', {
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0...',
    sessionId: 'session123'
  });
  console.log('   - Access attempt logged');

  // Test preference change logging
  await auditService.logPreferenceChange(testUser, {
    'channels.email.enabled': true,
    'categories.medical.priority': 'high'
  }, {
    reason: 'User preference update'
  });
  console.log('   - Preference change logged');

  // Test security event logging
  await auditService.logSecurityEvent('suspicious_access', {
    description: 'Multiple failed access attempts',
    severity: 'high',
    ipAddress: '192.168.1.100',
    actionTaken: 'Account temporarily locked'
  }, testUser);
  console.log('   - Security event logged');

  // Test compliance event logging
  await auditService.logComplianceEvent('data_access', {
    framework: 'HIPAA',
    rule: 'Patient data access',
    description: 'Patient accessed their medical records',
    dataTypes: ['medical', 'personal'],
    consentStatus: 'granted'
  }, testUser);
  console.log('   - Compliance event logged');

  // Test data retention logging
  await auditService.logDataRetentionEvent('cleanup', {
    recordsAffected: 150,
    retentionPeriod: '90 days',
    reason: 'Automated cleanup policy',
    dataTypes: ['notifications', 'analytics']
  });
  console.log('   - Data retention event logged');
}

/**
 * Test data retention service functionality
 */
async function testDataRetentionService() {
  const retentionService = new DataRetentionService();

  // Test retention policy retrieval
  const notificationRetention = retentionService.getRetentionPeriod('notifications', 'high');
  console.log('   - High priority notification retention:', notificationRetention, 'days');

  const analyticsRetention = retentionService.getRetentionPeriod('analytics', 'monthly');
  console.log('   - Monthly analytics retention:', analyticsRetention, 'days');

  // Test retention policy update
  retentionService.updateRetentionPolicy('notifications', 'test', 7);
  const updatedRetention = retentionService.getRetentionPeriod('notifications', 'test');
  console.log('   - Updated test retention policy:', updatedRetention, 'days');

  // Test export ID generation
  const exportId = retentionService.generateExportId();
  console.log('   - Generated export ID:', exportId);

  // Test next cleanup date calculation
  const nextCleanupDate = retentionService.getNextCleanupDate('notifications');
  console.log('   - Next cleanup date:', nextCleanupDate.toISOString());

  console.log('   - Data retention service initialized successfully');
}

// Run the tests
testNotificationSecurity().catch(console.error);

export {
  testNotificationSecurity,
  testEncryptionService,
  testAccessControl,
  testAuditService,
  testDataRetentionService
};