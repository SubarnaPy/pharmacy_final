import mongoose from 'mongoose';

/**
 * Patient Chatbot Message Schema for AI-Patient Conversations
 * Stores all interactions between patients and the AI healthcare chatbot
 */
const PatientChatMessageSchema = new mongoose.Schema({
  // User who sent the message
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Original user message
  userMessage: {
    type: String,
    required: true,
    maxlength: 2000,
    trim: true
  },

  // Bot's response (can be complex object)
  botResponse: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },

  // Type of conversation/interaction
  messageType: {
    type: String,
    enum: [
      'general',
      'healthcare_response', 
      'symptom_analysis',
      'doctor_recommendation',
      'health_education',
      'health_tips',
      'emergency',
      'medication_inquiry',
      'appointment_help',
      'fallback',
      'error'
    ],
    default: 'general',
    index: true
  },

  // Urgency level of the conversation
  urgency: {
    type: String,
    enum: ['low', 'medium', 'high', 'emergency'],
    default: 'low',
    index: true
  },

  // When the message was sent
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },

  // Session identifier for grouping related messages
  session: {
    type: String,
    default: 'default',
    index: true
  },

  // User context when message was sent (age, location, etc.)
  context: {
    age: Number,
    gender: String,
    location: String,
    medications: [String],
    medicalHistory: [String],
    allergies: [String],
    occupation: String
  },

  // AI processing metadata
  aiMetadata: {
    model: {
      type: String,
      default: 'gemini-2.5-flash'
    },
    processingTime: Number,
    confidence: {
      type: Number,
      min: 0,
      max: 1
    },
    intent: [String], // Detected intents
    entities: [String], // Extracted entities
    responseGenerated: {
      type: Date,
      default: Date.now
    }
  },

  // User feedback on the response
  userRating: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    feedback: {
      type: String,
      maxlength: 500
    },
    timestamp: Date
  },

  // Follow-up actions taken
  followUpActions: [{
    action: {
      type: String,
      enum: [
        'doctor_appointment_booked',
        'prescription_uploaded',
        'emergency_contact_made',
        'health_tip_saved',
        'education_bookmarked',
        'specialist_contacted'
      ]
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: mongoose.Schema.Types.Mixed
  }],

  // Whether this conversation led to any healthcare actions
  healthcareActions: {
    appointmentRequested: {
      type: Boolean,
      default: false
    },
    emergencyDetected: {
      type: Boolean,
      default: false
    },
    specialistRecommended: {
      type: Boolean,
      default: false
    },
    symptomAnalyzed: {
      type: Boolean,
      default: false
    },
    medicationDiscussed: {
      type: Boolean,
      default: false
    }
  },

  // Privacy and compliance
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  retentionExpiry: {
    type: Date,
    // Auto-delete after 2 years for privacy compliance
    default: () => new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000)
  },

  // Message thread/conversation tracking
  threadId: {
    type: String,
    index: true
  },
  parentMessageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PatientChatMessage'
  },

  // Quality metrics
  qualityMetrics: {
    relevance: Number, // 0-1 score
    accuracy: Number,  // 0-1 score
    helpfulness: Number, // 0-1 score
    safety: Number     // 0-1 score
  }
}, {
  timestamps: true,
  collection: 'patientchatmessages'
});

// Indexes for efficient querying
PatientChatMessageSchema.index({ userId: 1, timestamp: -1 });
PatientChatMessageSchema.index({ messageType: 1, timestamp: -1 });
PatientChatMessageSchema.index({ urgency: 1, timestamp: -1 });
PatientChatMessageSchema.index({ session: 1, timestamp: 1 });
PatientChatMessageSchema.index({ 'healthcareActions.emergencyDetected': 1 });
PatientChatMessageSchema.index({ retentionExpiry: 1 }, { expireAfterSeconds: 0 });

// Virtual for message age
PatientChatMessageSchema.virtual('age').get(function() {
  return Date.now() - this.timestamp;
});

// Virtual for response quality score
PatientChatMessageSchema.virtual('qualityScore').get(function() {
  if (!this.qualityMetrics) return null;
  const metrics = this.qualityMetrics;
  return (
    (metrics.relevance || 0) + 
    (metrics.accuracy || 0) + 
    (metrics.helpfulness || 0) + 
    (metrics.safety || 0)
  ) / 4;
});

// Methods

/**
 * Mark message as leading to a healthcare action
 */
PatientChatMessageSchema.methods.markHealthcareAction = function(actionType, details = {}) {
  if (this.healthcareActions.hasOwnProperty(actionType)) {
    this.healthcareActions[actionType] = true;
  }
  
  this.followUpActions.push({
    action: actionType,
    details,
    timestamp: new Date()
  });
  
  return this.save();
};

/**
 * Add user rating and feedback
 */
PatientChatMessageSchema.methods.addUserRating = function(rating, feedback = '') {
  this.userRating = {
    rating,
    feedback,
    timestamp: new Date()
  };
  return this.save();
};

/**
 * Get sanitized version for public APIs
 */
PatientChatMessageSchema.methods.toPublicJSON = function() {
  return {
    id: this._id,
    userMessage: this.userMessage,
    botResponse: this.botResponse,
    messageType: this.messageType,
    urgency: this.urgency,
    timestamp: this.timestamp,
    userRating: this.userRating,
    age: this.age
  };
};

// Static methods

/**
 * Get conversation summary for a user
 */
PatientChatMessageSchema.statics.getConversationSummary = async function(userId, timeframe = '7d') {
  const startDate = new Date();
  
  switch (timeframe) {
    case '1d':
      startDate.setDate(startDate.getDate() - 1);
      break;
    case '7d':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(startDate.getDate() - 30);
      break;
    default:
      startDate.setDate(startDate.getDate() - 7);
  }

  const summary = await this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        timestamp: { $gte: startDate },
        isDeleted: { $ne: true }
      }
    },
    {
      $group: {
        _id: null,
        totalMessages: { $sum: 1 },
        messageTypes: { $addToSet: '$messageType' },
        urgencyLevels: { $push: '$urgency' },
        averageRating: { $avg: '$userRating.rating' },
        emergencies: {
          $sum: { $cond: [{ $eq: ['$urgency', 'emergency'] }, 1, 0] }
        },
        healthcareActions: {
          $sum: { $cond: ['$healthcareActions.appointmentRequested', 1, 0] }
        }
      }
    }
  ]);

  return summary[0] || {
    totalMessages: 0,
    messageTypes: [],
    urgencyLevels: [],
    averageRating: null,
    emergencies: 0,
    healthcareActions: 0
  };
};

// Pre-save middleware
PatientChatMessageSchema.pre('save', function(next) {
  // Set threadId if not provided
  if (!this.threadId) {
    this.threadId = `${this.userId}_${this.session}`;
  }

  // Auto-detect healthcare actions from response
  if (this.botResponse && typeof this.botResponse === 'object') {
    if (this.botResponse.type === 'emergency') {
      this.healthcareActions.emergencyDetected = true;
    }
    if (this.botResponse.doctor_recommendations) {
      this.healthcareActions.specialistRecommended = true;
    }
    if (this.messageType === 'symptom_analysis') {
      this.healthcareActions.symptomAnalyzed = true;
    }
  }

  next();
});

const PatientChatMessage = mongoose.model('PatientChatMessage', PatientChatMessageSchema);

export default PatientChatMessage;
