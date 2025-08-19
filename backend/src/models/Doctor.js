import mongoose from 'mongoose';
const { Schema } = mongoose;

/**
 * Doctor Model - Comprehensive doctor profile and professional information
 */
const doctorSchema = new Schema({
  // Basic Information
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },

  // Professional Details
  medicalLicense: {
    licenseNumber: { type: String, required: true, unique: true },
    issuingAuthority: { type: String, required: true },
    issueDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    isVerified: { type: Boolean, default: false },
    verificationDate: Date,
    documents: [{
      fileName: String,
      fileUrl: String,
      uploadedAt: { type: Date, default: Date.now }
    }]
  },

  // Professional Profile
  specializations: [{
    type: String,
    enum: [
      'General Medicine', 'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics',
      'Gynecology', 'Dermatology', 'Psychiatry', 'Ophthalmology', 'ENT',
      'Radiology', 'Pathology', 'Anesthesiology', 'Emergency Medicine',
      'Internal Medicine', 'Surgery', 'Oncology', 'Endocrinology',
      'Gastroenterology', 'Nephrology', 'Pulmonology', 'Rheumatology',
      'Infectious Disease', 'Allergy & Immunology', 'Sports Medicine',
      'Pain Management', 'Rehabilitation', 'Preventive Medicine', 'Other'
    ]
  }],

  qualifications: [{
    degree: { type: String, required: true },
    institution: { type: String, required: true },
    year: { type: Number, required: true },
    specialization: String
  }],

  experience: {
    totalYears: { type: Number, default: 0 },
    currentPosition: String,
    workplace: [{
      hospitalName: String,
      position: String,
      startDate: Date,
      endDate: Date,
      isCurrent: { type: Boolean, default: false }
    }]
  },

  // Profile Information
  profileImage: String,
  bio: { type: String, maxlength: 1000 },
  languages: [String],

  // Consultation Settings
  consultationModes: {
    chat: {
      available: { type: Boolean, default: false },
      fee: { type: Number, default: 0 },
      duration: { type: Number, default: 30 } // minutes
    },
    phone: {
      available: { type: Boolean, default: false },
      fee: { type: Number, default: 0 },
      duration: { type: Number, default: 30 }
    },
    email: {
      available: { type: Boolean, default: false },
      fee: { type: Number, default: 0 },
      responseTime: { type: Number, default: 24 } // hours
    },
    video: {
      available: { type: Boolean, default: false },
      fee: { type: Number, default: 0 },
      duration: { type: Number, default: 30 }
    },
    inPerson: {
      available: { type: Boolean, default: false },
      fee: { type: Number, default: 0 },
      duration: { type: Number, default: 60 }
    }
  },

  // Availability & Schedule
  workingHours: {
    monday: { 
      available: { type: Boolean, default: false },
      slots: [{ start: String, end: String }],
      breaks: [{ start: String, end: String, label: String }]
    },
    tuesday: { 
      available: { type: Boolean, default: false },
      slots: [{ start: String, end: String }],
      breaks: [{ start: String, end: String, label: String }]
    },
    wednesday: { 
      available: { type: Boolean, default: false },
      slots: [{ start: String, end: String }],
      breaks: [{ start: String, end: String, label: String }]
    },
    thursday: { 
      available: { type: Boolean, default: false },
      slots: [{ start: String, end: String }],
      breaks: [{ start: String, end: String, label: String }]
    },
    friday: { 
      available: { type: Boolean, default: false },
      slots: [{ start: String, end: String }],
      breaks: [{ start: String, end: String, label: String }]
    },
    saturday: { 
      available: { type: Boolean, default: false },
      slots: [{ start: String, end: String }],
      breaks: [{ start: String, end: String, label: String }]
    },
    sunday: { 
      available: { type: Boolean, default: false },
      slots: [{ start: String, end: String }],
      breaks: [{ start: String, end: String, label: String }]
    }
  },

  // Appointment Settings
  timeSlotDuration: { type: Number, default: 30 }, // minutes
  breakBetweenSlots: { type: Number, default: 10 }, // minutes
  maxAdvanceBookingDays: { type: Number, default: 30 }, // days

  // Ratings & Reviews
  ratings: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
    breakdown: {
      five: { type: Number, default: 0 },
      four: { type: Number, default: 0 },
      three: { type: Number, default: 0 },
      two: { type: Number, default: 0 },
      one: { type: Number, default: 0 }
    }
  },

  // Financial Information
  earnings: {
    totalEarnings: { type: Number, default: 0 },
    thisMonth: { type: Number, default: 0 },
    lastMonth: { type: Number, default: 0 },
    platformFeePercentage: { type: Number, default: 10 }
  },

  // Status & Verification
  status: {
    type: String,
    enum: ['pending', 'verified', 'suspended', 'inactive'],
    default: 'pending'
  },

  isAvailable: { type: Boolean, default: true },
  isAcceptingAppointments: { type: Boolean, default: true },
  lastActiveAt: { type: Date, default: Date.now },

  // Statistics
  stats: {
    totalConsultations: { type: Number, default: 0 },
    completedConsultations: { type: Number, default: 0 },
    cancelledConsultations: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    responseTime: { type: Number, default: 0 }, // average in minutes
    patientsSeen: { type: Number, default: 0 }
  },

  // Notification Preferences
  notifications: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    appointmentReminders: { type: Boolean, default: true },
    newBookings: { type: Boolean, default: true },
    payments: { type: Boolean, default: true }
  },

  // Search Cache for optimized queries
  searchCache: {
    specializations: [String],
    qualificationDegrees: [String],
    qualificationInstitutions: [String],
    consultationModes: [String],
    lastUpdated: { type: Date, default: Date.now }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
doctorSchema.index({ 'user': 1 });
doctorSchema.index({ 'specializations': 1 });
doctorSchema.index({ 'status': 1 });
doctorSchema.index({ 'isAvailable': 1 });
doctorSchema.index({ 'ratings.average': -1 });
doctorSchema.index({ 'medicalLicense.licenseNumber': 1 });

// Virtual for full profile
doctorSchema.virtual('isFullySetup').get(function () {
  return this.medicalLicense.isVerified &&
    this.specializations.length > 0 &&
    this.qualifications.length > 0 &&
    this.bio &&
    Object.values(this.consultationModes).some(mode => mode.available);
});

// Method to check if doctor is available for consultation
doctorSchema.methods.isAvailableForConsultation = function (mode) {
  return this.isAvailable &&
    this.status === 'verified' &&
    this.consultationModes[mode]?.available;
};

// Method to calculate next available slot
doctorSchema.methods.getNextAvailableSlot = function (mode) {
  // Implementation for calculating next available slot
  // This would involve checking existing appointments and working hours
  return null; // Placeholder
};

// Pre-save middleware
doctorSchema.pre('save', function (next) {
  // Update average rating
  if (this.ratings.totalReviews > 0) {
    const total = (this.ratings.breakdown.five * 5) +
      (this.ratings.breakdown.four * 4) +
      (this.ratings.breakdown.three * 3) +
      (this.ratings.breakdown.two * 2) +
      (this.ratings.breakdown.one * 1);
    this.ratings.average = total / this.ratings.totalReviews;
  }

  this.lastActiveAt = new Date();
  next();
});

export const Doctor = mongoose.model('Doctor', doctorSchema);
export default Doctor;
