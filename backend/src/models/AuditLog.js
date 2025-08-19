import mongoose, { Schema, model } from 'mongoose';

/**
 * Audit Log Schema
 * Tracks all administrative actions for security and compliance
 */
const auditLogSchema = new Schema({
  // Admin who performed the action
  adminId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Action performed
  action: {
    type: String,
    required: true,
    enum: [
      'UPDATE_USER',
      'SUSPEND_USER',
      'DELETE_USER',
      'APPROVE_PHARMACY',
      'REJECT_PHARMACY',
      'SYSTEM_CONFIG_CHANGE',
      'DATA_EXPORT',
      'BULK_OPERATION',
      'LOGIN_ADMIN',
      'LOGOUT_ADMIN',
      'PASSWORD_RESET',
      'PERMISSION_CHANGE'
    ],
    index: true
  },

  // Target resource details
  targetResource: {
    type: String,
    enum: ['user', 'pharmacy', 'prescription', 'order', 'system'],
    required: true
  },

  targetId: {
    type: String, // Can be ObjectId or other identifier
    index: true
  },

  // Action details
  details: {
    type: Schema.Types.Mixed,
    default: {}
  },

  // Request metadata
  ipAddress: {
    type: String,
    required: true
  },

  userAgent: {
    type: String,
    required: true
  },

  // Result of the action
  status: {
    type: String,
    enum: ['success', 'failure', 'partial'],
    default: 'success'
  },

  errorMessage: {
    type: String
  },

  // Additional metadata
  sessionId: String,
  
  beforeState: Schema.Types.Mixed,
  afterState: Schema.Types.Mixed,

  // Compliance fields
  complianceFlags: [{
    type: String,
    enum: ['HIPAA', 'GDPR', 'SOX', 'PCI']
  }],

  // Retention period (in days)
  retentionPeriod: {
    type: Number,
    default: 2555 // 7 years for compliance
  },

  // Auto-deletion date
  expiresAt: {
    type: Date,
    index: { expireAfterSeconds: 0 }
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
auditLogSchema.index({ adminId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ targetResource: 1, targetId: 1 });
auditLogSchema.index({ createdAt: -1 });

// Set expiration date before saving
auditLogSchema.pre('save', function(next) {
  if (!this.expiresAt) {
    this.expiresAt = new Date(Date.now() + this.retentionPeriod * 24 * 60 * 60 * 1000);
  }
  next();
});

// Instance methods
auditLogSchema.methods.toSafeObject = function() {
  const obj = this.toObject();
  // Remove sensitive information if needed
  return obj;
};

// Static methods
auditLogSchema.statics.createLog = async function(logData) {
  try {
    const log = new this(logData);
    await log.save();
    return log;
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw error to prevent disrupting main operation
    return null;
  }
};

auditLogSchema.statics.getLogsByAdmin = function(adminId, options = {}) {
  const {
    page = 1,
    limit = 50,
    dateFrom,
    dateTo,
    actions = []
  } = options;

  const query = { adminId };
  
  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
    if (dateTo) query.createdAt.$lte = new Date(dateTo);
  }

  if (actions.length > 0) {
    query.action = { $in: actions };
  }

  const skip = (page - 1) * limit;

  return this.find(query)
    .populate('adminId', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

auditLogSchema.statics.getLogsByResource = function(resourceType, resourceId, options = {}) {
  const query = {
    targetResource: resourceType,
    targetId: resourceId
  };

  return this.find(query)
    .populate('adminId', 'name email')
    .sort({ createdAt: -1 })
    .limit(options.limit || 100)
    .lean();
};

// Check if model already exists to prevent OverwriteModelError
const AuditLog = mongoose.models.AuditLog || model('AuditLog', auditLogSchema);

export default AuditLog;
