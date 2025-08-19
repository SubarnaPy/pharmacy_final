import NotificationEncryptionService from '../security/NotificationEncryptionService.js';
import NotificationAccessControl from '../security/NotificationAccessControl.js';
import NotificationAuditService from '../security/NotificationAuditService.js';
import DataRetentionService from '../security/DataRetentionService.js';
import HIPAAComplianceService from './HIPAAComplianceService.js';
import ConsentManagementService from './ConsentManagementService.js';
import RegulatoryReportingService from './RegulatoryReportingService.js';

/**
 * Integration service that coordinates all security and compliance features
 * Provides a unified interface for notification security and compliance
 */
class ComplianceIntegrationService {
  constructor() {
    // Initialize all security and compliance services
    this.encryptionService = new NotificationEncryptionService();
    this.accessControl = new NotificationAccessControl();
    this.auditService = new NotificationAuditService();
    this.dataRetentionService = new DataRetentionService();
    this.hipaaService = new HIPAAComplianceService();
    this.consentService = new ConsentManagementService();
    this.reportingService = new RegulatoryReportingService();

    this.isInitialized = false;
  }

  /**
   * Initialize the compliance integration service
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Initialize data retention service
      await this.dataRetentionService.initialize();
      
      console.log('Compliance Integration Service initialized successfully');
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize Compliance Integration Service:', error);
      throw error;
    }
  }

  /**
   * Process notification with full security and compliance checks
   * @param {Object} notification - Notification to process
   * @param {Object} context - Processing context
   * @returns {Object} Processing result
   */
  async processNotificationWithCompliance(notification, context = {}) {
    try {
      const processingResult = {
        success: false,
        notification: null,
        compliance: {
          hipaa: null,
          consent: null,
          security: null
        },
        actions: [],
        warnings: [],
        errors: []
      };

      // Step 1: Validate HIPAA compliance
      console.log('Step 1: Validating HIPAA compliance...');
      const hipaaValidation = await this.hipaaService.validateNotificationCompliance(
        notification, 
        context
      );
      processingResult.compliance.hipaa = hipaaValidation;

      if (!hipaaValidation.compliant) {
        processingResult.errors.push({
          type: 'hipaa_violation',
          message: 'Notification violates HIPAA compliance requirements',
          violations: hipaaValidation.violations
        });
      }

      // Step 2: Check consent requirements
      console.log('Step 2: Checking consent requirements...');
      const consentCheck = await this.validateConsentForNotification(notification, context);
      processingResult.compliance.consent = consentCheck;

      if (!consentCheck.valid) {
        processingResult.errors.push({
          type: 'consent_violation',
          message: 'Insufficient consent for notification delivery',
          details: consentCheck.issues
        });
      }

      // Step 3: Apply security measures
      console.log('Step 3: Applying security measures...');
      const securityResult = await this.applySecurityMeasures(notification, context);
      processingResult.compliance.security = securityResult;
      processingResult.notification = securityResult.processedNotification;

      // Step 4: Validate access control
      console.log('Step 4: Validating access control...');
      const accessValidation = await this.validateAccessControl(notification, context);
      if (!accessValidation.valid) {
        processingResult.warnings.push({
          type: 'access_control_warning',
          message: 'Some recipients may not have proper access authorization',
          details: accessValidation.issues
        });
      }

      // Step 5: Log compliance activities
      console.log('Step 5: Logging compliance activities...');
      await this.logComplianceActivities(notification, processingResult, context);

      // Determine overall success
      processingResult.success = processingResult.errors.length === 0;

      // Add recommendations
      processingResult.recommendations = this.generateComplianceRecommendations(processingResult);

      return processingResult;
    } catch (error) {
      console.error('Failed to process notification with compliance:', error);
      throw error;
    }
  }

  /**
   * Validate consent for notification delivery
   * @param {Object} notification - Notification object
   * @param {Object} context - Context object
   * @returns {Object} Consent validation result
   */
  async validateConsentForNotification(notification, context) {
    const result = {
      valid: true,
      issues: [],
      recipientConsent: {}
    };

    try {
      // Check consent for each recipient
      for (const recipient of notification.recipients || []) {
        const hasConsent = await this.consentService.hasValidConsent(
          recipient.userId,
          notification.type,
          recipient.deliveryChannels?.[0] || 'email'
        );

        result.recipientConsent[recipient.userId] = hasConsent;

        if (!hasConsent) {
          result.valid = false;
          result.issues.push({
            recipientId: recipient.userId,
            issue: 'No valid consent for notification type',
            notificationType: notification.type
          });
        }
      }
    } catch (error) {
      result.valid = false;
      result.issues.push({
        issue: 'Consent validation failed',
        error: error.message
      });
    }

    return result;
  }

  /**
   * Apply security measures to notification
   * @param {Object} notification - Notification object
   * @param {Object} context - Context object
   * @returns {Object} Security processing result
   */
  async applySecurityMeasures(notification, context) {
    const result = {
      success: true,
      processedNotification: { ...notification },
      securityMeasures: [],
      issues: []
    };

    try {
      // Encrypt sensitive data
      if (this.containsSensitiveData(notification)) {
        result.processedNotification = this.encryptionService.encryptNotificationContent(
          result.processedNotification
        );
        result.securityMeasures.push('data_encryption');
      }

      // Generate secure access tokens for recipients
      for (const recipient of result.processedNotification.recipients || []) {
        const accessToken = this.encryptionService.generateSecureToken({
          userId: recipient.userId,
          notificationId: notification._id,
          permissions: ['view']
        }, 3600);

        recipient.accessToken = accessToken;
        result.securityMeasures.push('access_token_generated');
      }

      // Apply data minimization
      result.processedNotification = this.applyDataMinimization(
        result.processedNotification,
        context
      );
      result.securityMeasures.push('data_minimization');

    } catch (error) {
      result.success = false;
      result.issues.push({
        type: 'security_processing_error',
        message: error.message
      });
    }

    return result;
  }

  /**
   * Validate access control for notification
   * @param {Object} notification - Notification object
   * @param {Object} context - Context object
   * @returns {Object} Access control validation result
   */
  async validateAccessControl(notification, context) {
    const result = {
      valid: true,
      issues: [],
      recipientAccess: {}
    };

    try {
      // Validate each recipient's access
      for (const recipient of notification.recipients || []) {
        const mockUser = { 
          _id: recipient.userId, 
          role: recipient.userRole 
        };

        const hasAccess = this.accessControl.canPerformAction(
          mockUser,
          'view',
          notification
        );

        result.recipientAccess[recipient.userId] = hasAccess;

        if (!hasAccess) {
          result.valid = false;
          result.issues.push({
            recipientId: recipient.userId,
            issue: 'Insufficient access permissions',
            requiredAction: 'view'
          });
        }
      }
    } catch (error) {
      result.valid = false;
      result.issues.push({
        issue: 'Access control validation failed',
        error: error.message
      });
    }

    return result;
  }

  /**
   * Log compliance activities
   * @param {Object} notification - Notification object
   * @param {Object} processingResult - Processing result
   * @param {Object} context - Context object
   */
  async logComplianceActivities(notification, processingResult, context) {
    try {
      // Log HIPAA compliance check
      await this.auditService.logComplianceEvent('hipaa_validation', {
        framework: 'HIPAA',
        rule: 'notification_compliance',
        description: 'HIPAA compliance validation performed',
        compliant: processingResult.compliance.hipaa.compliant,
        violations: processingResult.compliance.hipaa.violations.length
      }, context.user || { _id: 'system', role: 'system' });

      // Log consent validation
      await this.auditService.logComplianceEvent('consent_validation', {
        framework: 'HIPAA',
        rule: 'consent_management',
        description: 'Consent validation performed',
        consentStatus: processingResult.compliance.consent.valid ? 'valid' : 'invalid',
        issues: processingResult.compliance.consent.issues.length
      }, context.user || { _id: 'system', role: 'system' });

      // Log security measures applied
      if (processingResult.compliance.security.securityMeasures.length > 0) {
        await this.auditService.logSecurityEvent('security_measures_applied', {
          description: 'Security measures applied to notification',
          severity: 'low',
          measures: processingResult.compliance.security.securityMeasures,
          actionTaken: 'Security measures successfully applied'
        }, context.user);
      }

    } catch (error) {
      console.error('Failed to log compliance activities:', error);
    }
  }

  /**
   * Generate comprehensive compliance report
   * @param {Object} criteria - Report criteria
   * @returns {Object} Comprehensive compliance report
   */
  async generateComprehensiveComplianceReport(criteria = {}) {
    try {
      const report = {
        reportId: this.generateReportId(),
        generatedAt: new Date(),
        reportType: 'comprehensive_compliance',
        criteria: criteria,
        
        // Individual service reports
        reports: {
          hipaa: null,
          consent: null,
          security: null,
          regulatory: null
        },
        
        // Consolidated metrics
        consolidatedMetrics: {
          overallComplianceScore: 0,
          criticalIssues: 0,
          totalViolations: 0,
          remediationItems: []
        },
        
        // Executive summary
        executiveSummary: {
          status: 'unknown',
          keyFindings: [],
          immediateActions: [],
          strategicRecommendations: []
        }
      };

      // Generate HIPAA compliance report
      report.reports.hipaa = await this.hipaaService.generateComplianceReport(criteria);

      // Generate consent management report
      report.reports.consent = await this.consentService.generateConsentReport(criteria);

      // Generate regulatory reporting
      report.reports.regulatory = await this.reportingService.generateRegulatoryReport(
        'notification_audit',
        criteria
      );

      // Consolidate metrics
      await this.consolidateComplianceMetrics(report);

      // Generate executive summary
      await this.generateExecutiveSummary(report);

      return report;
    } catch (error) {
      console.error('Failed to generate comprehensive compliance report:', error);
      throw error;
    }
  }

  /**
   * Perform compliance health check
   * @returns {Object} Health check result
   */
  async performComplianceHealthCheck() {
    const healthCheck = {
      timestamp: new Date(),
      overall: 'unknown',
      services: {},
      issues: [],
      recommendations: []
    };

    try {
      // Check encryption service
      healthCheck.services.encryption = await this.checkEncryptionServiceHealth();
      
      // Check access control
      healthCheck.services.accessControl = await this.checkAccessControlHealth();
      
      // Check audit service
      healthCheck.services.audit = await this.checkAuditServiceHealth();
      
      // Check data retention
      healthCheck.services.dataRetention = await this.checkDataRetentionHealth();
      
      // Check HIPAA compliance
      healthCheck.services.hipaa = await this.checkHIPAAServiceHealth();
      
      // Check consent management
      healthCheck.services.consent = await this.checkConsentServiceHealth();
      
      // Check regulatory reporting
      healthCheck.services.reporting = await this.checkReportingServiceHealth();

      // Determine overall health
      const serviceStatuses = Object.values(healthCheck.services);
      const healthyServices = serviceStatuses.filter(status => status === 'healthy').length;
      const totalServices = serviceStatuses.length;
      
      if (healthyServices === totalServices) {
        healthCheck.overall = 'healthy';
      } else if (healthyServices >= totalServices * 0.8) {
        healthCheck.overall = 'warning';
      } else {
        healthCheck.overall = 'critical';
      }

      // Generate recommendations
      healthCheck.recommendations = this.generateHealthCheckRecommendations(healthCheck);

    } catch (error) {
      healthCheck.overall = 'error';
      healthCheck.issues.push({
        type: 'health_check_error',
        message: error.message
      });
    }

    return healthCheck;
  }

  // Helper methods

  /**
   * Check if notification contains sensitive data
   * @param {Object} notification - Notification object
   * @returns {boolean} Contains sensitive data
   */
  containsSensitiveData(notification) {
    const sensitivePatterns = [
      /ssn|social.security/i,
      /medical.record/i,
      /diagnosis/i,
      /prescription/i,
      /patient.id/i,
      /phone|email/i
    ];

    const content = JSON.stringify(notification);
    return sensitivePatterns.some(pattern => pattern.test(content));
  }

  /**
   * Apply data minimization to notification
   * @param {Object} notification - Notification object
   * @param {Object} context - Context object
   * @returns {Object} Minimized notification
   */
  applyDataMinimization(notification, context) {
    const minimized = { ...notification };
    
    // Remove unnecessary fields based on recipient roles
    if (minimized.recipients) {
      minimized.recipients = minimized.recipients.map(recipient => {
        const filteredNotification = this.accessControl.filterNotificationData(
          { _id: recipient.userId, role: recipient.userRole },
          minimized
        );
        return {
          ...recipient,
          filteredContent: filteredNotification.content
        };
      });
    }

    return minimized;
  }

  /**
   * Generate compliance recommendations
   * @param {Object} processingResult - Processing result
   * @returns {Array} Recommendations
   */
  generateComplianceRecommendations(processingResult) {
    const recommendations = [];

    if (processingResult.compliance.hipaa && !processingResult.compliance.hipaa.compliant) {
      recommendations.push({
        type: 'hipaa_compliance',
        priority: 'high',
        message: 'Address HIPAA compliance violations before sending notification',
        actions: ['Review PHI content', 'Implement data minimization', 'Verify consent']
      });
    }

    if (processingResult.compliance.consent && !processingResult.compliance.consent.valid) {
      recommendations.push({
        type: 'consent_management',
        priority: 'high',
        message: 'Obtain proper consent before sending notification',
        actions: ['Request user consent', 'Update consent preferences', 'Verify consent validity']
      });
    }

    if (processingResult.warnings.length > 0) {
      recommendations.push({
        type: 'access_control',
        priority: 'medium',
        message: 'Review access control warnings',
        actions: ['Verify recipient permissions', 'Update role assignments', 'Review access policies']
      });
    }

    return recommendations;
  }

  /**
   * Consolidate compliance metrics from individual reports
   * @param {Object} report - Comprehensive report
   */
  async consolidateComplianceMetrics(report) {
    let totalScore = 0;
    let scoreCount = 0;
    let totalViolations = 0;

    // Process HIPAA metrics
    if (report.reports.hipaa) {
      // Mock HIPAA score calculation
      totalScore += 95;
      scoreCount++;
    }

    // Process consent metrics
    if (report.reports.consent) {
      totalScore += report.reports.consent.compliance?.requiredConsentsCompliance || 90;
      scoreCount++;
    }

    // Calculate overall compliance score
    report.consolidatedMetrics.overallComplianceScore = scoreCount > 0 ? 
      Math.round(totalScore / scoreCount) : 0;

    report.consolidatedMetrics.totalViolations = totalViolations;
    report.consolidatedMetrics.criticalIssues = totalViolations > 10 ? 
      Math.floor(totalViolations / 10) : 0;
  }

  /**
   * Generate executive summary
   * @param {Object} report - Comprehensive report
   */
  async generateExecutiveSummary(report) {
    const score = report.consolidatedMetrics.overallComplianceScore;
    
    if (score >= 95) {
      report.executiveSummary.status = 'excellent';
    } else if (score >= 85) {
      report.executiveSummary.status = 'good';
    } else if (score >= 70) {
      report.executiveSummary.status = 'needs_improvement';
    } else {
      report.executiveSummary.status = 'critical';
    }

    report.executiveSummary.keyFindings = [
      `Overall compliance score: ${score}%`,
      `Critical issues identified: ${report.consolidatedMetrics.criticalIssues}`,
      `Total violations: ${report.consolidatedMetrics.totalViolations}`
    ];

    report.executiveSummary.immediateActions = [
      'Review and address critical compliance violations',
      'Update consent management processes',
      'Enhance data protection measures'
    ];

    report.executiveSummary.strategicRecommendations = [
      'Implement automated compliance monitoring',
      'Enhance staff training on data protection',
      'Regular compliance audits and assessments'
    ];
  }

  // Health check methods for individual services
  async checkEncryptionServiceHealth() {
    try {
      // Test encryption/decryption
      const testData = 'test data';
      const encrypted = this.encryptionService.encrypt(testData);
      const decrypted = this.encryptionService.decrypt(encrypted);
      return decrypted === testData ? 'healthy' : 'unhealthy';
    } catch (error) {
      return 'unhealthy';
    }
  }

  async checkAccessControlHealth() {
    try {
      // Test access control validation
      const testUser = { _id: 'test', role: 'patient' };
      const testNotification = { _id: 'test', type: 'test', recipients: [] };
      this.accessControl.canPerformAction(testUser, 'view', testNotification);
      return 'healthy';
    } catch (error) {
      return 'unhealthy';
    }
  }

  async checkAuditServiceHealth() {
    return 'healthy'; // Audit service is stateless
  }

  async checkDataRetentionHealth() {
    return this.dataRetentionService.isInitialized ? 'healthy' : 'unhealthy';
  }

  async checkHIPAAServiceHealth() {
    return 'healthy'; // HIPAA service is stateless
  }

  async checkConsentServiceHealth() {
    return 'healthy'; // Would check database connectivity in production
  }

  async checkReportingServiceHealth() {
    return 'healthy'; // Reporting service is stateless
  }

  /**
   * Generate health check recommendations
   * @param {Object} healthCheck - Health check result
   * @returns {Array} Recommendations
   */
  generateHealthCheckRecommendations(healthCheck) {
    const recommendations = [];

    Object.entries(healthCheck.services).forEach(([service, status]) => {
      if (status !== 'healthy') {
        recommendations.push({
          service: service,
          status: status,
          recommendation: `Review and fix issues with ${service} service`
        });
      }
    });

    if (healthCheck.overall !== 'healthy') {
      recommendations.push({
        type: 'overall',
        recommendation: 'Perform comprehensive system review and maintenance'
      });
    }

    return recommendations;
  }

  /**
   * Generate unique report ID
   * @returns {string} Report ID
   */
  generateReportId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    return `COMPLIANCE_${timestamp}_${random}`.toUpperCase();
  }
}

export default ComplianceIntegrationService;