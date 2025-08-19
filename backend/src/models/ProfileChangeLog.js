import mongoose from 'mongoose';
const { Schema } = mongoose;

/**
 * ProfileChangeLog Model - Tracks all profile changes for audit and rollback purposes
 */
const profileChangeLogSchema = new Schema({
  // Operation Information
  operationId: {
    type: String,
    required: true,
    index: true
  },

  // Doctor Information
  doctorId: {
    type: Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true,
    index: true
  },

  // User who made the change
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Change Details
  section: {
    type: String,
    required: true,
    enum: [
      'personalInfo',
      'medicalLicense',
      'specializations',
      'qualifications',
      'experience',
      'consultationModes',
      'workingHours',
      'availability',
      'bio',
      'languages',
      'notifications',
      'notificationPreferences',
      'status'
    ]
  },

  // Change Data
  changes: {
    type: Schema.Types.Mixed,
    required: true
  },

  previousValues: {
    type: Schema.Types.Mixed,
    required: true
  },

  // Change Metadata
  changeType: {
    type: String,
    enum: ['create', 'update', 'delete', 'rollback'],
    default: 'update'
  },

  isRollback: {
    type: Boolean,
    default: false
  },

  // Sync Status
  syncStatus: {
    type: String,
    enum: ['pending', 'syncing', 'completed', 'failed'],
    default: 'pending'
  },

  syncAttempts: {
    type: Number,
    default: 0
  },

  syncErrors: [{
    error: String,
    timestamp: Date,
    retryCount: Number
  }],

  // Notification Status
  notificationStatus: {
    type: String,
    enum: ['not_required', 'pending', 'sent', 'failed'],
    default: 'not_required'
  },

  notifiedPatients: [{
    patientId: Schema.Types.ObjectId,
    notificationId: String,
    sentAt: Date,
    status: {
      type: String,
      enum: ['sent', 'delivered', 'failed']
    }
  }],

  // Impact Assessment
  impactLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  },

  affectedSystems: [{
    system: {
      type: String,
      enum: ['search', 'booking', 'notifications', 'cache', 'external']
    },
    status: {
      type: String,
      enum: ['pending', 'updated', 'failed']
    },
    updatedAt: Date,
    error: String
  }],

  // Validation
  validationStatus: {
    type: String,
    enum: ['pending', 'valid', 'invalid'],
    default: 'pending'
  },

  validationErrors: [{
    field: String,
    message: String,
    code: String
  }],

  // Timestamps
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },

  completedAt: Date,

  // Additional Metadata
  metadata: {
    userAgent: String,
    ipAddress: String,
    source: {
      type: String,
      enum: ['web', 'mobile', 'api', 'admin', 'system'],
      default: 'web'
    },
    version: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
profileChangeLogSchema.index({ doctorId: 1, timestamp: -1 });
profileChangeLogSchema.index({ operationId: 1 });
profileChangeLogSchema.index({ userId: 1, timestamp: -1 });
profileChangeLogSchema.index({ section: 1, timestamp: -1 });
profileChangeLogSchema.index({ syncStatus: 1 });
profileChangeLogSchema.index({ notificationStatus: 1 });

// Virtual for duration
profileChangeLogSchema.virtual('duration').get(function() {
  if (this.completedAt) {
    return this.completedAt - this.timestamp;
  }
  return null;
});

// Virtual for is critical change
profileChangeLogSchema.virtual('isCriticalChange').get(function() {
  const criticalSections = ['consultationModes', 'workingHours', 'specializations', 'medicalLicense', 'status'];
  return criticalSections.includes(this.section);
});

// Method to mark sync as completed
profileChangeLogSchema.methods.markSyncCompleted = function() {
  this.syncStatus = 'completed';
  this.completedAt = new Date();
  return this.save();
};

// Method to mark sync as failed
profileChangeLogSchema.methods.markSyncFailed = function(error) {
  this.syncStatus = 'failed';
  this.syncAttempts += 1;
  this.syncErrors.push({
    error: error.message,
    timestamp: new Date(),
    retryCount: this.syncAttempts
  });
  return this.save();
};

// Method to add notification record
profileChangeLogSchema.methods.addNotificationRecord = function(patientId, notificationId, status = 'sent') {
  this.notifiedPatients.push({
    patientId,
    notificationId,
    sentAt: new Date(),
    status
  });
  
  // Update overall notification status
  if (this.notificationStatus === 'pending') {
    this.notificationStatus = 'sent';
  }
  
  return this.save();
};

// Static method to get recent changes for a doctor
profileChangeLogSchema.statics.getRecentChanges = function(doctorId, limit = 10) {
  return this.find({ doctorId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('userId', 'name email')
    .exec();
};

// Static method to get changes by section
profileChangeLogSchema.statics.getChangesBySection = function(doctorId, section, limit = 5) {
  return this.find({ doctorId, section })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('userId', 'name email')
    .exec();
};

// Static method to get pending sync operations
profileChangeLogSchema.statics.getPendingSyncOperations = function() {
  return this.find({ 
    syncStatus: { $in: ['pending', 'failed'] },
    syncAttempts: { $lt: 3 }
  })
    .sort({ timestamp: 1 })
    .exec();
};

// Static method to get sync statistics
profileChangeLogSchema.statics.getSyncStats = function(timeframe = 24) {
  const since = new Date(Date.now() - timeframe * 60 * 60 * 1000);
  
  return this.aggregate([
    { $match: { timestamp: { $gte: since } } },
    {
      $group: {
        _id: '$syncStatus',
        count: { $sum: 1 },
        avgDuration: { $avg: '$duration' }
      }
    }
  ]);
};

// Pre-save middleware to set impact level
profileChangeLogSchema.pre('save', function(next) {
  if (this.isNew) {
    // Determine impact level based on section and change type
    const criticalSections = ['consultationModes', 'workingHours', 'specializations', 'medicalLicense'];
    const highImpactSections = ['status', 'qualifications'];
    const mediumImpactSections = ['experience', 'bio'];
    
    if (criticalSections.includes(this.section)) {
      this.impactLevel = 'critical';
      this.notificationStatus = 'pending';
    } else if (highImpactSections.includes(this.section)) {
      this.impactLevel = 'high';
    } else if (mediumImpactSections.includes(this.section)) {
      this.impactLevel = 'medium';
    } else {
      this.impactLevel = 'low';
    }

    // Set affected systems based on section
    this.affectedSystems = this.determineAffectedSystems(this.section);
  }
  
  next();
});

// Method to determine affected systems
profileChangeLogSchema.methods.determineAffectedSystems = function(section) {
  const systemMap = {
    'specializations': ['search', 'booking'],
    'consultationModes': ['booking', 'notifications'],
    'workingHours': ['booking', 'notifications'],
    'availability': ['booking', 'notifications'],
    'medicalLicense': ['search', 'notifications'],
    'qualifications': ['search'],
    'experience': ['search'],
    'bio': ['search'],
    'languages': ['search'],
    'status': ['search', 'booking', 'notifications'],
    'notifications': ['notifications']
  };

  const systems = systemMap[section] || [];
  return systems.map(system => ({
    system,
    status: 'pending'
  }));
};

export const ProfileChangeLog = mongoose.model('ProfileChangeLog', profileChangeLogSchema);
export default ProfileChangeLog;