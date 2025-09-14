import mongoose from 'mongoose';

const specialistSchema = new mongoose.Schema({
  // Personal Information
  personalInfo: {
    firstName: {
      type: String,
      required: true,
      trim: true
    },
    lastName: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true
    },
    phone: {
      type: String,
      required: true
    },
    dateOfBirth: Date,
    gender: {
      type: String,
      enum: ['male', 'female', 'other']
    },
    profileImage: String
  },
  
  // Professional Information
  professionalInfo: {
    licenseNumber: {
      type: String,
      required: true,
      unique: true
    },
    specialty: {
      type: String,
      required: true,
      enum: [
        'general_medicine', 'cardiology', 'dermatology', 'endocrinology',
        'gastroenterology', 'hematology', 'neurology', 'oncology',
        'orthopedics', 'pediatrics', 'psychiatry', 'pulmonology',
        'radiology', 'surgery', 'urology', 'gynecology', 'ophthalmology',
        'otolaryngology', 'anesthesiology', 'emergency_medicine',
        'family_medicine', 'internal_medicine', 'pathology',
        'physical_medicine', 'preventive_medicine', 'rheumatology'
      ]
    },
    subSpecialties: [{
      type: String
    }],
    experience: {
      type: Number,
      required: true,
      min: 0
    },
    qualifications: [{
      degree: String,
      institution: String,
      year: Number,
      country: String
    }],
    certifications: [{
      name: String,
      issuingOrganization: String,
      issueDate: Date,
      expiryDate: Date,
      certificateNumber: String
    }],
    languages: [{
      language: String,
      proficiency: {
        type: String,
        enum: ['basic', 'intermediate', 'advanced', 'native']
      }
    }]
  },
  
  // Practice Information
  practiceInfo: {
    hospitalAffiliations: [{
      hospitalName: String,
      department: String,
      position: String,
      startDate: Date,
      endDate: Date,
      current: Boolean
    }],
    clinicAddresses: [{
      name: String,
      addressLine1: String,
      addressLine2: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
      phone: String,
      isPrimary: Boolean,
      coordinates: {
        latitude: Number,
        longitude: Number
      }
    }],
    consultationFees: {
      inPersonConsultation: Number,
      videoConsultation: Number,
      followUpConsultation: Number,
      emergencyConsultation: Number,
      currency: {
        type: String,
        default: 'USD'
      }
    },
    insuranceAccepted: [{
      provider: String,
      planTypes: [String]
    }]
  },
  
  // Availability & Scheduling
  availability: {
    weeklySchedule: [{
      dayOfWeek: {
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      },
      slots: [{
        startTime: String, // Format: "HH:MM"
        endTime: String,   // Format: "HH:MM"
        type: {
          type: String,
          enum: ['in-person', 'video', 'both']
        },
        maxAppointments: Number
      }]
    }],
    exceptions: [{
      date: Date,
      type: {
        type: String,
        enum: ['unavailable', 'modified_schedule', 'emergency_only']
      },
      reason: String,
      modifiedSlots: [{
        startTime: String,
        endTime: String,
        type: String,
        maxAppointments: Number
      }]
    }],
    nextAvailableSlot: Date,
    bookingAdvanceLimit: {
      type: Number,
      default: 30 // days
    },
    emergencyAvailability: {
      available: Boolean,
      responseTime: String,
      additionalFee: Number
    }
  },
  
  // Ratings & Reviews
  ratingsAndReviews: {
    overallRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalReviews: {
      type: Number,
      default: 0
    },
    ratingBreakdown: {
      fiveStars: { type: Number, default: 0 },
      fourStars: { type: Number, default: 0 },
      threeStars: { type: Number, default: 0 },
      twoStars: { type: Number, default: 0 },
      oneStar: { type: Number, default: 0 }
    },
    categories: {
      bedside_manner: { type: Number, default: 0 },
      waiting_time: { type: Number, default: 0 },
      treatment_effectiveness: { type: Number, default: 0 },
      communication: { type: Number, default: 0 },
      facility_cleanliness: { type: Number, default: 0 }
    }
  },
  
  // Statistics
  statistics: {
    totalPatients: { type: Number, default: 0 },
    totalConsultations: { type: Number, default: 0 },
    averageConsultationTime: { type: Number, default: 0 }, // in minutes
    specialtySuccessRate: { type: Number, default: 0 }, // percentage
    patientSatisfactionScore: { type: Number, default: 0 },
    responseTime: {
      averageResponseTime: { type: Number, default: 0 }, // in hours
      emergencyResponseTime: { type: Number, default: 0 } // in minutes
    },
    monthlyStats: [{
      month: Date,
      consultations: Number,
      newPatients: Number,
      rating: Number,
      revenue: Number
    }]
  },
  
  // Verification & Status
  verification: {
    isVerified: {
      type: Boolean,
      default: false
    },
    verificationDate: Date,
    verificationDocuments: [{
      type: String,
      filename: String,
      uploadDate: Date,
      verified: Boolean
    }],
    backgroundCheckStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    licenseVerificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'expired', 'revoked'],
      default: 'pending'
    }
  },
  
  // Account Status
  accountStatus: {
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'pending_approval'],
      default: 'pending_approval'
    },
    joinDate: {
      type: Date,
      default: Date.now
    },
    lastActiveDate: Date,
    subscriptionPlan: {
      type: String,
      enum: ['basic', 'premium', 'enterprise'],
      default: 'basic'
    },
    subscriptionExpiry: Date
  },
  
  // Preferences & Settings
  preferences: {
    notificationSettings: {
      emailNotifications: { type: Boolean, default: true },
      smsNotifications: { type: Boolean, default: true },
      pushNotifications: { type: Boolean, default: true },
      appointmentReminders: { type: Boolean, default: true },
      marketingEmails: { type: Boolean, default: false }
    },
    consultationPreferences: {
      preferredConsultationTypes: [{
        type: String,
        enum: ['in-person', 'video', 'phone']
      }],
      maxDailyAppointments: { type: Number, default: 20 },
      bufferTimeBetweenAppointments: { type: Number, default: 15 }, // minutes
      allowEmergencyConsultations: { type: Boolean, default: true }
    },
    privacySettings: {
      profileVisibility: {
        type: String,
        enum: ['public', 'verified_patients_only', 'private'],
        default: 'public'
      },
      showRealTimeAvailability: { type: Boolean, default: true },
      allowDirectBooking: { type: Boolean, default: true }
    }
  },
  
  // AI Integration
  aiIntegration: {
    useAiAssistance: { type: Boolean, default: true },
    aiSpecialtyFocus: [String],
    aiPreferences: {
      diagnosisAssistance: { type: Boolean, default: true },
      treatmentRecommendations: { type: Boolean, default: true },
      patientRiskAssessment: { type: Boolean, default: true },
      automatedFollowUp: { type: Boolean, default: false }
    }
  }
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
specialistSchema.index({ 'personalInfo.email': 1 });
specialistSchema.index({ 'professionalInfo.licenseNumber': 1 });
specialistSchema.index({ 'professionalInfo.specialty': 1 });
specialistSchema.index({ 'practiceInfo.clinicAddresses.city': 1 });
specialistSchema.index({ 'practiceInfo.clinicAddresses.state': 1 });
specialistSchema.index({ 'ratingsAndReviews.overallRating': -1 });
specialistSchema.index({ 'accountStatus.status': 1 });
specialistSchema.index({ 'availability.nextAvailableSlot': 1 });
specialistSchema.index({ 'practiceInfo.clinicAddresses.coordinates': '2dsphere' });

// Virtuals
specialistSchema.virtual('fullName').get(function() {
  return `${this.personalInfo.firstName} ${this.personalInfo.lastName}`;
});

specialistSchema.virtual('isAvailableToday').get(function() {
  const today = new Date();
  const dayOfWeek = today.toLocaleLowerCase().slice(0, 3); // 'mon', 'tue', etc.
  
  return this.availability.weeklySchedule.some(schedule => 
    schedule.dayOfWeek.startsWith(dayOfWeek)
  );
});

specialistSchema.virtual('primaryClinicAddress').get(function() {
  return this.practiceInfo.clinicAddresses.find(address => address.isPrimary) ||
         this.practiceInfo.clinicAddresses[0];
});

// Methods
specialistSchema.methods.updateRating = function(newRating) {
  const ratings = this.ratingsAndReviews;
  const totalReviews = ratings.totalReviews;
  const currentRating = ratings.overallRating;
  
  // Update overall rating
  const newOverallRating = ((currentRating * totalReviews) + newRating) / (totalReviews + 1);
  ratings.overallRating = Math.round(newOverallRating * 10) / 10;
  
  // Update total reviews
  ratings.totalReviews += 1;
  
  // Update rating breakdown
  const starKey = `${newRating}Stars`.replace('.', '');
  if (ratings.ratingBreakdown[starKey] !== undefined) {
    ratings.ratingBreakdown[starKey] += 1;
  }
  
  return this.save();
};

specialistSchema.methods.isAvailable = function(dateTime) {
  const requestedDate = new Date(dateTime);
  const dayOfWeek = requestedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const timeString = requestedDate.toTimeString().slice(0, 5); // "HH:MM"
  
  // Check if there's an exception for this date
  const exception = this.availability.exceptions.find(exc => 
    exc.date.toDateString() === requestedDate.toDateString()
  );
  
  if (exception) {
    if (exception.type === 'unavailable') return false;
    if (exception.type === 'modified_schedule') {
      return exception.modifiedSlots.some(slot => 
        timeString >= slot.startTime && timeString <= slot.endTime
      );
    }
  }
  
  // Check regular weekly schedule
  const daySchedule = this.availability.weeklySchedule.find(schedule => 
    schedule.dayOfWeek === dayOfWeek
  );
  
  if (!daySchedule) return false;
  
  return daySchedule.slots.some(slot => 
    timeString >= slot.startTime && timeString <= slot.endTime
  );
};

specialistSchema.methods.getAvailableSlots = function(date, type = 'both') {
  const requestedDate = new Date(date);
  const dayOfWeek = requestedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  
  // Check for exceptions first
  const exception = this.availability.exceptions.find(exc => 
    exc.date.toDateString() === requestedDate.toDateString()
  );
  
  let availableSlots = [];
  
  if (exception) {
    if (exception.type === 'unavailable') return [];
    if (exception.type === 'modified_schedule') {
      availableSlots = exception.modifiedSlots.filter(slot => 
        type === 'both' || slot.type === type || slot.type === 'both'
      );
    }
  } else {
    // Use regular schedule
    const daySchedule = this.availability.weeklySchedule.find(schedule => 
      schedule.dayOfWeek === dayOfWeek
    );
    
    if (daySchedule) {
      availableSlots = daySchedule.slots.filter(slot => 
        type === 'both' || slot.type === type || slot.type === 'both'
      );
    }
  }
  
  return availableSlots;
};

// Static methods
specialistSchema.statics.findBySpecialty = function(specialty, location = null, options = {}) {
  const { 
    maxDistance = 50, // km
    minRating = 0,
    availableToday = false,
    page = 1,
    limit = 10 
  } = options;
  
  let query = {
    'professionalInfo.specialty': specialty,
    'accountStatus.status': 'active',
    'verification.isVerified': true,
    'ratingsAndReviews.overallRating': { $gte: minRating }
  };
  
  if (location && location.latitude && location.longitude) {
    query['practiceInfo.clinicAddresses.coordinates'] = {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [location.longitude, location.latitude]
        },
        $maxDistance: maxDistance * 1000 // Convert to meters
      }
    };
  }
  
  let queryBuilder = this.find(query)
    .sort({ 'ratingsAndReviews.overallRating': -1, 'statistics.totalPatients': -1 })
    .limit(limit)
    .skip((page - 1) * limit);
  
  if (availableToday) {
    const today = new Date();
    const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    queryBuilder = queryBuilder.where('availability.weeklySchedule.dayOfWeek').equals(dayOfWeek);
  }
  
  return queryBuilder.exec();
};

specialistSchema.statics.findNearby = function(coordinates, maxDistance = 25) {
  return this.find({
    'practiceInfo.clinicAddresses.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [coordinates.longitude, coordinates.latitude]
        },
        $maxDistance: maxDistance * 1000
      }
    },
    'accountStatus.status': 'active',
    'verification.isVerified': true
  }).limit(20);
};

specialistSchema.statics.getTopRated = function(limit = 10) {
  return this.find({
    'accountStatus.status': 'active',
    'verification.isVerified': true,
    'ratingsAndReviews.totalReviews': { $gte: 5 }
  })
  .sort({ 'ratingsAndReviews.overallRating': -1 })
  .limit(limit);
};

const Specialist = mongoose.model('Specialist', specialistSchema);

export default Specialist;
