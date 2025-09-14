import mongoose from 'mongoose';

const { Schema } = mongoose;

// Medical Document Schema
const medicalDocumentSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  documentType: {
    type: String,
    enum: [
      'medical_report',
      'lab_result',
      'prescription',
      'insurance_card',
      'vaccination_record',
      'allergy_card',
      'medical_history',
      'diagnostic_image',
      'discharge_summary',
      'referral_letter',
      'other'
    ],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  originalFileName: {
    type: String,
    required: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  publicId: {
    type: String,
    required: true // Cloudinary public ID for file management
  },
  fileSize: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  extractedText: {
    type: String,
    default: ''
  },
  ocrMetadata: {
    engine: {
      type: String,
      enum: [
        'gemini', 
        'gemini-1.5-flash', 
        'gemini-1.5-pro', 
        'gemini-2.0-flash-exp',
        'tesseract', 
        'manual'
      ],
      default: 'gemini'
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100
    },
    processingTime: {
      type: Number // in milliseconds
    },
    model: String,
    extractionDate: {
      type: Date,
      default: Date.now
    },
    wordCount: Number,
    language: String
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  isPrivate: {
    type: Boolean,
    default: true
  },
  shareableWith: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['doctor', 'pharmacy', 'insurance', 'family']
    },
    sharedAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: Date
  }],
  metadata: {
    dateOfDocument: Date, // Actual date mentioned in the document
    doctorName: String,
    hospitalName: String,
    patientName: String,
    medicalConditions: [String],
    medications: [String],
    testResults: [String]
  },
  status: {
    type: String,
    enum: ['uploading', 'processing', 'completed', 'failed', 'archived'],
    default: 'uploading'
  },
  processingErrors: [{
    stage: String,
    error: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  isArchived: {
    type: Boolean,
    default: false
  },
  archivedAt: Date,
  lastAccessedAt: {
    type: Date,
    default: Date.now
  },
  accessCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Indexes for optimal performance
medicalDocumentSchema.index({ userId: 1, documentType: 1 });
medicalDocumentSchema.index({ userId: 1, createdAt: -1 });
medicalDocumentSchema.index({ tags: 1 });
medicalDocumentSchema.index({ status: 1 });
medicalDocumentSchema.index({ 'metadata.dateOfDocument': -1 });
medicalDocumentSchema.index({ isArchived: 1 });

// Text search index
medicalDocumentSchema.index({
  title: 'text',
  description: 'text',
  extractedText: 'text',
  'metadata.doctorName': 'text',
  'metadata.hospitalName': 'text'
});

// Virtual for file extension
medicalDocumentSchema.virtual('fileExtension').get(function() {
  return this.originalFileName.split('.').pop().toLowerCase();
});

// Virtual for readable file size
medicalDocumentSchema.virtual('readableFileSize').get(function() {
  const bytes = this.fileSize;
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

// Virtual for document age
medicalDocumentSchema.virtual('documentAge').get(function() {
  const now = new Date();
  const created = this.createdAt;
  const diffTime = Math.abs(now - created);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 1) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months ago`;
  return `${Math.ceil(diffDays / 365)} years ago`;
});

// Virtual for security status
medicalDocumentSchema.virtual('securityStatus').get(function() {
  return {
    isPrivate: this.isPrivate,
    hasSharedAccess: this.shareableWith.length > 0,
    shareCount: this.shareableWith.length,
    isExpired: this.shareableWith.some(share => 
      share.expiresAt && share.expiresAt < new Date()
    )
  };
});

// Pre-save middleware
medicalDocumentSchema.pre('save', function(next) {
  if (this.isModified('extractedText') && this.extractedText) {
    this.ocrMetadata.wordCount = this.extractedText.split(/\s+/).length;
  }
  
  if (this.isArchived && !this.archivedAt) {
    this.archivedAt = new Date();
  }
  
  next();
});

// Instance methods
medicalDocumentSchema.methods.updateLastAccessed = function() {
  this.lastAccessedAt = new Date();
  this.accessCount += 1;
  return this.save();
};

medicalDocumentSchema.methods.shareWith = function(userId, role, expiresAt = null) {
  // Remove existing share with same user
  this.shareableWith = this.shareableWith.filter(
    share => !share.userId.equals(userId)
  );
  
  // Add new share
  this.shareableWith.push({
    userId,
    role,
    expiresAt
  });
  
  return this.save();
};

medicalDocumentSchema.methods.revokeShare = function(userId) {
  this.shareableWith = this.shareableWith.filter(
    share => !share.userId.equals(userId)
  );
  return this.save();
};

medicalDocumentSchema.methods.archive = function() {
  this.isArchived = true;
  this.archivedAt = new Date();
  return this.save();
};

medicalDocumentSchema.methods.unarchive = function() {
  this.isArchived = false;
  this.archivedAt = null;
  return this.save();
};

// Static methods
medicalDocumentSchema.statics.findByUser = function(userId, options = {}) {
  const query = { userId, isArchived: false };
  
  if (options.documentType) {
    query.documentType = options.documentType;
  }
  
  if (options.tags && options.tags.length > 0) {
    query.tags = { $in: options.tags };
  }
  
  if (options.status) {
    query.status = options.status;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 50);
};

medicalDocumentSchema.statics.searchDocuments = function(userId, searchTerm, options = {}) {
  const query = {
    userId,
    isArchived: false,
    $text: { $search: searchTerm }
  };
  
  if (options.documentType) {
    query.documentType = options.documentType;
  }
  
  return this.find(query, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(options.limit || 20);
};

medicalDocumentSchema.statics.getDocumentsByDateRange = function(userId, startDate, endDate) {
  return this.find({
    userId,
    isArchived: false,
    $or: [
      {
        'metadata.dateOfDocument': {
          $gte: startDate,
          $lte: endDate
        }
      },
      {
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      }
    ]
  }).sort({ 'metadata.dateOfDocument': -1, createdAt: -1 });
};

medicalDocumentSchema.statics.getUserStats = function(userId) {
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalDocuments: { $sum: 1 },
        archivedDocuments: {
          $sum: { $cond: ['$isArchived', 1, 0] }
        },
        totalFileSize: { $sum: '$fileSize' },
        documentTypes: { $addToSet: '$documentType' },
        averageAccessCount: { $avg: '$accessCount' },
        lastUpload: { $max: '$createdAt' }
      }
    },
    {
      $addFields: {
        activeDocuments: { $subtract: ['$totalDocuments', '$archivedDocuments'] }
      }
    }
  ]);
};

const MedicalDocument = mongoose.model('MedicalDocument', medicalDocumentSchema);

export default MedicalDocument;
