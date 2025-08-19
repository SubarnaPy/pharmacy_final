/**
 * Service for managing notification access control and authorization
 * Implements role-based access control for notification viewing and management
 */
class NotificationAccessControl {
  constructor() {
    // Define role hierarchy (higher number = more permissions)
    this.roleHierarchy = {
      'patient': 1,
      'doctor': 2,
      'pharmacy': 2,
      'admin': 3,
      'super_admin': 4
    };

    // Define notification type access rules
    this.accessRules = {
      // Medical notifications
      'prescription_created': {
        view: ['patient', 'doctor', 'pharmacy', 'admin'],
        manage: ['doctor', 'admin'],
        delete: ['admin']
      },
      'prescription_updated': {
        view: ['patient', 'doctor', 'pharmacy', 'admin'],
        manage: ['doctor', 'admin'],
        delete: ['admin']
      },
      'appointment_scheduled': {
        view: ['patient', 'doctor', 'admin'],
        manage: ['doctor', 'admin'],
        delete: ['admin']
      },
      'appointment_reminder': {
        view: ['patient', 'doctor', 'admin'],
        manage: ['doctor', 'admin'],
        delete: ['admin']
      },
      'consultation_completed': {
        view: ['patient', 'doctor', 'admin'],
        manage: ['doctor', 'admin'],
        delete: ['admin']
      },

      // Order and payment notifications
      'order_placed': {
        view: ['patient', 'pharmacy', 'admin'],
        manage: ['pharmacy', 'admin'],
        delete: ['admin']
      },
      'order_status_changed': {
        view: ['patient', 'pharmacy', 'admin'],
        manage: ['pharmacy', 'admin'],
        delete: ['admin']
      },
      'payment_processed': {
        view: ['patient', 'admin'],
        manage: ['admin'],
        delete: ['admin']
      },
      'payment_failed': {
        view: ['patient', 'admin'],
        manage: ['admin'],
        delete: ['admin']
      },

      // System notifications
      'system_maintenance': {
        view: ['patient', 'doctor', 'pharmacy', 'admin'],
        manage: ['admin'],
        delete: ['admin']
      },
      'security_alert': {
        view: ['patient', 'doctor', 'pharmacy', 'admin'],
        manage: ['admin'],
        delete: ['admin']
      },
      'account_verification': {
        view: ['patient', 'doctor', 'pharmacy', 'admin'],
        manage: ['admin'],
        delete: ['admin']
      },

      // Inventory notifications
      'inventory_low_stock': {
        view: ['pharmacy', 'admin'],
        manage: ['pharmacy', 'admin'],
        delete: ['admin']
      },
      'inventory_expired': {
        view: ['pharmacy', 'admin'],
        manage: ['pharmacy', 'admin'],
        delete: ['admin']
      },

      // Administrative notifications
      'user_registered': {
        view: ['admin'],
        manage: ['admin'],
        delete: ['admin']
      },
      'compliance_alert': {
        view: ['admin'],
        manage: ['admin'],
        delete: ['admin']
      }
    };

    // Define data field access rules
    this.fieldAccessRules = {
      'patient': {
        allowed: ['content', 'createdAt', 'readAt', 'type', 'priority'],
        restricted: ['recipients', 'analytics', 'systemMetadata', 'internalNotes']
      },
      'doctor': {
        allowed: ['content', 'createdAt', 'readAt', 'type', 'priority', 'relatedEntities'],
        restricted: ['recipients.deliveryStatus', 'analytics', 'systemMetadata']
      },
      'pharmacy': {
        allowed: ['content', 'createdAt', 'readAt', 'type', 'priority', 'relatedEntities'],
        restricted: ['recipients.deliveryStatus', 'analytics', 'systemMetadata']
      },
      'admin': {
        allowed: ['*'], // Full access
        restricted: []
      }
    };
  }

  /**
   * Check if user can perform action on notification
   * @param {Object} user - User object with role and id
   * @param {string} action - Action to perform (view, manage, delete)
   * @param {Object} notification - Notification object
   * @returns {boolean} Access granted
   */
  canPerformAction(user, action, notification) {
    try {
      // Super admin has all permissions
      if (user.role === 'super_admin') {
        return true;
      }

      // Check if notification type has access rules
      const rules = this.accessRules[notification.type];
      if (!rules) {
        // Default to restrictive access for unknown types
        return user.role === 'admin' || user.role === 'super_admin';
      }

      // Check if user role is allowed for this action
      const allowedRoles = rules[action] || [];
      if (!allowedRoles.includes(user.role)) {
        return false;
      }

      // Additional checks for specific scenarios
      return this.performAdditionalChecks(user, action, notification);
    } catch (error) {
      console.error('Access control check failed:', error);
      return false; // Fail secure
    }
  }

  /**
   * Perform additional access checks based on context
   * @param {Object} user - User object
   * @param {string} action - Action to perform
   * @param {Object} notification - Notification object
   * @returns {boolean} Access granted
   */
  performAdditionalChecks(user, action, notification) {
    // Check if user is a recipient of the notification
    const isRecipient = notification.recipients?.some(recipient => 
      recipient.userId.toString() === user._id.toString()
    );

    // For view action, user must be a recipient or have elevated privileges
    if (action === 'view') {
      return isRecipient || this.hasElevatedPrivileges(user.role);
    }

    // For manage/delete actions, check ownership or elevated privileges
    if (action === 'manage' || action === 'delete') {
      const isOwner = notification.createdBy?.toString() === user._id.toString();
      return isOwner || this.hasElevatedPrivileges(user.role);
    }

    return false;
  }

  /**
   * Check if role has elevated privileges
   * @param {string} role - User role
   * @returns {boolean} Has elevated privileges
   */
  hasElevatedPrivileges(role) {
    return this.roleHierarchy[role] >= this.roleHierarchy['admin'];
  }

  /**
   * Filter notification data based on user permissions
   * @param {Object} user - User object
   * @param {Object} notification - Notification object
   * @returns {Object} Filtered notification
   */
  filterNotificationData(user, notification) {
    if (user.role === 'super_admin') {
      return notification; // Full access
    }

    const fieldRules = this.fieldAccessRules[user.role];
    if (!fieldRules) {
      // Unknown role, return minimal data
      return {
        _id: notification._id,
        type: notification.type,
        content: {
          title: notification.content?.title,
          message: 'Access restricted'
        },
        createdAt: notification.createdAt
      };
    }

    // If full access is granted
    if (fieldRules.allowed.includes('*')) {
      return notification;
    }

    // Filter based on allowed fields
    const filtered = {};
    fieldRules.allowed.forEach(field => {
      if (notification[field] !== undefined) {
        filtered[field] = notification[field];
      }
    });

    // Remove restricted fields
    fieldRules.restricted.forEach(field => {
      delete filtered[field];
    });

    // Always include ID for reference
    filtered._id = notification._id;

    return filtered;
  }

  /**
   * Filter notification list based on user permissions
   * @param {Object} user - User object
   * @param {Array} notifications - Array of notifications
   * @returns {Array} Filtered notifications
   */
  filterNotificationList(user, notifications) {
    return notifications
      .filter(notification => this.canPerformAction(user, 'view', notification))
      .map(notification => this.filterNotificationData(user, notification));
  }

  /**
   * Check if user can access notification analytics
   * @param {Object} user - User object
   * @param {string} scope - Analytics scope (own, department, system)
   * @returns {boolean} Access granted
   */
  canAccessAnalytics(user, scope = 'own') {
    const roleLevel = this.roleHierarchy[user.role] || 0;

    switch (scope) {
      case 'own':
        return roleLevel >= 1; // All authenticated users
      case 'department':
        return roleLevel >= 2; // Doctors, pharmacies, admins
      case 'system':
        return roleLevel >= 3; // Admins only
      default:
        return false;
    }
  }

  /**
   * Generate access token for notification viewing
   * @param {Object} user - User object
   * @param {string} notificationId - Notification ID
   * @param {number} expiresIn - Token expiration in seconds
   * @returns {string} Access token
   */
  generateAccessToken(user, notificationId, expiresIn = 3600) {
    const payload = {
      userId: user._id,
      userRole: user.role,
      notificationId: notificationId,
      permissions: this.getUserPermissions(user),
      exp: Math.floor(Date.now() / 1000) + expiresIn
    };

    // This would typically use JWT or similar
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  /**
   * Verify access token
   * @param {string} token - Access token
   * @param {string} notificationId - Notification ID to access
   * @returns {Object|null} Token payload or null if invalid
   */
  verifyAccessToken(token, notificationId) {
    try {
      const payload = JSON.parse(Buffer.from(token, 'base64').toString());
      
      // Check expiration
      if (payload.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }

      // Check notification ID match
      if (payload.notificationId !== notificationId) {
        return null;
      }

      return payload;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get user permissions summary
   * @param {Object} user - User object
   * @returns {Object} Permissions summary
   */
  getUserPermissions(user) {
    const roleLevel = this.roleHierarchy[user.role] || 0;
    
    return {
      role: user.role,
      level: roleLevel,
      canViewOwnNotifications: true,
      canViewDepartmentNotifications: roleLevel >= 2,
      canViewSystemNotifications: roleLevel >= 3,
      canManageNotifications: roleLevel >= 2,
      canDeleteNotifications: roleLevel >= 3,
      canAccessAnalytics: roleLevel >= 2,
      canManageUsers: roleLevel >= 3
    };
  }

  /**
   * Log access attempt for audit purposes
   * @param {Object} user - User object
   * @param {string} action - Action attempted
   * @param {Object} notification - Notification object
   * @param {boolean} granted - Whether access was granted
   * @param {string} reason - Reason for decision
   */
  logAccessAttempt(user, action, notification, granted, reason = '') {
    const logEntry = {
      timestamp: new Date(),
      userId: user._id,
      userRole: user.role,
      action: action,
      notificationId: notification._id,
      notificationType: notification.type,
      accessGranted: granted,
      reason: reason,
      userAgent: user.userAgent || 'unknown',
      ipAddress: user.ipAddress || 'unknown'
    };

    // This would typically be sent to an audit logging service
    console.log('Access Control Audit:', JSON.stringify(logEntry));
    
    // In production, send to audit service
    // await this.auditService.logAccess(logEntry);
  }

  /**
   * Check if user has permission to modify notification preferences
   * @param {Object} user - User object
   * @param {string} targetUserId - ID of user whose preferences to modify
   * @returns {boolean} Permission granted
   */
  canModifyPreferences(user, targetUserId) {
    // Users can modify their own preferences
    if (user._id.toString() === targetUserId.toString()) {
      return true;
    }

    // Admins can modify any user's preferences
    return this.hasElevatedPrivileges(user.role);
  }

  /**
   * Validate notification access request
   * @param {Object} request - Request object with user and notification info
   * @returns {Object} Validation result
   */
  validateAccessRequest(request) {
    const { user, action, notificationId, additionalContext = {} } = request;

    // Basic validation
    if (!user || !user.role || !action || !notificationId) {
      return {
        valid: false,
        reason: 'Missing required parameters',
        code: 'INVALID_REQUEST'
      };
    }

    // Check if role is recognized
    if (!this.roleHierarchy.hasOwnProperty(user.role)) {
      return {
        valid: false,
        reason: 'Unknown user role',
        code: 'INVALID_ROLE'
      };
    }

    // Check if action is valid
    const validActions = ['view', 'manage', 'delete', 'analytics'];
    if (!validActions.includes(action)) {
      return {
        valid: false,
        reason: 'Invalid action',
        code: 'INVALID_ACTION'
      };
    }

    return {
      valid: true,
      reason: 'Request validated',
      code: 'VALID_REQUEST'
    };
  }
}

export default NotificationAccessControl;