import mongoose from 'mongoose';

const medicalRecordSchema = new mongoose.Schema({
  // Patient information
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Doctor who created/reviewed the record
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Associated appointment
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    index: true
  },
  
  // Record type and category
  recordType: {
    type: String,
    enum: [
      'consultation-note',
      'prescription',
      'lab-report',
      'imaging-report',
      'discharge-summary',
      'vaccination-record',
      'surgery-report',
      'progress-note',
      'referral',
      'medical-certificate',
      'fitness-certificate',
      'other'
    ],
    required: true,
    index: true
  },
  
  // Record title and description
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  
  // Medical content
  content: {
    // Chief complaint
    chiefComplaint: String,
    
    // History of present illness
    historyOfPresentIllness: String,
    
    // Physical examination
    physicalExamination: {
      vitalSigns: {
        temperature: Number,
        bloodPressure: {
          systolic: Number,
          diastolic: Number
        },
        heartRate: Number,
        respiratoryRate: Number,
        oxygenSaturation: Number,
        height: Number,
        weight: Number,
        bmi: Number
      },
      generalExamination: String,
      systemicExamination: mongoose.Schema.Types.Mixed
    },
    
    // Assessment and diagnosis
    assessment: {
      provisionalDiagnosis: [{
        condition: String,
        icd10Code: String,
        severity: {
          type: String,
          enum: ['mild', 'moderate', 'severe']
        }
      }],
      differentialDiagnosis: [String],
      clinicalNotes: String
    },
    
    // Treatment plan
    treatmentPlan: {
      medications: [{
        name: {
          type: String,
          required: true
        },
        genericName: String,
        dosage: String,
        route: {
          type: String,
          enum: ['oral', 'topical', 'injection', 'inhalation', 'other']
        },
        frequency: String,
        duration: String,
        quantity: String,
        instructions: String,
        startDate: Date,
        endDate: Date
      }],
      procedures: [{
        name: String,
        description: String,
        scheduledDate: Date,
        status: {
          type: String,
          enum: ['planned', 'completed', 'cancelled']
        }
      }],
      investigations: [{
        test: String,
        urgency: {
          type: String,
          enum: ['routine', 'urgent', 'stat']
        },
        instructions: String,
        scheduledDate: Date
      }],
      followUp: {
        required: Boolean,
        date: Date,
        instructions: String
      },
      lifestyle: [String],
      dietaryAdvice: String
    },
    
    // Lab results (if applicable)
    labResults: [{
      testName: String,
      value: String,
      unit: String,
      referenceRange: String,
      status: {
        type: String,
        enum: ['normal', 'abnormal', 'critical']
      },
      notes: String,
      testDate: Date
    }],
    
    // Imaging results (if applicable)
    imagingResults: [{
      study: String,
      findings: String,
      impression: String,
      recommendation: String,
      imageUrl: String,
      reportUrl: String,
      studyDate: Date
    }]
  },
  
  // File attachments
  attachments: [{
    fileName: String,
    originalFileName: String,
    fileUrl: String,
    fileType: String,
    fileSize: Number,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    description: String
  }],
  
  // Digital signature
  digitalSignature: {
    doctorSignature: String,
    signedAt: Date,
    signatureHash: String,
    isVerified: {
      type: Boolean,
      default: false
    }
  },
  
  // Privacy and access control
  privacy: {
    isConfidential: {
      type: Boolean,
      default: false
    },
    accessLevel: {
      type: String,
      enum: ['public', 'restricted', 'private'],
      default: 'private'
    },
    sharedWith: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      permission: {
        type: String,
        enum: ['view', 'edit', 'admin']
      },
      sharedAt: Date,
      expiresAt: Date
    }],
    patientConsent: {
      given: Boolean,
      givenAt: Date,
      consentType: String
    }
  },
  
  // Version control
  version: {
    type: Number,
    default: 1
  },
  previousVersion: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MedicalRecord'
  },
  
  // Status and workflow
  status: {
    type: String,
    enum: ['draft', 'pending-review', 'reviewed', 'approved', 'archived'],
    default: 'draft',
    index: true
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  
  // Templates and standardization
  template: {
    templateId: String,
    templateVersion: String,
    customFields: mongoose.Schema.Types.Mixed
  },
  
  // Billing and insurance
  billing: {
    isBillable: {
      type: Boolean,
      default: true
    },
    consultationCode: String,
    insuranceClaimId: String,
    amount: Number
  },
  
  // Audit trail
  auditLog: [{
    action: {
      type: String,
      enum: ['created', 'viewed', 'updated', 'shared', 'downloaded', 'deleted']
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    ipAddress: String,
    userAgent: String,
    details: String
  }],
  
  // Search and categorization
  tags: [{
    type: String,
    lowercase: true,
    trim: true
  }],
  keywords: [String],
  
  // Compliance and legal
  compliance: {
    hipaaCompliant: {
      type: Boolean,
      default: true
    },
    dataRetentionPolicy: String,
    legalHold: {
      type: Boolean,
      default: false
    },
    retentionExpiryDate: Date
  },
  
  // Emergency information
  isEmergencyRecord: {
    type: Boolean,
    default: false
  },
  criticalAlerts: [String],
  
  // Location and facility
  facility: {
    name: String,
    address: String,
    licenseNumber: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
medicalRecordSchema.index({ patient: 1, createdAt: -1 });
medicalRecordSchema.index({ doctor: 1, createdAt: -1 });
medicalRecordSchema.index({ recordType: 1, status: 1 });
medicalRecordSchema.index({ tags: 1 });
medicalRecordSchema.index({ keywords: 1 });
medicalRecordSchema.index({ 'privacy.accessLevel': 1 });
medicalRecordSchema.index({ isEmergencyRecord: 1 });

// Virtual for record age
medicalRecordSchema.virtual('recordAge').get(function() {
  const now = new Date();
  const created = this.createdAt;
  const diffTime = Math.abs(now - created);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Virtual for attachment count
medicalRecordSchema.virtual('attachmentCount').get(function() {
  return this.attachments ? this.attachments.length : 0;
});

// Pre-save middleware
medicalRecordSchema.pre('save', function(next) {
  // Auto-generate tags from content
  if (this.content && this.tags.length === 0) {
    const contentText = JSON.stringify(this.content).toLowerCase();
    const commonMedicalTerms = [
      'hypertension', 'diabetes', 'asthma', 'allergy', 'infection',
      'fever', 'pain', 'headache', 'chest pain', 'shortness of breath',
      'nausea', 'vomiting', 'diarrhea', 'constipation', 'fatigue'
    ];
    
    this.tags = commonMedicalTerms.filter(term => contentText.includes(term));
  }
  
  // Update version if content has changed
  if (this.isModified('content') && !this.isNew) {
    this.version += 1;
  }
  
  // Add audit log entry
  if (this.isNew) {
    this.auditLog.push({
      action: 'created',
      performedBy: this.doctor,
      details: `Medical record created: ${this.title}`
    });
  }
  
  next();
});

// Static methods
medicalRecordSchema.statics.findByPatient = function(patientId, recordType = null, limit = 50) {
  const query = { patient: patientId, status: { $ne: 'archived' } };
  if (recordType) {
    query.recordType = recordType;
  }
  
  return this.find(query)
             .populate('doctor', 'name specializations')
             .populate('appointment', 'appointmentDate consultationType')
             .sort({ createdAt: -1 })
             .limit(limit);
};

medicalRecordSchema.statics.findByDoctor = function(doctorId, limit = 100) {
  return this.find({ 
    doctor: doctorId,
    status: { $ne: 'archived' }
  })
  .populate('patient', 'name email phone')
  .populate('appointment', 'appointmentDate consultationType')
  .sort({ createdAt: -1 })
  .limit(limit);
};

medicalRecordSchema.statics.searchRecords = function(patientId, searchTerm, limit = 20) {
  return this.find({
    patient: patientId,
    $or: [
      { title: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } },
      { tags: { $in: [searchTerm.toLowerCase()] } },
      { keywords: { $in: [searchTerm.toLowerCase()] } }
    ]
  })
  .populate('doctor', 'name specializations')
  .sort({ createdAt: -1 })
  .limit(limit);
};

medicalRecordSchema.statics.findEmergencyRecords = function(patientId) {
  return this.find({
    patient: patientId,
    isEmergencyRecord: true,
    status: { $ne: 'archived' }
  })
  .populate('doctor', 'name specializations')
  .sort({ createdAt: -1 });
};

// Instance methods
medicalRecordSchema.methods.addAuditEntry = function(action, performedBy, details, ipAddress, userAgent) {
  this.auditLog.push({
    action: action,
    performedBy: performedBy,
    details: details,
    ipAddress: ipAddress,
    userAgent: userAgent
  });
  
  return this.save();
};

medicalRecordSchema.methods.shareWith = function(userId, permission, expiresAt) {
  // Remove existing share if any
  this.privacy.sharedWith = this.privacy.sharedWith.filter(
    share => !share.user.equals(userId)
  );
  
  // Add new share
  this.privacy.sharedWith.push({
    user: userId,
    permission: permission,
    sharedAt: new Date(),
    expiresAt: expiresAt
  });
  
  return this.save();
};

medicalRecordSchema.methods.revokeAccess = function(userId) {
  this.privacy.sharedWith = this.privacy.sharedWith.filter(
    share => !share.user.equals(userId)
  );
  
  return this.save();
};

medicalRecordSchema.methods.canBeAccessedBy = function(userId) {
  // Patient can always access their own records
  if (this.patient.equals(userId)) {
    return true;
  }
  
  // Doctor who created can access
  if (this.doctor.equals(userId)) {
    return true;
  }
  
  // Check shared access
  const sharedAccess = this.privacy.sharedWith.find(share => 
    share.user.equals(userId) && 
    (!share.expiresAt || share.expiresAt > new Date())
  );
  
  return !!sharedAccess;
};

medicalRecordSchema.methods.addAttachment = function(fileInfo) {
  this.attachments.push({
    fileName: fileInfo.fileName,
    originalFileName: fileInfo.originalFileName,
    fileUrl: fileInfo.fileUrl,
    fileType: fileInfo.fileType,
    fileSize: fileInfo.fileSize,
    uploadedBy: fileInfo.uploadedBy,
    description: fileInfo.description
  });
  
  return this.save();
};

medicalRecordSchema.methods.signDigitally = function(doctorId, signatureData) {
  this.digitalSignature = {
    doctorSignature: signatureData,
    signedAt: new Date(),
    signatureHash: require('crypto').createHash('sha256').update(signatureData).digest('hex'),
    isVerified: true
  };
  
  this.status = 'approved';
  this.approvedBy = doctorId;
  this.approvedAt = new Date();
  
  return this.save();
};

const MedicalRecord = mongoose.model('MedicalRecord', medicalRecordSchema);

export default MedicalRecord;
