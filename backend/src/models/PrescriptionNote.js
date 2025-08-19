import mongoose from 'mongoose';

const PrescriptionNoteSchema = new mongoose.Schema({
  prescription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prescription',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  category: {
    type: String,
    enum: [
      'general',
      'medical',
      'dosage',
      'allergy',
      'interaction',
      'insurance',
      'patient_contact',
      'follow_up',
      'warning',
      'approval_reason'
    ],
    default: 'general',
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
    index: true
  },
  isPrivate: {
    type: Boolean,
    default: false,
    index: true
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 50
  }],
  attachments: [{
    url: String,
    filename: String,
    mimeType: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isArchived: {
    type: Boolean,
    default: false,
    index: true
  },
  archivedAt: {
    type: Date
  },
  archivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
PrescriptionNoteSchema.index({ prescription: 1, createdAt: -1 });
PrescriptionNoteSchema.index({ prescription: 1, category: 1 });
PrescriptionNoteSchema.index({ prescription: 1, priority: 1 });
PrescriptionNoteSchema.index({ createdBy: 1, createdAt: -1 });
PrescriptionNoteSchema.index({ isPrivate: 1, prescription: 1 });

// Virtual for full name of creator
PrescriptionNoteSchema.virtual('createdByName').get(function() {
  if (this.createdBy && this.createdBy.firstName && this.createdBy.lastName) {
    return `${this.createdBy.firstName} ${this.createdBy.lastName}`;
  }
  return 'Unknown User';
});

// Virtual for full name of updater
PrescriptionNoteSchema.virtual('updatedByName').get(function() {
  if (this.updatedBy && this.updatedBy.firstName && this.updatedBy.lastName) {
    return `${this.updatedBy.firstName} ${this.updatedBy.lastName}`;
  }
  return 'Unknown User';
});

// Virtual for time since creation
PrescriptionNoteSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diff = now - this.createdAt;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  } else if (hours < 24) {
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  } else {
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }
});

// Pre-save middleware
PrescriptionNoteSchema.pre('save', function(next) {
  // Update the updatedAt timestamp
  this.updatedAt = new Date();
  next();
});

// Instance methods
PrescriptionNoteSchema.methods.archive = function(userId) {
  this.isArchived = true;
  this.archivedAt = new Date();
  this.archivedBy = userId;
  return this.save();
};

PrescriptionNoteSchema.methods.unarchive = function() {
  this.isArchived = false;
  this.archivedAt = undefined;
  this.archivedBy = undefined;
  return this.save();
};

PrescriptionNoteSchema.methods.canEdit = function(userId, userRole) {
  // Admin can edit any note
  if (userRole === 'admin') {
    return true;
  }
  
  // User can edit their own notes
  return this.createdBy.toString() === userId.toString();
};

PrescriptionNoteSchema.methods.canView = function(userId, userRole) {
  // Admin can view any note
  if (userRole === 'admin') {
    return true;
  }
  
  // If note is private, only creator can view
  if (this.isPrivate) {
    return this.createdBy.toString() === userId.toString();
  }
  
  // Public notes can be viewed by anyone
  return true;
};

// Static methods
PrescriptionNoteSchema.statics.findByPrescription = function(prescriptionId, options = {}) {
  const {
    category,
    priority,
    includePrivate = false,
    userId,
    userRole,
    limit = 50,
    skip = 0
  } = options;
  
  let query = { prescription: prescriptionId, isArchived: false };
  
  // Filter by category
  if (category) {
    query.category = category;
  }
  
  // Filter by priority
  if (priority) {
    query.priority = priority;
  }
  
  // Handle private notes
  if (!includePrivate && userRole !== 'admin') {
    query.$or = [
      { isPrivate: false },
      { isPrivate: true, createdBy: userId }
    ];
  }
  
  return this.find(query)
    .populate('createdBy updatedBy', 'firstName lastName')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

PrescriptionNoteSchema.statics.getStatsByPrescription = function(prescriptionId) {
  return this.aggregate([
    {
      $match: {
        prescription: new mongoose.Types.ObjectId(prescriptionId),
        isArchived: false
      }
    },
    {
      $group: {
        _id: null,
        totalNotes: { $sum: 1 },
        categories: { $push: '$category' },
        priorities: { $push: '$priority' },
        lastUpdate: { $max: '$updatedAt' }
      }
    },
    {
      $project: {
        totalNotes: 1,
        lastUpdate: 1,
        categoryCounts: {
          $reduce: {
            input: '$categories',
            initialValue: {},
            in: {
              $mergeObjects: [
                '$$value',
                {
                  $arrayToObject: [
                    [{
                      k: '$$this',
                      v: {
                        $add: [
                          { $ifNull: [{ $getField: { field: '$$this', input: '$$value' } }, 0] },
                          1
                        ]
                      }
                    }]
                  ]
                }
              ]
            }
          }
        },
        priorityCounts: {
          $reduce: {
            input: '$priorities',
            initialValue: {},
            in: {
              $mergeObjects: [
                '$$value',
                {
                  $arrayToObject: [
                    [{
                      k: '$$this',
                      v: {
                        $add: [
                          { $ifNull: [{ $getField: { field: '$$this', input: '$$value' } }, 0] },
                          1
                        ]
                      }
                    }]
                  ]
                }
              ]
            }
          }
        }
      }
    }
  ]);
};

// Ensure virtual fields are serialized
PrescriptionNoteSchema.set('toJSON', { virtuals: true });
PrescriptionNoteSchema.set('toObject', { virtuals: true });

const PrescriptionNote = mongoose.model('PrescriptionNote', PrescriptionNoteSchema);

export default PrescriptionNote;
