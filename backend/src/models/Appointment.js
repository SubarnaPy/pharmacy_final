import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
  // Patient making the appointment
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Doctor providing the consultation
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Appointment scheduling
  appointmentDate: {
    type: Date,
    required: true,
    index: true
  },
  startTime: {
    type: Date,
    required: true,
  },
  endTime: {
    type: Date,
    required: true,
  },
  duration: {
    type: Number, // in minutes
    default: 30
  },
  
  // Consultation details
  consultationType: {
    type: String,
    enum: ['chat', 'phone', 'email', 'video'],
    required: true,
    default: 'video'
  },
  consultationMode: {
    type: String,
    enum: ['instant', 'scheduled'],
    default: 'scheduled'
  },
  
  // Appointment status
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show', 'rescheduled'],
    default: 'pending',
    index: true
  },
  
  // Medical information
  symptoms: [{
    type: String,
    trim: true
  }],
  reason: {
    type: String,
    required: true,
    trim: true
  },
  medicalHistory: {
    type: String,
    trim: true
  },
  currentMedications: [{
    name: String,
    dosage: String,
    frequency: String
  }],
  
  // Health survey responses
  healthSurvey: {
    age: Number,
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer-not-to-say']
    },
    height: Number, // in cm
    weight: Number, // in kg
    bloodPressure: {
      systolic: Number,
      diastolic: Number
    },
    allergies: [String],
    chronicConditions: [String],
    smokingStatus: {
      type: String,
      enum: ['never', 'former', 'current', 'occasional']
    },
    alcoholConsumption: {
      type: String,
      enum: ['none', 'occasional', 'moderate', 'heavy']
    },
    exerciseFrequency: {
      type: String,
      enum: ['none', 'rarely', 'weekly', 'daily']
    }
  },
  
  // Payment information
  payment: {
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'INR'
    },
    method: {
      type: String,
      enum: ['card', 'upi', 'netbanking', 'wallet', 'cash'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    transactionId: String,
    paymentGatewayResponse: mongoose.Schema.Types.Mixed,
    paidAt: Date,
    refundedAt: Date,
    refundAmount: Number
  },
  
  // Meeting/Communication details
  meetingDetails: {
    meetingId: String,
    joinUrl: String,
    password: String,
    roomId: String,
    phoneNumber: String,
    emailThread: String
  },
  
  // Consultation outcome
  consultation: {
    startedAt: Date,
    endedAt: Date,
    actualDuration: Number, // in minutes
    diagnosis: [{
      condition: String,
      severity: {
        type: String,
        enum: ['mild', 'moderate', 'severe']
      },
      icd10Code: String
    }],
    treatment: [{
      type: String,
      description: String,
      duration: String
    }],
    prescriptions: [{
      medication: String,
      dosage: String,
      frequency: String,
      duration: String,
      instructions: String
    }],
    recommendations: [String],
    followUpRequired: {
      type: Boolean,
      default: false
    },
    followUpDate: Date,
    doctorNotes: String
  },
  
  // File attachments
  attachments: [{
    fileName: String,
    fileUrl: String,
    fileType: String,
    uploadedBy: {
      type: String,
      enum: ['patient', 'doctor']
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Medical records generated
  medicalRecords: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MedicalRecord'
  }],
  
  // Feedback and rating
  feedback: {
    patientRating: {
      type: Number,
      min: 1,
      max: 5
    },
    patientReview: String,
    patientFeedbackDate: Date,
    doctorRating: {
      type: Number,
      min: 1,
      max: 5
    },
    doctorReview: String,
    doctorFeedbackDate: Date
  },
  
  // Cancellation details
  cancellation: {
    cancelledBy: {
      type: String,
      enum: ['patient', 'doctor', 'system']
    },
    cancelledAt: Date,
    reason: String,
    refundEligible: {
      type: Boolean,
      default: false
    }
  },
  
  // Rescheduling details
  rescheduling: {
    rescheduledBy: {
      type: String,
      enum: ['patient', 'doctor']
    },
    rescheduledAt: Date,
    originalDate: Date,
    reason: String,
    reschedulingCount: {
      type: Number,
      default: 0
    }
  },
  
  // System fields
  isUrgent: {
    type: Boolean,
    default: false
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  source: {
    type: String,
    enum: ['web', 'mobile', 'api'],
    default: 'web'
  },
  
  // Communication logs
  communications: [{
    type: {
      type: String,
      enum: ['message', 'call', 'email', 'notification']
    },
    from: String,
    to: String,
    content: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    read: {
      type: Boolean,
      default: false
    }
  }]
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
appointmentSchema.index({ patient: 1, appointmentDate: -1 });
appointmentSchema.index({ doctor: 1, appointmentDate: -1 });
appointmentSchema.index({ status: 1, appointmentDate: -1 });
appointmentSchema.index({ consultationType: 1, status: 1 });
appointmentSchema.index({ 'payment.status': 1 });
appointmentSchema.index({ isUrgent: 1, priority: -1 });

// Virtual for appointment duration in hours
appointmentSchema.virtual('durationInHours').get(function() {
  return this.duration / 60;
});

// Virtual for total cost including taxes
appointmentSchema.virtual('totalCost').get(function() {
  const tax = this.payment.amount * 0.18; // 18% GST
  return this.payment.amount + tax;
});

// Pre-save middleware
appointmentSchema.pre('save', function(next) {
  // Set end time based on start time and duration
  if (this.startTime && this.duration) {
    this.endTime = new Date(this.startTime.getTime() + (this.duration * 60000));
  }
  
  // Set appointment date from start time
  if (this.startTime) {
    this.appointmentDate = new Date(this.startTime.getFullYear(), 
                                   this.startTime.getMonth(), 
                                   this.startTime.getDate());
  }
  
  next();
});

// Static methods
appointmentSchema.statics.findUpcoming = function(doctorId, limit = 10) {
  return this.find({
    doctor: doctorId,
    status: { $in: ['confirmed', 'pending'] },
    startTime: { $gte: new Date() }
  })
  .populate('patient', 'name email phone')
  .sort({ startTime: 1 })
  .limit(limit);
};

appointmentSchema.statics.findByDateRange = function(doctorId, startDate, endDate) {
  return this.find({
    doctor: doctorId,
    appointmentDate: {
      $gte: startDate,
      $lte: endDate
    }
  })
  .populate('patient', 'name email phone')
  .sort({ startTime: 1 });
};

// Instance methods
appointmentSchema.methods.canBeCancelled = function() {
  const now = new Date();
  const appointmentTime = new Date(this.startTime);
  const timeDiff = appointmentTime - now;
  const hoursDiff = timeDiff / (1000 * 60 * 60);
  
  return hoursDiff >= 2 && ['pending', 'confirmed'].includes(this.status);
};

appointmentSchema.methods.canBeRescheduled = function() {
  return this.rescheduling.reschedulingCount < 2 && 
         ['pending', 'confirmed'].includes(this.status);
};

const Appointment = mongoose.model('Appointment', appointmentSchema);

export default Appointment;
