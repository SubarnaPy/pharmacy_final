
import mongoose from 'mongoose';
const { Schema } = mongoose;

const medicationSchema = new Schema({
  name: { type: String, required: true },
  quantity: { type: Schema.Types.Mixed }, // Allow both Number and Object
  dosage: { type: Schema.Types.Mixed }, // Allow both String and Object
  unit: String,
  prescribed: Number,
  instructions: String,
  form: String,
  frequency: String,
  duration: String
});

const pharmacyResponseSchema = new Schema({
  pharmacyId: { type: Schema.Types.ObjectId, ref: 'Pharmacy', required: true },
  status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
  quotedPrice: { type: Schema.Types.Mixed }, // Allow both Number and Object
  estimatedFulfillmentTime: Number,
  notes: String,
  detailedBill: { type: Schema.Types.Mixed },
  pharmacyMessage: { type: Schema.Types.Mixed }, // Allow both String and Object
  pharmacyInfo: {
    specialInstructions: String,
    pickupInstructions: String,
    deliveryInstructions: String,
    consultationAvailable: { type: Boolean, default: false },
    consultationFee: { type: Number, default: 0 },
    pharmacistName: String,
    contactNumber: String
  },
  pharmacistNotes: String,
  substitutions: [{ type: Schema.Types.Mixed }],
  expiresAt: Date
}, { _id: true, timestamps: true });

const targetPharmacySchema = new Schema({
  pharmacyId: { type: Schema.Types.ObjectId, ref: 'Pharmacy', required: true },
  notifiedAt: { type: Date, default: Date.now },
  priority: { type: Number, default: 1 },
  matchScore: { type: Number, default: 0 }
}, { _id: false });

const prescriptionRequestSchema = new Schema({
  patient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  medications: [medicationSchema],
  status: { type: String, enum: ['draft', 'pending', 'submitted', 'accepted', 'fulfilled', 'cancelled'], default: 'draft' },
  pharmacyResponses: [pharmacyResponseSchema],
  targetPharmacies: [targetPharmacySchema],
  selectedPharmacy: { type: Schema.Types.ObjectId, ref: 'Pharmacy' },
  statusHistory: [{
    status: String,
    changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reason: String,
    notes: String,
    timestamp: { type: Date, default: Date.now }
  }],
  isActive: { type: Boolean, default: true },
  preferences: {
    deliveryMethod: { type: String, enum: ['pickup', 'delivery', 'either'], default: 'pickup' },
    deliveryAddress: { type: Schema.Types.Mixed }
  },
  
  // Prescription image and structured data
  prescriptionImage: { type: String }, // Cloudinary URL or local path
  cloudinaryId: { type: String }, // Cloudinary public ID for management
  originalFilename: { type: String }, // Original uploaded filename
  fileType: { type: String }, // MIME type
  fileSize: { type: Number }, // File size in bytes
  
  // Structured prescription data from Gemini AI
  prescriptionStructuredData: {
    // Doctor information (enhanced)
    doctor: {
      name: { type: String },
      title: { type: String },
      qualifications: [{ type: String }],
      registrationNumber: { type: String },
      license: { type: String },
      contact: { type: String },
      email: { type: String },
      hospital: { type: String },
      address: { type: String },
      signature: { type: Boolean },
      signatureImage: { type: String }
    },
    
    // Patient information (enhanced)
    patientInfo: {
      name: { type: String },
      age: { type: String },
      gender: { type: String },
      weight: { type: String },
      height: { type: String },
      allergies: [{ type: String }],
      medicalHistory: [{ type: String }],
      currentConditions: [{ type: String }],
      emergencyContact: { type: String },
      insuranceInfo: { type: String }
    },
    
    // Enhanced medication information with complete Gemini data
    medicationsDetailed: [{
      name: { type: String },
      genericName: { type: String },
      brandName: { type: String },
      dosage: { type: String },
      strength: { type: String },
      frequency: { type: String },
      route: { type: String },
      duration: { type: String },
      instructions: { type: String },
      indication: { type: String },
      confidence: { type: Number },
      alternatives: [{ type: String }],
      contraindications: [{ type: String }]
    }],
    
    // AI processing results (enhanced)
    aiProcessing: {
      medicationsFound: { type: Number, default: 0 },
      validMedications: { type: Number, default: 0 },
      unknownMedications: { type: Number, default: 0 },
      hasInteractions: { type: Boolean, default: false },
      hasAnomalies: { type: Boolean, default: false },
      overallConfidence: { type: Number, default: 0 },
      qualityLevel: { type: String, enum: ['low', 'medium', 'high', 'unknown'], default: 'unknown' },
      
      // Complete Gemini results storage
      geminiResults: { type: Schema.Types.Mixed }, // Full Gemini AI analysis
      geminiRawResponse: { type: Schema.Types.Mixed }, // Complete raw response
      processingMethod: { type: String, default: 'gemini_2.5_flash_enhanced' },
      processingSteps: [{ type: String }],
      enhancementApplied: { type: Boolean, default: false },
      
      // Quality metrics from Gemini
      qualityMetrics: {
        clarity: { type: Number, default: 0 },
        completeness: { type: Number, default: 0 },
        legibility: { type: Number, default: 0 },
        overallQuality: { type: Number, default: 0 },
        ambiguousFields: [{ type: String }],
        missingFields: [{ type: String }],
        warningFlags: [{ type: String }]
      }
    },
    
    // Enhanced drug interactions
    drugInteractions: [{
      medications: [{ type: String }],
      severity: { type: String, enum: ['minor', 'moderate', 'major', 'contraindicated'] },
      interactionType: { type: String },
      clinicalEffect: { type: String },
      mechanism: { type: String },
      management: { type: String },
      monitoring: { type: String },
      confidence: { type: Number }
    }],
    
    // Enhanced dosage validations
    dosageValidations: [{
      medication: { type: String },
      prescribedDose: { type: String },
      standardDose: { type: String },
      isAppropriate: { type: Boolean },
      ageAppropriate: { type: Boolean },
      weightAppropriate: { type: Boolean },
      indicationAppropriate: { type: Boolean },
      warnings: [{ type: String }],
      adjustmentNeeded: { type: Boolean },
      adjustmentReason: { type: String },
      confidence: { type: Number }
    }],
    
    // Enhanced risk assessment with complete structure
    riskAssessment: {
      overallRiskLevel: { type: String, enum: ['low', 'moderate', 'high', 'critical', 'unknown'], default: 'moderate' },
      summary: { type: String },
      patientSafetyRisks: [{
        risk: { type: String },
        severity: { type: String },
        details: { type: String },
        mitigation: { type: String }
      }],
      prescriptionQualityRisks: [{
        risk: { type: String },
        severity: { type: String },
        details: { type: String },
        mitigation: { type: String }
      }],
      clinicalRisks: [{
        risk: { type: String },
        severity: { type: String },
        details: { type: String },
        mitigation: { type: String }
      }],
      regulatoryLegalRisks: [{
        risk: { type: String },
        severity: { type: String },
        details: { type: String },
        mitigation: { type: String }
      }],
      riskStratification: { type: String },
      recommendations: {
        immediateSafetyInterventions: [{ type: String }],
        enhancedMonitoringProtocols: [{ type: String }],
        patientCounselingPriorities: [{ type: String }],
        prescriberConsultationsNeeded: [{ type: String }],
        alternativeTherapeuticOptions: [{ type: String }]
      }
    },
    
    // OCR data (enhanced)
    ocrData: {
      engine: { type: String },
      confidence: { type: Number },
      rawText: { type: String },
      enhancedText: { type: String }, // Text after enhancement
      textLength: { type: Number },
      wordsFound: { type: Number },
      linesFound: { type: Number },
      processingTime: { type: Number }
    },
    
    // Processing metadata (enhanced)
    processingId: { type: String },
    processingTime: { type: Number },
    processingStatus: { type: String, enum: ['completed', 'failed', 'pending'], default: 'pending' },
    processingTimestamp: { type: Date, default: Date.now },
    processingVersion: { type: String, default: '1.0' }
  },
  
  metadata: {
    geoLocation: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere'
    },
    requestNumber: { type: String, unique: true },
    source: { type: String, default: 'web' }
  },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }
}, { timestamps: true });

// Generate unique request number
prescriptionRequestSchema.pre('save', async function (next) {
  if (this.isNew && !this.metadata?.requestNumber) {
    const count = await mongoose.model('PrescriptionRequest').countDocuments();
    const requestNumber = `PR${Date.now().toString().slice(-6)}${(count + 1).toString().padStart(3, '0')}`;

    if (!this.metadata) {
      this.metadata = {};
    }
    this.metadata.requestNumber = requestNumber;
  }
  next();
});

// Add status history tracking method
prescriptionRequestSchema.methods.addStatusHistoryEntry = function (status, userId, reason = '', notes = '') {
  if (!this.statusHistory) {
    this.statusHistory = [];
  }

  this.statusHistory.push({
    status,
    changedBy: userId,
    reason,
    notes,
    timestamp: new Date()
  });

  this.status = status;
  return this.save();
};

// Virtual for request number
prescriptionRequestSchema.virtual('requestNumber').get(function () {
  return this.metadata?.requestNumber || `PR${this._id.toString().slice(-6)}`;
});

const PrescriptionRequest = mongoose.model('PrescriptionRequest', prescriptionRequestSchema);
export default PrescriptionRequest;
