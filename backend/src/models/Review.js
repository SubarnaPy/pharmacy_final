import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  // Review participants
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  reviewee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Review context
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: true,
    index: true
  },
  reviewType: {
    type: String,
    enum: ['patient-to-doctor', 'doctor-to-patient'],
    required: true
  },
  
  // Rating and feedback
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
    validate: {
      validator: function(value) {
        return Number.isInteger(value) || (value % 0.5 === 0);
      },
      message: 'Rating must be a whole number or half number between 1 and 5'
    }
  },
  
  // Detailed ratings (for doctor reviews)
  detailedRatings: {
    punctuality: {
      type: Number,
      min: 1,
      max: 5
    },
    communication: {
      type: Number,
      min: 1,
      max: 5
    },
    expertise: {
      type: Number,
      min: 1,
      max: 5
    },
    empathy: {
      type: Number,
      min: 1,
      max: 5
    },
    valueForMoney: {
      type: Number,
      min: 1,
      max: 5
    }
  },
  
  // Written review
  reviewText: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  
  // Recommendation
  wouldRecommend: {
    type: Boolean,
    default: true
  },
  
  // Tags and categories
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  // Review quality metrics
  helpfulVotes: {
    type: Number,
    default: 0,
    min: 0
  },
  totalVotes: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Moderation
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'flagged'],
    default: 'pending',
    index: true
  },
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  moderatedAt: Date,
  moderationReason: String,
  
  // Verification
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationMethod: {
    type: String,
    enum: ['appointment-confirmed', 'payment-verified', 'manual']
  },
  
  // Response from reviewee
  response: {
    text: {
      type: String,
      trim: true,
      maxlength: 500
    },
    respondedAt: Date
  },
  
  // Privacy settings
  isAnonymous: {
    type: Boolean,
    default: false
  },
  showReviewerName: {
    type: Boolean,
    default: true
  },
  
  // Additional metadata
  consultationType: {
    type: String,
    enum: ['chat', 'phone', 'email', 'video']
  },
  appointmentDuration: Number, // in minutes
  
  // Flagging and reporting
  flags: [{
    flaggedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: {
      type: String,
      enum: ['inappropriate', 'spam', 'fake', 'offensive', 'irrelevant', 'other']
    },
    description: String,
    flaggedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Analytics
  viewCount: {
    type: Number,
    default: 0
  },
  
  // Location context
  location: {
    city: String,
    state: String,
    country: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes
reviewSchema.index({ reviewee: 1, status: 1, createdAt: -1 });
reviewSchema.index({ reviewer: 1, createdAt: -1 });
reviewSchema.index({ appointment: 1 }, { unique: true }); // One review per appointment
reviewSchema.index({ rating: -1, status: 1 });
reviewSchema.index({ reviewType: 1, status: 1 });

// Virtual for helpfulness percentage
reviewSchema.virtual('helpfulnessPercentage').get(function() {
  if (this.totalVotes === 0) return 0;
  return Math.round((this.helpfulVotes / this.totalVotes) * 100);
});

// Virtual for average detailed rating
reviewSchema.virtual('averageDetailedRating').get(function() {
  if (!this.detailedRatings) return null;
  
  const ratings = Object.values(this.detailedRatings).filter(r => r !== null && r !== undefined);
  if (ratings.length === 0) return null;
  
  const sum = ratings.reduce((acc, rating) => acc + rating, 0);
  return Math.round((sum / ratings.length) * 10) / 10;
});

// Virtual for reviewer display name
reviewSchema.virtual('reviewerDisplayName').get(function() {
  if (this.isAnonymous || !this.showReviewerName) {
    return 'Anonymous';
  }
  // This would be populated from the reviewer reference
  return 'Patient'; // Default fallback
});

// Pre-save middleware
reviewSchema.pre('save', function(next) {
  // Auto-approve reviews from verified appointments
  if (this.isNew && this.verificationMethod === 'appointment-confirmed') {
    this.status = 'approved';
    this.isVerified = true;
  }
  
  // Extract tags from review text for better searchability
  if (this.reviewText && this.tags.length === 0) {
    const commonTags = [
      'punctual', 'late', 'professional', 'friendly', 'knowledgeable', 
      'thorough', 'quick', 'patient', 'helpful', 'experienced',
      'expensive', 'affordable', 'worth it', 'excellent', 'good', 'poor'
    ];
    
    const extractedTags = commonTags.filter(tag => 
      this.reviewText.toLowerCase().includes(tag)
    );
    
    this.tags = [...new Set(extractedTags)]; // Remove duplicates
  }
  
  next();
});

// Static methods
reviewSchema.statics.getAverageRating = async function(doctorId) {
  const result = await this.aggregate([
    {
      $match: {
        reviewee: new mongoose.Types.ObjectId(doctorId),
        status: 'approved',
        reviewType: 'patient-to-doctor'
      }
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
        ratingDistribution: {
          $push: '$rating'
        }
      }
    }
  ]);
  
  if (result.length === 0) {
    return { averageRating: 0, totalReviews: 0, ratingDistribution: {} };
  }
  
  const data = result[0];
  const distribution = {};
  for (let i = 1; i <= 5; i++) {
    distribution[i] = data.ratingDistribution.filter(r => Math.floor(r) === i).length;
  }
  
  return {
    averageRating: Math.round(data.averageRating * 10) / 10,
    totalReviews: data.totalReviews,
    ratingDistribution: distribution
  };
};

reviewSchema.statics.getTopReviews = function(doctorId, limit = 5) {
  return this.find({
    reviewee: doctorId,
    status: 'approved',
    reviewType: 'patient-to-doctor'
  })
  .populate('reviewer', 'name profilePicture')
  .populate('appointment', 'consultationType appointmentDate')
  .sort({ helpfulVotes: -1, createdAt: -1 })
  .limit(limit);
};

reviewSchema.statics.getRecentReviews = function(doctorId, limit = 10) {
  return this.find({
    reviewee: doctorId,
    status: 'approved',
    reviewType: 'patient-to-doctor'
  })
  .populate('reviewer', 'name profilePicture')
  .populate('appointment', 'consultationType appointmentDate')
  .sort({ createdAt: -1 })
  .limit(limit);
};

reviewSchema.statics.findPendingModeration = function(limit = 50) {
  return this.find({ status: 'pending' })
             .populate('reviewer', 'name email')
             .populate('reviewee', 'name email')
             .populate('appointment', 'appointmentDate consultationType')
             .sort({ createdAt: 1 })
             .limit(limit);
};

// Instance methods
reviewSchema.methods.markHelpful = function(userId) {
  // In a real implementation, you'd track who voted to prevent duplicate votes
  this.helpfulVotes += 1;
  this.totalVotes += 1;
  return this.save();
};

reviewSchema.methods.markUnhelpful = function(userId) {
  // In a real implementation, you'd track who voted to prevent duplicate votes
  this.totalVotes += 1;
  return this.save();
};

reviewSchema.methods.addResponse = function(responseText) {
  this.response = {
    text: responseText,
    respondedAt: new Date()
  };
  return this.save();
};

reviewSchema.methods.flag = function(userId, reason, description) {
  this.flags.push({
    flaggedBy: userId,
    reason: reason,
    description: description
  });
  
  // Auto-flag for manual review if multiple flags
  if (this.flags.length >= 3) {
    this.status = 'flagged';
  }
  
  return this.save();
};

reviewSchema.methods.approve = function(moderatorId) {
  this.status = 'approved';
  this.moderatedBy = moderatorId;
  this.moderatedAt = new Date();
  return this.save();
};

reviewSchema.methods.reject = function(moderatorId, reason) {
  this.status = 'rejected';
  this.moderatedBy = moderatorId;
  this.moderatedAt = new Date();
  this.moderationReason = reason;
  return this.save();
};

const Review = mongoose.model('Review', reviewSchema);

export default Review;
