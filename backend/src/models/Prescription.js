import mongoose from 'mongoose';

const PrescriptionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  medicine: { type: String, required: true },
  pharmacy: { type: String },
  status: { type: String, enum: ['active', 'pending_refill', 'Ready for pickup', 'Delivered'], default: 'active' },
  date: { type: Date, default: Date.now },
  
  // Enhanced doctor information
  doctor: {
    name: { type: String },
    title: { type: String }, // MBBS, MD, etc.
    registrationNumber: { type: String },
    license: { type: String }, // Alternative to registrationNumber
    contact: { type: String },
    hospital: { type: String }, // Hospital/clinic name
    signature: { type: Boolean } // Whether signature was detected
  },
  
  // Enhanced medication information (array of medications)
  medications: [{
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
    confidence: { type: Number, min: 0, max: 1 }
  }],
  
  // Patient information extracted from prescription
  patientInfo: {
    name: { type: String },
    age: { type: String },
    gender: { type: String },
    weight: { type: String },
    allergies: [{ type: String }],
    medicalHistory: [{ type: String }]
  },
  
  dosage: { type: String }, // Legacy field for backward compatibility
  notes: { type: String },
  
  // File information
  prescriptionImage: { type: String }, // Cloudinary URL or local path
  cloudinaryId: { type: String }, // Cloudinary public ID for management
  originalFilename: { type: String }, // Original uploaded filename
  fileType: { type: String }, // MIME type (image/jpeg, application/pdf, etc.)
  fileSize: { type: Number }, // File size in bytes
  
  // OCR and processing data
  ocrData: {
    engine: { type: String }, // OCR engine used (tesseract, textract, etc.)
    confidence: { type: Number }, // OCR confidence score
    rawText: { type: String }, // Raw extracted text
    textLength: { type: Number }, // Length of extracted text
    wordsFound: { type: Number }, // Number of words detected
    linesFound: { type: Number }, // Number of lines detected
    fields: { type: mongoose.Schema.Types.Mixed } // Parsed fields from OCR
  },
  
  // Enhanced AI processing results
  aiProcessing: {
    medicationsFound: { type: Number, default: 0 },
    validMedications: { type: Number, default: 0 },
    unknownMedications: { type: Number, default: 0 },
    hasInteractions: { type: Boolean, default: false },
    hasAnomalies: { type: Boolean, default: false },
    overallConfidence: { type: Number, default: 0 },
    qualityLevel: { type: String, enum: ['low', 'medium', 'high', 'unknown'], default: 'unknown' },
    
    // Complete Gemini AI response - stores entire structured response
    geminiResults: { type: mongoose.Schema.Types.Mixed }, // Full Gemini AI analysis
    geminiRawResponse: { type: mongoose.Schema.Types.Mixed }, // Complete raw response from Gemini
    
    // Processing metadata
    processingMethod: { type: String, default: 'gemini_2.5_flash_enhanced' },
    processingSteps: [{ type: String }], // Steps taken during processing
    enhancementApplied: { type: Boolean, default: false }, // Whether text enhancement was applied
    
    // Structured extraction results
    extractedStructuredData: {
      // Complete medication analysis
      medications: [{
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
      
      // Complete prescriber information
      prescriberInfo: {
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
      
      // Complete patient information
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
      
      // Quality and validation metrics
      qualityMetrics: {
        clarity: { type: Number },
        completeness: { type: Number },
        legibility: { type: Number },
        overallQuality: { type: Number },
        ambiguousFields: [{ type: String }],
        missingFields: [{ type: String }],
        warningFlags: [{ type: String }]
      }
    },
    
    // Drug interactions from Gemini
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
    
    // Dosage validations from Gemini
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
    
    // Enhanced risk assessment from Gemini
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
    }
  },
  
  // PDF processing information (if applicable)
  pdfInfo: {
    wasPDF: { type: Boolean, default: false },
    pages: { type: Number, default: 0 },
    textExtracted: { type: Boolean, default: false },
    imagesConverted: { type: Number, default: 0 },
    processingMethod: { type: String, enum: ['text_extraction', 'image_ocr', 'unknown'], default: 'unknown' }
  },
  
  // Processing metadata
  processingId: { type: String }, // Unique processing identifier
  processingTime: { type: Number }, // Processing time in milliseconds
  processingStatus: { type: String, enum: ['completed', 'failed', 'pending'], default: 'pending' },
  requiresManualReview: { type: Boolean, default: false },
  businessRulesAction: { type: String, enum: ['approve', 'review', 'reject', 'unknown'], default: 'unknown' },
  
  isRefillable: { type: Boolean, default: false },
  expiresAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Index for efficient querying
PrescriptionSchema.index({ user: 1, createdAt: -1 });
PrescriptionSchema.index({ processingId: 1 });
PrescriptionSchema.index({ cloudinaryId: 1 });
PrescriptionSchema.index({ status: 1 });
PrescriptionSchema.index({ 'pdfInfo.wasPDF': 1 });

export default mongoose.model('Prescription', PrescriptionSchema);
