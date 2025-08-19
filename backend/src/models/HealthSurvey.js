import mongoose from 'mongoose';

const healthSurveySchema = new mongoose.Schema({
  // User reference
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Appointment reference (if survey is for specific appointment)
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  
  // Basic demographic information
  demographics: {
    age: {
      type: Number,
      required: true,
      min: 0,
      max: 150
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer-not-to-say'],
      required: true
    },
    occupation: {
      type: String,
      trim: true
    },
    maritalStatus: {
      type: String,
      enum: ['single', 'married', 'divorced', 'widowed', 'prefer-not-to-say']
    }
  },
  
  // Physical measurements
  vitals: {
    height: {
      type: Number, // in cm
      min: 30,
      max: 300
    },
    weight: {
      type: Number, // in kg
      min: 1,
      max: 500
    },
    bmi: {
      type: Number,
      min: 10,
      max: 100
    },
    bloodPressure: {
      systolic: {
        type: Number,
        min: 50,
        max: 300
      },
      diastolic: {
        type: Number,
        min: 30,
        max: 200
      },
      measuredAt: Date
    },
    heartRate: {
      type: Number,
      min: 30,
      max: 250
    },
    temperature: {
      type: Number, // in Celsius
      min: 30,
      max: 50
    },
    oxygenSaturation: {
      type: Number,
      min: 70,
      max: 100
    }
  },
  
  // Medical history
  medicalHistory: {
    chronicConditions: [{
      condition: String,
      diagnosedDate: Date,
      severity: {
        type: String,
        enum: ['mild', 'moderate', 'severe']
      },
      isActive: {
        type: Boolean,
        default: true
      }
    }],
    surgeries: [{
      procedure: String,
      date: Date,
      hospital: String,
      complications: String
    }],
    hospitalizations: [{
      reason: String,
      admissionDate: Date,
      dischargeDate: Date,
      hospital: String
    }],
    allergies: [{
      allergen: String,
      reaction: String,
      severity: {
        type: String,
        enum: ['mild', 'moderate', 'severe', 'life-threatening']
      }
    }],
    immunizations: [{
      vaccine: String,
      date: Date,
      nextDue: Date
    }]
  },
  
  // Current medications
  currentMedications: [{
    name: {
      type: String,
      required: true
    },
    dosage: String,
    frequency: String,
    prescribedBy: String,
    startDate: Date,
    purpose: String,
    sideEffects: [String]
  }],
  
  // Lifestyle factors
  lifestyle: {
    smokingStatus: {
      type: String,
      enum: ['never', 'former', 'current', 'occasional'],
      required: true
    },
    smokingDetails: {
      cigarettesPerDay: Number,
      yearsSmoked: Number,
      quitDate: Date
    },
    alcoholConsumption: {
      type: String,
      enum: ['none', 'occasional', 'moderate', 'heavy'],
      required: true
    },
    alcoholDetails: {
      drinksPerWeek: Number,
      type: [String] // wine, beer, spirits
    },
    exerciseFrequency: {
      type: String,
      enum: ['none', 'rarely', 'weekly', 'daily'],
      required: true
    },
    exerciseDetails: {
      type: [String], // running, swimming, gym, yoga
      hoursPerWeek: Number
    },
    diet: {
      type: String,
      enum: ['omnivore', 'vegetarian', 'vegan', 'pescatarian', 'other']
    },
    sleepPattern: {
      averageHours: {
        type: Number,
        min: 0,
        max: 24
      },
      sleepQuality: {
        type: String,
        enum: ['poor', 'fair', 'good', 'excellent']
      },
      sleepIssues: [String]
    }
  },
  
  // Family medical history
  familyHistory: [{
    relationship: {
      type: String,
      enum: ['mother', 'father', 'sibling', 'grandparent', 'child', 'other']
    },
    conditions: [String],
    ageAtDiagnosis: Number,
    isDeceased: Boolean,
    causeOfDeath: String
  }],
  
  // Mental health screening
  mentalHealth: {
    stressLevel: {
      type: Number,
      min: 1,
      max: 10
    },
    anxietyLevel: {
      type: Number,
      min: 1,
      max: 10
    },
    depressionScreening: {
      score: Number,
      assessment: String
    },
    mentalHealthHistory: [{
      condition: String,
      treatment: String,
      currentlyTreated: Boolean
    }]
  },
  
  // Current symptoms
  symptoms: [{
    symptom: {
      type: String,
      required: true
    },
    severity: {
      type: String,
      enum: ['mild', 'moderate', 'severe'],
      required: true
    },
    duration: String,
    frequency: String,
    triggers: [String],
    relievingFactors: [String],
    additionalNotes: String
  }],
  
  // Review of systems
  reviewOfSystems: {
    constitutional: {
      fever: Boolean,
      weightLoss: Boolean,
      weightGain: Boolean,
      fatigue: Boolean,
      nightSweats: Boolean
    },
    cardiovascular: {
      chestPain: Boolean,
      shortnessBreadth: Boolean,
      palpitations: Boolean,
      swelling: Boolean
    },
    respiratory: {
      cough: Boolean,
      sputum: Boolean,
      wheezing: Boolean,
      shortnessBreath: Boolean
    },
    gastrointestinal: {
      nausea: Boolean,
      vomiting: Boolean,
      diarrhea: Boolean,
      constipation: Boolean,
      abdominalPain: Boolean
    },
    neurological: {
      headache: Boolean,
      dizziness: Boolean,
      seizures: Boolean,
      weakness: Boolean,
      numbness: Boolean
    }
  },
  
  // Emergency contacts
  emergencyContacts: [{
    name: {
      type: String,
      required: true
    },
    relationship: String,
    phone: {
      type: String,
      required: true
    },
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  
  // Survey metadata
  completionStatus: {
    type: String,
    enum: ['draft', 'completed', 'reviewed'],
    default: 'draft'
  },
  completedAt: Date,
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,
  version: {
    type: Number,
    default: 1
  },
  notes: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
healthSurveySchema.index({ user: 1, createdAt: -1 });
healthSurveySchema.index({ appointment: 1 });
healthSurveySchema.index({ completionStatus: 1 });

// Virtual for BMI calculation
healthSurveySchema.virtual('calculatedBMI').get(function() {
  if (this.vitals.height && this.vitals.weight) {
    const heightInMeters = this.vitals.height / 100;
    return Math.round((this.vitals.weight / (heightInMeters * heightInMeters)) * 10) / 10;
  }
  return null;
});

// Virtual for BMI category
healthSurveySchema.virtual('bmiCategory').get(function() {
  const bmi = this.calculatedBMI;
  if (!bmi) return null;
  
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal weight';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
});

// Pre-save middleware
healthSurveySchema.pre('save', function(next) {
  // Auto-calculate BMI if height and weight are provided
  if (this.vitals.height && this.vitals.weight) {
    this.vitals.bmi = this.calculatedBMI;
  }
  
  // Set completion date if status is completed
  if (this.completionStatus === 'completed' && !this.completedAt) {
    this.completedAt = new Date();
  }
  
  next();
});

// Static methods
healthSurveySchema.statics.findLatestByUser = function(userId) {
  return this.findOne({ user: userId, completionStatus: 'completed' })
             .sort({ createdAt: -1 });
};

healthSurveySchema.statics.findByAppointment = function(appointmentId) {
  return this.findOne({ appointment: appointmentId });
};

// Instance methods
healthSurveySchema.methods.getHealthScore = function() {
  let score = 100;
  
  // Deduct points for risk factors
  if (this.lifestyle.smokingStatus === 'current') score -= 20;
  if (this.lifestyle.alcoholConsumption === 'heavy') score -= 15;
  if (this.lifestyle.exerciseFrequency === 'none') score -= 10;
  
  // Deduct for chronic conditions
  if (this.medicalHistory.chronicConditions.length > 0) {
    score -= this.medicalHistory.chronicConditions.length * 5;
  }
  
  // BMI considerations
  const bmi = this.calculatedBMI;
  if (bmi && (bmi < 18.5 || bmi > 30)) score -= 10;
  
  return Math.max(score, 0);
};

healthSurveySchema.methods.getRiskFactors = function() {
  const risks = [];
  
  if (this.lifestyle.smokingStatus === 'current') {
    risks.push('Current smoker');
  }
  
  if (this.lifestyle.alcoholConsumption === 'heavy') {
    risks.push('Heavy alcohol consumption');
  }
  
  if (this.lifestyle.exerciseFrequency === 'none') {
    risks.push('Sedentary lifestyle');
  }
  
  const bmi = this.calculatedBMI;
  if (bmi && bmi > 30) {
    risks.push('Obesity');
  }
  
  if (this.medicalHistory.chronicConditions.length > 2) {
    risks.push('Multiple chronic conditions');
  }
  
  return risks;
};

const HealthSurvey = mongoose.model('HealthSurvey', healthSurveySchema);

export default HealthSurvey;
