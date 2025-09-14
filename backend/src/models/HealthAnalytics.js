import mongoose from 'mongoose';

const healthInsightSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['risk_prediction', 'adherence_insight', 'health_trend', 'preventive_care'],
    required: true
  },
  severity: {
    type: String,
    enum: ['low', 'moderate', 'high', 'critical'],
    default: 'low'
  },
  prediction: {
    type: String,
    required: true
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    required: true
  },
  recommendedActions: [{
    action: String,
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent']
    },
    timeframe: String
  }],
  dataPoints: [{
    source: String,
    value: mongoose.Schema.Types.Mixed,
    timestamp: Date
  }]
});

const medicationAdherenceSchema = new mongoose.Schema({
  medication: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prescription',
    required: true
  },
  adherenceScore: {
    type: Number,
    min: 0,
    max: 100,
    required: true
  },
  missedDoses: {
    type: Number,
    default: 0
  },
  totalPrescribedDoses: {
    type: Number,
    required: true
  },
  adherencePattern: [{
    date: Date,
    taken: Boolean,
    timeOfDay: String,
    notes: String
  }],
  predictedAdherence: {
    nextWeek: Number,
    nextMonth: Number,
    factors: [String]
  }
});

const healthRiskSchema = new mongoose.Schema({
  riskCategory: {
    type: String,
    enum: ['cardiovascular', 'diabetes', 'hypertension', 'mental_health', 'drug_interaction', 'side_effects'],
    required: true
  },
  riskLevel: {
    type: String,
    enum: ['very_low', 'low', 'moderate', 'high', 'very_high'],
    required: true
  },
  riskScore: {
    type: Number,
    min: 0,
    max: 100,
    required: true
  },
  contributingFactors: [{
    factor: String,
    weight: Number,
    description: String
  }],
  mitigationStrategies: [String],
  monitoringParameters: [{
    parameter: String,
    currentValue: String,
    targetValue: String,
    frequency: String
  }]
});

const healthAnalyticsSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Health Insights
  healthInsights: [healthInsightSchema],
  
  // Medication Adherence Analytics
  medicationAdherence: [medicationAdherenceSchema],
  
  // Health Risk Stratification
  healthRisks: [healthRiskSchema],
  
  // Predictive Models Data
  predictiveModels: {
    adherencePrediction: {
      modelVersion: String,
      lastTraining: Date,
      accuracy: Number,
      features: [String]
    },
    riskPrediction: {
      modelVersion: String,
      lastTraining: Date,
      accuracy: Number,
      features: [String]
    }
  },
  
  // Aggregated Analytics
  overallHealthScore: {
    type: Number,
    min: 0,
    max: 100
  },
  
  trendsAnalysis: {
    improvingMetrics: [String],
    decliningMetrics: [String],
    stableMetrics: [String]
  },
  
  // AI Processing Status
  lastAnalysisDate: {
    type: Date,
    default: Date.now
  },
  
  nextAnalysisDate: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
  },
  
  aiProcessingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  
  // Data Sources
  dataSources: {
    prescriptions: Boolean,
    vitalSigns: Boolean,
    labResults: Boolean,
    userReports: Boolean,
    wearableDevices: Boolean,
    mentalHealthAssessments: Boolean
  }
}, {
  timestamps: true
});

// Indexes for performance
healthAnalyticsSchema.index({ patient: 1, lastAnalysisDate: -1 });
healthAnalyticsSchema.index({ 'healthRisks.riskLevel': 1 });
healthAnalyticsSchema.index({ 'medicationAdherence.adherenceScore': 1 });
healthAnalyticsSchema.index({ overallHealthScore: 1 });

// Virtual for latest high-risk alerts
healthAnalyticsSchema.virtual('criticalAlerts').get(function() {
  return this.healthRisks.filter(risk => risk.riskLevel === 'high' || risk.riskLevel === 'very_high');
});

// Virtual for medication adherence summary
healthAnalyticsSchema.virtual('adherenceSummary').get(function() {
  if (!this.medicationAdherence.length) return null;
  
  const totalScore = this.medicationAdherence.reduce((sum, med) => sum + med.adherenceScore, 0);
  const averageScore = totalScore / this.medicationAdherence.length;
  
  return {
    averageAdherence: Math.round(averageScore),
    totalMedications: this.medicationAdherence.length,
    poorAdherence: this.medicationAdherence.filter(med => med.adherenceScore < 70).length
  };
});

// Static method to get patients needing immediate attention
healthAnalyticsSchema.statics.getPatientsNeedingAttention = function() {
  return this.find({
    $or: [
      { 'healthRisks.riskLevel': { $in: ['high', 'very_high'] } },
      { 'medicationAdherence.adherenceScore': { $lt: 70 } },
      { overallHealthScore: { $lt: 60 } }
    ]
  }).populate('patient', 'name email phone');
};

// Method to calculate overall health score
healthAnalyticsSchema.methods.calculateOverallHealthScore = function() {
  let score = 100;
  
  // Reduce score based on health risks
  this.healthRisks.forEach(risk => {
    switch(risk.riskLevel) {
      case 'very_high': score -= 20; break;
      case 'high': score -= 15; break;
      case 'moderate': score -= 10; break;
      case 'low': score -= 5; break;
    }
  });
  
  // Reduce score based on medication adherence
  if (this.medicationAdherence.length > 0) {
    const avgAdherence = this.medicationAdherence.reduce((sum, med) => sum + med.adherenceScore, 0) / this.medicationAdherence.length;
    const adherencePenalty = (100 - avgAdherence) * 0.3;
    score -= adherencePenalty;
  }
  
  this.overallHealthScore = Math.max(0, Math.min(100, Math.round(score)));
  return this.overallHealthScore;
};

// Pre-save middleware to calculate scores
healthAnalyticsSchema.pre('save', function(next) {
  this.calculateOverallHealthScore();
  next();
});

const HealthAnalytics = mongoose.model('HealthAnalytics', healthAnalyticsSchema);

export default HealthAnalytics;