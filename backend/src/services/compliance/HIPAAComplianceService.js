import mongoose from 'mongoose';

/**
 * Service for HIPAA compliance features in healthcare notifications
 * Implements healthcare-specific privacy and security requirements
 */
class HIPAAComplianceService {
  constructor() {
    this.complianceRules = {
      // Minimum necessary rule - only send required information
      minimumNecessary: {
        'prescription_created': {
          patient: ['medicationName', 'pharmacyName', 'pickupInstructions'],
          pharmacy: ['patientName', 'prescriptionDetails', 'doctorInfo'],
          doctor: ['patientName', 'prescriptionStatus', 'pharmacyResponse']
        },
        'appointment_scheduled': {
          patient: ['doctorName', 'appointmentTime', 'location'],
          doctor: ['patientName', 'appointmentTime', 'appointmentType']
        },
        'test_results': {
          patient: ['testType', 'resultsAvailable', 'doctorContact'],
          doctor: ['patientName', 'testResults', 'followUpRequired']
        }
      },

      // PHI (Protected Health Information) classification
      phiClassification: {
        'direct_identifiers': [
          'name', 'address', 'phone', 'email', 'ssn', 'medicalRecordNumber',
          'accountNumber', 'certificateNumber', 'vehicleIdentifier', 'deviceIdentifier',
          'webUrl', 'ipAddress', 'biometricIdentifier', 'facePhoto', 'fingerprint'
        ],
        'quasi_identifiers': [
          'birthDate', 'admissionDate', 'dischargeDate', 'deathDate', 'age',
          'zipCode', 'elements'
        ],
        'sensitive_health_data': [
          'diagnosis', 'treatment', 'medication', 'testResults', 'mentalHealth',
          'substanceAbuse', 'geneticInfo', 'reproductiveHealth'
        ]
      },

      // Data retention requirements
      retentionRequirements: {
        'medical_records': 2555, // 7 years minimum
        'audit_logs': 2555, // 7 years minimum
        'consent_records': 2555, // 7 years minimum
        'breach_notifications': 2555, // 7 years minimum
        'access_logs': 2190 // 6 years minimum
      }
    };

    this.consentTypes = {
      'treatment': 'Consent for treatment and care coordination',
      'payment': 'Consent for payment processing and billing',
      'operations': 'Consent for healthcare operations and quality improvement',
      'marketing': 'Consent for marketing communications',
      'research': 'Consent for research and clinical studies',
      'directory': 'Consent for facility directory listing'
    };
  }

  /**
   * Validate notification for HIPAA compliance
   * @param {Object} notification - Notification to validate
   * @param {Object} context - Validation context
   * @returns {Object} Validation result
   */
  async validateNotificationCompliance(notification, context = {}) {
    const validationResult = {
      compliant: true,
      violations: [],
      warnings: [],
      recommendations: [],
      phiDetected: false,
      consentRequired: false
    };

    try {
      // Check for PHI in notification content
      const phiCheck = this.detectPHI(notification);
      validationResult.phiDetected = phiCheck.detected;
      
      if (phiCheck.detected) {
        validationResult.violations.push(...phiCheck.violations);
        validationResult.warnings.push(...phiCheck.warnings);
      }

      // Validate minimum necessary rule
      const minimumNecessaryCheck = this.validateMinimumNecessary(notification, context);
      if (!minimumNecessaryCheck.compliant) {
        validationResult.compliant = false;
        validationResult.violations.push(...minimumNecessaryCheck.violations);
      }

      // Check consent requirements
      const consentCheck = await this.checkConsentRequirements(notification, context);
      validationResult.consentRequired = consentCheck.required;
      
      if (consentCheck.required && !consentCheck.obtained) {
        validationResult.compliant = false;
        validationResult.violations.push({
          type: 'consent_required',
          message: 'Valid consent required for this notification',
          severity: 'high'
        });
      }

      // Validate recipient authorization
      const authorizationCheck = await this.validateRecipientAuthorization(notification, context);
      if (!authorizationCheck.authorized) {
        validationResult.compliant = false;
        validationResult.violations.push(...authorizationCheck.violations);
      }

      // Check for business associate requirements
      const baCheck = this.checkBusinessAssociateRequirements(notification, context);
      if (baCheck.required && !baCheck.compliant) {
        validationResult.warnings.push(...baCheck.warnings);
      }

      // Generate recommendations
      validationResult.recommendations = this.generateComplianceRecommendations(
        notification, 
        validationResult
      );

    } catch (error) {
      validationResult.compliant = false;
      validationResult.violations.push({
        type: 'validation_error',
        message: `Compliance validation failed: ${error.message}`,
        severity: 'critical'
      });
    }

    return validationResult;
  }

  /**
   * Detect Protected Health Information (PHI) in notification
   * @param {Object} notification - Notification to analyze
   * @returns {Object} PHI detection result
   */
  detectPHI(notification) {
    const result = {
      detected: false,
      violations: [],
      warnings: [],
      phiElements: []
    };

    const content = JSON.stringify(notification);
    const phiPatterns = {
      // Direct identifiers patterns
      ssn: /\b\d{3}-?\d{2}-?\d{4}\b/g,
      phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
      email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      medicalRecordNumber: /\b(MRN|MR|RECORD)\s*:?\s*\d+\b/gi,
      zipCode: /\b\d{5}(-\d{4})?\b/g,
      
      // Dates that could be PHI
      dates: /\b\d{1,2}\/\d{1,2}\/\d{4}\b|\b\d{4}-\d{2}-\d{2}\b/g,
      
      // Common health-related terms
      diagnosis: /\b(diagnosis|diagnosed|condition|disorder|disease)\b/gi,
      medication: /\b(medication|prescription|drug|pill|tablet|capsule)\b/gi,
      treatment: /\b(treatment|therapy|procedure|surgery|operation)\b/gi
    };

    // Check for direct PHI patterns
    for (const [type, pattern] of Object.entries(phiPatterns)) {
      const matches = content.match(pattern);
      if (matches) {
        result.detected = true;
        result.phiElements.push({
          type: type,
          count: matches.length,
          examples: matches.slice(0, 3) // First 3 examples
        });

        if (['ssn', 'medicalRecordNumber'].includes(type)) {
          result.violations.push({
            type: 'direct_identifier',
            message: `Direct identifier detected: ${type}`,
            severity: 'critical'
          });
        } else {
          result.warnings.push({
            type: 'potential_phi',
            message: `Potential PHI detected: ${type}`,
            severity: 'medium'
          });
        }
      }
    }

    // Check for sensitive field names
    const sensitiveFields = this.complianceRules.phiClassification.sensitive_health_data;
    const fieldNames = this.extractFieldNames(notification);
    
    for (const field of fieldNames) {
      if (sensitiveFields.some(sensitive => field.toLowerCase().includes(sensitive))) {
        result.detected = true;
        result.warnings.push({
          type: 'sensitive_field',
          message: `Sensitive health data field detected: ${field}`,
          severity: 'medium'
        });
      }
    }

    return result;
  }

  /**
   * Validate minimum necessary rule compliance
   * @param {Object} notification - Notification to validate
   * @param {Object} context - Validation context
   * @returns {Object} Validation result
   */
  validateMinimumNecessary(notification, context) {
    const result = {
      compliant: true,
      violations: []
    };

    const notificationType = notification.type;
    const minimumRules = this.complianceRules.minimumNecessary[notificationType];

    if (!minimumRules) {
      // No specific rules defined, apply general principle
      result.violations.push({
        type: 'minimum_necessary_undefined',
        message: `No minimum necessary rules defined for ${notificationType}`,
        severity: 'low'
      });
      return result;
    }

    // Check each recipient type
    notification.recipients?.forEach(recipient => {
      const allowedFields = minimumRules[recipient.userRole];
      if (!allowedFields) {
        result.violations.push({
          type: 'recipient_role_undefined',
          message: `No minimum necessary rules for role: ${recipient.userRole}`,
          severity: 'medium'
        });
        return;
      }

      // Check if notification contains only necessary information
      const contentFields = this.extractFieldNames(notification.content);
      const unnecessaryFields = contentFields.filter(field => 
        !allowedFields.some(allowed => field.toLowerCase().includes(allowed.toLowerCase()))
      );

      if (unnecessaryFields.length > 0) {
        result.compliant = false;
        result.violations.push({
          type: 'unnecessary_information',
          message: `Unnecessary information for ${recipient.userRole}: ${unnecessaryFields.join(', ')}`,
          severity: 'medium',
          recipientRole: recipient.userRole
        });
      }
    });

    return result;
  }

  /**
   * Check consent requirements for notification
   * @param {Object} notification - Notification to check
   * @param {Object} context - Context with user and consent information
   * @returns {Object} Consent check result
   */
  async checkConsentRequirements(notification, context) {
    const result = {
      required: false,
      obtained: false,
      consentTypes: [],
      violations: []
    };

    // Determine required consent types based on notification
    const requiredConsents = this.determineRequiredConsents(notification);
    result.consentTypes = requiredConsents;
    result.required = requiredConsents.length > 0;

    if (result.required) {
      // Check if consent has been obtained
      const consentStatus = await this.getConsentStatus(
        context.patientId || context.userId,
        requiredConsents
      );

      result.obtained = consentStatus.allObtained;
      
      if (!result.obtained) {
        result.violations.push({
          type: 'missing_consent',
          message: `Missing consent for: ${consentStatus.missing.join(', ')}`,
          severity: 'critical',
          missingConsents: consentStatus.missing
        });
      }
    }

    return result;
  }

  /**
   * Validate recipient authorization
   * @param {Object} notification - Notification to validate
   * @param {Object} context - Validation context
   * @returns {Object} Authorization result
   */
  async validateRecipientAuthorization(notification, context) {
    const result = {
      authorized: true,
      violations: []
    };

    for (const recipient of notification.recipients || []) {
      // Check if recipient is authorized to receive this type of information
      const authCheck = await this.checkRecipientAuthorization(
        recipient,
        notification,
        context
      );

      if (!authCheck.authorized) {
        result.authorized = false;
        result.violations.push({
          type: 'unauthorized_recipient',
          message: `Recipient ${recipient.userId} not authorized for ${notification.type}`,
          severity: 'critical',
          recipientId: recipient.userId,
          reason: authCheck.reason
        });
      }
    }

    return result;
  }

  /**
   * Check business associate requirements
   * @param {Object} notification - Notification to check
   * @param {Object} context - Context information
   * @returns {Object} Business associate check result
   */
  checkBusinessAssociateRequirements(notification, context) {
    const result = {
      required: false,
      compliant: true,
      warnings: []
    };

    // Check if notification involves third-party services
    const thirdPartyServices = this.identifyThirdPartyServices(notification);
    
    if (thirdPartyServices.length > 0) {
      result.required = true;
      
      // Check if BAAs are in place
      for (const service of thirdPartyServices) {
        const baaStatus = this.checkBAA(service);
        if (!baaStatus.active) {
          result.compliant = false;
          result.warnings.push({
            type: 'missing_baa',
            message: `Business Associate Agreement required for ${service}`,
            severity: 'high',
            service: service
          });
        }
      }
    }

    return result;
  }

  /**
   * Generate compliance recommendations
   * @param {Object} notification - Notification object
   * @param {Object} validationResult - Validation result
   * @returns {Array} Recommendations
   */
  generateComplianceRecommendations(notification, validationResult) {
    const recommendations = [];

    if (validationResult.phiDetected) {
      recommendations.push({
        type: 'encryption',
        message: 'Consider encrypting notification content containing PHI',
        priority: 'high'
      });

      recommendations.push({
        type: 'access_controls',
        message: 'Implement role-based access controls for PHI access',
        priority: 'high'
      });
    }

    if (validationResult.violations.some(v => v.type === 'unnecessary_information')) {
      recommendations.push({
        type: 'data_minimization',
        message: 'Review notification content to include only minimum necessary information',
        priority: 'medium'
      });
    }

    if (validationResult.consentRequired) {
      recommendations.push({
        type: 'consent_management',
        message: 'Implement consent management system for notification preferences',
        priority: 'high'
      });
    }

    recommendations.push({
      type: 'audit_logging',
      message: 'Ensure all notification activities are logged for audit purposes',
      priority: 'medium'
    });

    return recommendations;
  }

  /**
   * Create HIPAA breach notification
   * @param {Object} breachDetails - Details of the breach
   * @returns {Object} Breach notification
   */
  async createBreachNotification(breachDetails) {
    const breachNotification = {
      breachId: this.generateBreachId(),
      reportedAt: new Date(),
      discoveredAt: breachDetails.discoveredAt,
      
      // Breach classification
      severity: this.classifyBreachSeverity(breachDetails),
      affectedRecords: breachDetails.affectedRecords || 0,
      affectedIndividuals: breachDetails.affectedIndividuals || [],
      
      // Breach details
      description: breachDetails.description,
      causeOfBreach: breachDetails.cause,
      locationOfBreach: breachDetails.location,
      
      // PHI involved
      phiInvolved: breachDetails.phiTypes || [],
      safeguardsInPlace: breachDetails.safeguards || [],
      
      // Response actions
      immediateActions: breachDetails.immediateActions || [],
      correctiveActions: breachDetails.correctiveActions || [],
      
      // Notification requirements
      notificationRequired: {
        individuals: this.requiresIndividualNotification(breachDetails),
        hhs: this.requiresHHSNotification(breachDetails),
        media: this.requiresMediaNotification(breachDetails)
      },
      
      // Timeline
      notificationDeadlines: this.calculateNotificationDeadlines(breachDetails),
      
      // Status
      status: 'reported',
      investigationStatus: 'ongoing'
    };

    // Save breach notification
    await this.saveBreachNotification(breachNotification);
    
    // Trigger required notifications
    await this.triggerBreachNotifications(breachNotification);

    return breachNotification;
  }

  /**
   * Generate compliance report
   * @param {Object} criteria - Report criteria
   * @returns {Object} Compliance report
   */
  async generateComplianceReport(criteria = {}) {
    const report = {
      reportId: this.generateReportId(),
      generatedAt: new Date(),
      reportPeriod: criteria.period || 'monthly',
      
      // Compliance metrics
      metrics: {
        totalNotifications: 0,
        compliantNotifications: 0,
        violationsDetected: 0,
        phiExposures: 0,
        consentViolations: 0,
        accessViolations: 0
      },
      
      // Violation breakdown
      violations: {
        byType: {},
        bySeverity: {},
        byDepartment: {}
      },
      
      // Trends
      trends: {
        complianceRate: [],
        violationTrends: [],
        improvementAreas: []
      },
      
      // Recommendations
      recommendations: [],
      
      // Action items
      actionItems: []
    };

    // Populate report data
    await this.populateComplianceMetrics(report, criteria);
    await this.analyzeComplianceTrends(report, criteria);
    
    return report;
  }

  // Helper methods

  /**
   * Extract field names from object recursively
   * @param {Object} obj - Object to analyze
   * @returns {Array} Field names
   */
  extractFieldNames(obj, prefix = '') {
    const fields = [];
    
    if (!obj || typeof obj !== 'object') return fields;
    
    for (const [key, value] of Object.entries(obj)) {
      const fieldName = prefix ? `${prefix}.${key}` : key;
      fields.push(fieldName);
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        fields.push(...this.extractFieldNames(value, fieldName));
      }
    }
    
    return fields;
  }

  /**
   * Determine required consent types for notification
   * @param {Object} notification - Notification object
   * @returns {Array} Required consent types
   */
  determineRequiredConsents(notification) {
    const consents = [];
    
    // Always require treatment consent for medical notifications
    if (this.isMedicalNotification(notification)) {
      consents.push('treatment');
    }
    
    // Require payment consent for billing notifications
    if (this.isPaymentNotification(notification)) {
      consents.push('payment');
    }
    
    // Require marketing consent for promotional notifications
    if (this.isMarketingNotification(notification)) {
      consents.push('marketing');
    }
    
    return consents;
  }

  /**
   * Get consent status for user
   * @param {string} userId - User ID
   * @param {Array} consentTypes - Required consent types
   * @returns {Object} Consent status
   */
  async getConsentStatus(userId, consentTypes) {
    // This would query the consent management system
    // For now, return mock data
    const mockConsents = ['treatment', 'payment']; // User has these consents
    
    const missing = consentTypes.filter(type => !mockConsents.includes(type));
    
    return {
      allObtained: missing.length === 0,
      obtained: mockConsents.filter(c => consentTypes.includes(c)),
      missing: missing
    };
  }

  /**
   * Check if recipient is authorized
   * @param {Object} recipient - Recipient object
   * @param {Object} notification - Notification object
   * @param {Object} context - Context object
   * @returns {Object} Authorization result
   */
  async checkRecipientAuthorization(recipient, notification, context) {
    // This would check authorization rules
    // For now, return authorized for all
    return {
      authorized: true,
      reason: 'Authorized by role-based access control'
    };
  }

  /**
   * Identify third-party services in notification
   * @param {Object} notification - Notification object
   * @returns {Array} Third-party services
   */
  identifyThirdPartyServices(notification) {
    const services = [];
    
    // Check delivery channels for third-party services
    if (notification.deliveryChannels?.includes('email')) {
      services.push('email_service');
    }
    
    if (notification.deliveryChannels?.includes('sms')) {
      services.push('sms_service');
    }
    
    return services;
  }

  /**
   * Check Business Associate Agreement status
   * @param {string} service - Service name
   * @returns {Object} BAA status
   */
  checkBAA(service) {
    // This would check BAA database
    // For now, return active for all
    return {
      active: true,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
    };
  }

  /**
   * Check if notification is medical
   * @param {Object} notification - Notification object
   * @returns {boolean} Is medical notification
   */
  isMedicalNotification(notification) {
    const medicalTypes = [
      'prescription_created', 'appointment_scheduled', 'test_results',
      'diagnosis_update', 'treatment_plan', 'medical_alert'
    ];
    return medicalTypes.includes(notification.type);
  }

  /**
   * Check if notification is payment-related
   * @param {Object} notification - Notification object
   * @returns {boolean} Is payment notification
   */
  isPaymentNotification(notification) {
    const paymentTypes = [
      'payment_due', 'payment_processed', 'insurance_claim',
      'billing_statement', 'payment_reminder'
    ];
    return paymentTypes.includes(notification.type);
  }

  /**
   * Check if notification is marketing
   * @param {Object} notification - Notification object
   * @returns {boolean} Is marketing notification
   */
  isMarketingNotification(notification) {
    const marketingTypes = [
      'promotional_offer', 'health_tips', 'service_announcement',
      'newsletter', 'wellness_program'
    ];
    return marketingTypes.includes(notification.type);
  }

  /**
   * Generate unique breach ID
   * @returns {string} Breach ID
   */
  generateBreachId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    return `BREACH_${timestamp}_${random}`.toUpperCase();
  }

  /**
   * Generate unique report ID
   * @returns {string} Report ID
   */
  generateReportId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    return `REPORT_${timestamp}_${random}`.toUpperCase();
  }

  /**
   * Classify breach severity
   * @param {Object} breachDetails - Breach details
   * @returns {string} Severity level
   */
  classifyBreachSeverity(breachDetails) {
    if (breachDetails.affectedRecords > 500) return 'critical';
    if (breachDetails.affectedRecords > 100) return 'high';
    if (breachDetails.affectedRecords > 10) return 'medium';
    return 'low';
  }

  /**
   * Check if individual notification is required
   * @param {Object} breachDetails - Breach details
   * @returns {boolean} Notification required
   */
  requiresIndividualNotification(breachDetails) {
    // Required for all breaches affecting individuals
    return breachDetails.affectedIndividuals?.length > 0;
  }

  /**
   * Check if HHS notification is required
   * @param {Object} breachDetails - Breach details
   * @returns {boolean} Notification required
   */
  requiresHHSNotification(breachDetails) {
    // Required for breaches affecting 500+ individuals
    return breachDetails.affectedRecords >= 500;
  }

  /**
   * Check if media notification is required
   * @param {Object} breachDetails - Breach details
   * @returns {boolean} Notification required
   */
  requiresMediaNotification(breachDetails) {
    // Required for large breaches in certain jurisdictions
    return breachDetails.affectedRecords >= 500;
  }

  /**
   * Calculate notification deadlines
   * @param {Object} breachDetails - Breach details
   * @returns {Object} Notification deadlines
   */
  calculateNotificationDeadlines(breachDetails) {
    const discoveryDate = new Date(breachDetails.discoveredAt);
    
    return {
      individuals: new Date(discoveryDate.getTime() + 60 * 24 * 60 * 60 * 1000), // 60 days
      hhs: new Date(discoveryDate.getTime() + 60 * 24 * 60 * 60 * 1000), // 60 days
      media: new Date(discoveryDate.getTime() + 60 * 24 * 60 * 60 * 1000) // 60 days
    };
  }

  /**
   * Save breach notification to database
   * @param {Object} breachNotification - Breach notification
   */
  async saveBreachNotification(breachNotification) {
    // This would save to database
    console.log('Breach notification saved:', breachNotification.breachId);
  }

  /**
   * Trigger required breach notifications
   * @param {Object} breachNotification - Breach notification
   */
  async triggerBreachNotifications(breachNotification) {
    // This would trigger actual notifications
    console.log('Breach notifications triggered for:', breachNotification.breachId);
  }

  /**
   * Populate compliance metrics in report
   * @param {Object} report - Report object
   * @param {Object} criteria - Report criteria
   */
  async populateComplianceMetrics(report, criteria) {
    // This would query actual data
    report.metrics = {
      totalNotifications: 1000,
      compliantNotifications: 950,
      violationsDetected: 50,
      phiExposures: 5,
      consentViolations: 15,
      accessViolations: 30
    };
  }

  /**
   * Analyze compliance trends
   * @param {Object} report - Report object
   * @param {Object} criteria - Report criteria
   */
  async analyzeComplianceTrends(report, criteria) {
    // This would analyze historical data
    report.trends = {
      complianceRate: [95, 94, 96, 95], // Last 4 periods
      violationTrends: ['decreasing'],
      improvementAreas: ['consent_management', 'data_minimization']
    };
  }
}

export default HIPAAComplianceService;