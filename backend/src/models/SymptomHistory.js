import mongoose from 'mongoose';

const symptomHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Original symptom input
  symptoms: {
    type: String,
    required: true,
    maxlength: 5000
  },
  
  // Additional information provided by user
  additionalInfo: {
    duration: { type: String },
    severity: { 
      type: String, 
      enum: ['mild', 'moderate', 'severe', 'extreme'],
      default: 'moderate'
    },
    triggers: { type: String },
    medications: { type: String },
    allergies: { type: String },
    previousTreatment: { type: String }
  },
  
  // AI Analysis Results
  analysis: {
    symptomAnalysis: {
      primary_symptoms: [String],
      secondary_symptoms: [String],
      symptom_clusters: mongoose.Schema.Types.Mixed,
      symptom_relationships: mongoose.Schema.Types.Mixed,
      severity_assessment: {
        type: String,
        enum: ['mild', 'moderate', 'severe', 'critical']
      },
      confidence_score: {
        type: Number,
        min: 0,
        max: 100
      }
    },
    possibleCauses: [String],
    bodySystemsInvolved: {
      affectedSystems: [{
        system: String,
        confidence: Number,
        matchingSymptoms: [String],
        severity: String
      }],
      primarySystem: String,
      systemInteractions: String
    },
    severityAssessment: {
      type: String,
      enum: ['mild', 'moderate', 'severe', 'critical']
    },
    confidenceScore: {
      type: Number,
      min: 0,
      max: 100
    },
    recommendations: {
      immediateActions: [String],
      selfCareMeasures: [String],
      whenToSeeDoctor: String,
      followUpTiming: String
    },
    redFlags: [String],
    timeline: {
      ifSymptomsWorsen: String,
      followUpTiming: String,
      emergencySigns: [String]
    },
    processingTime: Number,
    modelVersion: String,
    confidenceMetrics: mongoose.Schema.Types.Mixed
  },
  
  // Risk Assessment Results
  riskAnalysis: {
    riskScore: {
      type: Number,
      min: 0,
      max: 100
    },
    urgencyLevel: {
      type: String,
      enum: ['low', 'moderate', 'urgent', 'emergency']
    },
    riskFactors: [{
      category: String,
      factor: String,
      description: String,
      riskLevel: {
        type: String,
        enum: ['low', 'moderate', 'high', 'critical']
      },
      score: Number
    }],
    clinicalAlerts: [{
      type: String,
      severity: String,
      message: String,
      factors: [String],
      recommendation: String
    }],
    recommendations: {
      immediate: [String],
      shortTerm: [String],
      longTerm: [String],
      monitoring: [String]
    },
    followUpProtocol: {
      initialFollowUp: String,
      subsequentFollowUp: String,
      monitoringFrequency: String,
      escalationCriteria: String
    }
  },
  
  // Clinical Decision Support Results
  clinicalRecommendations: {
    differentialDiagnosis: [{
      condition: String,
      likelihood: String,
      urgency: String
    }],
    recommendedTests: [{
      test: String,
      priority: String,
      reason: String
    }],
    treatmentOptions: [{
      treatment: String,
      type: String,
      priority: String
    }],
    specialistReferrals: [{
      specialty: String,
      urgency: String,
      reason: String,
      priority: Number
    }],
    clinicalPathways: [{
      name: String,
      urgency: String,
      primaryTests: [String],
      secondaryTests: [String],
      differentials: [String],
      redFlags: [String],
      timeFrames: mongoose.Schema.Types.Mixed,
      matchingCriteria: [String],
      applicability: Number
    }],
    recommendedPathway: {
      name: String,
      urgency: String,
      primaryTests: [String],
      secondaryTests: [String],
      differentials: [String],
      redFlags: [String],
      timeFrames: mongoose.Schema.Types.Mixed,
      matchingCriteria: [String],
      applicability: Number
    },
    evidenceLevel: {
      type: String,
      enum: ['low', 'moderate', 'high']
    }
  },
  
  // Simple Body Parts Selection (removed 3D visualization)
  selectedBodyParts: [String],
  
  // Multi-Modal Data
  multiModalData: {
    voiceAnalysis: {
      transcript: String,
      voiceCharacteristics: {
        pitch: String,
        pace: String,
        volume: String,
        tension: String,
        clarity: String
      },
      emotionalTone: {
        primary: String,
        intensity: Number,
        confidence: Number
      },
      speechPatterns: {
        patterns: [{
          type: String,
          details: String,
          significance: String
        }]
      },
      medicalKeywords: [{
        keyword: String,
        context: String
      }],
      confidence: Number
    },
    imageAnalysis: {
      processedImages: [{
        imageId: String,
        timestamp: Date,
        medicalFindings: [{
          finding: String,
          confidence: Number,
          recommendation: String
        }],
        visualSymptoms: [{
          symptom: String,
          confidence: Number,
          location: String,
          severity: String
        }],
        imageQuality: {
          score: Number,
          factors: mongoose.Schema.Types.Mixed
        },
        confidence: Number,
        processingMethod: String
      }],
      medicalFindings: [mongoose.Schema.Types.Mixed],
      visualSymptoms: [mongoose.Schema.Types.Mixed],
      confidence: Number,
      overallInsights: mongoose.Schema.Types.Mixed
    },
    videoAnalysis: {
      processedVideos: [{
        videoId: String,
        timestamp: Date,
        duration: Number,
        motionData: {
          motionType: String,
          intensity: String,
          patterns: [String],
          anomalies: [String]
        },
        behavioralPatterns: [{
          pattern: String,
          confidence: Number,
          relevance: String
        }],
        videoQuality: {
          score: Number,
          factors: mongoose.Schema.Types.Mixed
        },
        confidence: Number,
        processingMethod: String
      }],
      motionAnalysis: [mongoose.Schema.Types.Mixed],
      behavioralPatterns: [mongoose.Schema.Types.Mixed],
      confidence: Number,
      overallInsights: mongoose.Schema.Types.Mixed
    },
    drawingAnalysis: {
      processedDrawings: [{
        drawingId: String,
        timestamp: Date,
        drawingType: String,
        painMapping: {
          painAreas: [mongoose.Schema.Types.Mixed],
          intensityMap: mongoose.Schema.Types.Mixed,
          patterns: String
        },
        anatomicalAnnotations: [mongoose.Schema.Types.Mixed],
        confidence: Number,
        processingMethod: String
      }],
      painMappings: [mongoose.Schema.Types.Mixed],
      anatomicalAnnotations: [mongoose.Schema.Types.Mixed],
      confidence: Number,
      overallInsights: mongoose.Schema.Types.Mixed
    },
    insights: [{
      type: String,
      message: String,
      confidence: Number
    }],
    combinedInsights: {
      overallConfidence: Number,
      keyFindings: [String],
      recommendations: [String],
      dataQuality: {
        type: String,
        enum: ['low', 'moderate', 'high', 'unknown']
      }
    }
  },
  
  // Emotion Analysis
  emotionAnalysis: {
    primaryEmotion: {
      emotion: String,
      score: Number,
      confidence: Number
    },
    secondaryEmotions: [{
      emotion: String,
      score: Number,
      confidence: Number
    }],
    emotionalIntensity: Number,
    textEmotions: mongoose.Schema.Types.Mixed,
    voiceEmotions: mongoose.Schema.Types.Mixed,
    combinedAnalysis: mongoose.Schema.Types.Mixed
  },
  
  // Progression Insights
  progressionInsights: {
    newEvent: {
      timestamp: String,
      event: String,
      severity: String,
      riskScore: Number,
      urgencyLevel: String,
      symptoms: [String],
      bodySystemsInvolved: [String]
    },
    patterns: [{
      type: String,
      confidence: Number,
      description: String,
      recommendation: String
    }],
    trends: {
      severity: {
        direction: String,
        confidence: Number,
        slope: Number
      },
      riskScore: {
        direction: String,
        confidence: Number,
        slope: Number
      },
      frequency: {
        direction: String,
        confidence: Number
      },
      systemInvolvement: {
        direction: String,
        confidence: Number
      }
    },
    predictions: {
      severityPrediction: {
        direction: String,
        confidence: Number,
        timeframe: String,
        recommendation: String
      },
      riskPrediction: {
        direction: String,
        confidence: Number,
        recommendation: String
      },
      timelinePrediction: String,
      interventionRecommendations: [{
        intervention: String,
        reason: String,
        timeframe: String
      }]
    },
    insights: [{
      type: String,
      message: String,
      recommendation: String,
      confidence: Number
    }]
  },
  
  // Available Specialists
  specialists: [{
    id: String,
    name: String,
    specialty: String,
    rating: Number,
    totalReviews: Number,
    fee: Number,
    experience: Number,
    nextAvailable: Date,
    location: String,
    hospital: String,
    qualifications: [String],
    specializations: [String],
    recommendationReason: String
  }],
  
  // Metadata
  metadata: {
    analysisId: String,
    timestamp: Date,
    processingTime: Number,
    aiModelVersion: String,
    confidenceMetrics: mongoose.Schema.Types.Mixed,
    ipAddress: String,
    userAgent: String,
    deviceInfo: mongoose.Schema.Types.Mixed
  },
  
  // Status and Follow-up
  status: {
    type: String,
    enum: ['active', 'resolved', 'monitoring', 'escalated'],
    default: 'active'
  },
  
  followUp: {
    required: { type: Boolean, default: false },
    dueDate: Date,
    completed: { type: Boolean, default: false },
    completedDate: Date,
    notes: String
  },
  
  // User feedback
  userFeedback: {
    helpful: Boolean,
    accuracy: {
      type: Number,
      min: 1,
      max: 5
    },
    comments: String,
    submittedAt: Date
  }
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
symptomHistorySchema.index({ userId: 1, createdAt: -1 });
symptomHistorySchema.index({ 'riskAnalysis.urgencyLevel': 1 });
symptomHistorySchema.index({ 'analysis.severityAssessment': 1 });
symptomHistorySchema.index({ status: 1 });
symptomHistorySchema.index({ 'followUp.required': 1, 'followUp.dueDate': 1 });

// Virtual for duration since creation
symptomHistorySchema.virtual('timeSinceCreation').get(function() {
  return Date.now() - this.createdAt.getTime();
});

// Virtual for risk level classification
symptomHistorySchema.virtual('riskLevel').get(function() {
  const score = this.riskAnalysis?.riskScore || 0;
  if (score >= 80) return 'high';
  if (score >= 60) return 'moderate';
  if (score >= 40) return 'low';
  return 'minimal';
});

// Methods
symptomHistorySchema.methods.updateFollowUp = function(status, notes) {
  this.followUp.completed = status === 'completed';
  this.followUp.completedDate = status === 'completed' ? new Date() : undefined;
  this.followUp.notes = notes;
  return this.save();
};

symptomHistorySchema.methods.addUserFeedback = function(feedback) {
  this.userFeedback = {
    ...feedback,
    submittedAt: new Date()
  };
  return this.save();
};

symptomHistorySchema.methods.updateStatus = function(newStatus) {
  this.status = newStatus;
  return this.save();
};

// Static methods
symptomHistorySchema.statics.findByUserId = function(userId, options = {}) {
  const { page = 1, limit = 10, status, urgencyLevel } = options;
  const query = { userId };
  
  if (status) query.status = status;
  if (urgencyLevel) query['riskAnalysis.urgencyLevel'] = urgencyLevel;
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip((page - 1) * limit)
    .populate('userId', 'profile.firstName profile.lastName profile.age');
};

symptomHistorySchema.statics.findHighRisk = function(options = {}) {
  const { limit = 50 } = options;
  return this.find({
    'riskAnalysis.urgencyLevel': { $in: ['urgent', 'emergency'] }
  })
  .sort({ createdAt: -1 })
  .limit(limit)
  .populate('userId', 'profile.firstName profile.lastName profile.age');
};

symptomHistorySchema.statics.getAnalytics = function(userId, dateRange = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - dateRange);
  
  return this.aggregate([
    {
      $match: {
        userId: mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalAnalyses: { $sum: 1 },
        averageRiskScore: { $avg: '$riskAnalysis.riskScore' },
        severityDistribution: {
          $push: '$analysis.severityAssessment'
        },
        urgencyDistribution: {
          $push: '$riskAnalysis.urgencyLevel'
        },
        mostCommonSymptoms: {
          $push: '$analysis.symptomAnalysis.primary_symptoms'
        }
      }
    }
  ]);
};

const SymptomHistory = mongoose.model('SymptomHistory', symptomHistorySchema);

export default SymptomHistory;
