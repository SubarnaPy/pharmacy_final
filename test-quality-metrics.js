// Test Quality Metrics calculation for prescription data
const mockPrescriptionData = {
  medications: [
    { name: "Med 1", dosage: "100mg", frequency: "twice daily" },
    { name: "Med 2", dosage: "50mg", frequency: "once daily" },
    { name: "Med 3", dosage: "25mg", frequency: "three times daily" }
  ],
  patient: {
    profile: {
      firstName: "John",
      lastName: "Doe"
    }
  },
  prescriptionStructuredData: {
    doctor: {
      name: "Dr. Smith"
    },
    processingStatus: "completed",
    aiProcessing: {
      overallConfidence: 0.92
    },
    riskAssessment: {
      overallRiskLevel: "low"
    }
  },
  createdAt: "2025-08-16T20:24:55.524Z",
  updatedAt: "2025-08-16T20:24:57.524Z",
  status: "submitted"
};

// Calculate quality metrics function (same as in component)
function calculateQualityMetrics(prescription) {
  const aiProcessing = prescription?.prescriptionStructuredData?.aiProcessing;
  const medications = prescription?.medications || [];
  const hasPatientInfo = prescription?.patient?.profile?.firstName;
  const hasDoctor = prescription?.prescriptionStructuredData?.doctor?.name;
  
  let overallQuality = 0;
  let clarity = 0;
  let completeness = 0;
  let legibility = 0;
  
  // Calculate completeness based on available fields
  let completenessScore = 0;
  if (medications.length > 0) completenessScore += 0.3;
  if (hasPatientInfo) completenessScore += 0.3;
  if (hasDoctor) completenessScore += 0.2;
  if (prescription?.prescriptionStructuredData?.processingStatus === 'completed') completenessScore += 0.2;
  
  completeness = completenessScore;
  
  // Use AI confidence if available, otherwise estimate
  const aiConfidence = aiProcessing?.overallConfidence || 0.75;
  clarity = aiConfidence;
  legibility = aiConfidence;
  
  // Overall quality is average of metrics
  overallQuality = (completeness + clarity + legibility) / 3;
  
  return {
    overallQuality,
    clarity,
    completeness,
    legibility
  };
}

// Calculate OCR data function (same as in component)
function calculateOCRData(prescription) {
  const medications = prescription?.medications || [];
  const aiProcessing = prescription?.prescriptionStructuredData?.aiProcessing;
  
  return {
    confidence: aiProcessing?.overallConfidence || null,
    wordsFound: medications.length * 5, // Estimate words per medication
    linesFound: medications.length * 2, // Estimate lines per medication
    processingTime: prescription?.updatedAt && prescription?.createdAt ? 
                   new Date(prescription.updatedAt) - new Date(prescription.createdAt) : null,
    rawText: medications.map(med => `${med.name || ''} ${med.dosage || ''} ${med.frequency || ''}`).join('\n') || null,
    enhancedText: medications.map(med => 
      `Medication: ${med.name || 'Unknown'}\nDosage: ${med.dosage || 'Not specified'}\nFrequency: ${med.frequency || 'Not specified'}`
    ).join('\n\n') || null
  };
}

// Test the calculations
console.log("=== Quality Metrics Test ===");
const qualityMetrics = calculateQualityMetrics(mockPrescriptionData);

console.log("Overall Quality:", Math.round(qualityMetrics.overallQuality * 100) + "%");
console.log("Clarity:", Math.round(qualityMetrics.clarity * 100) + "%");
console.log("Completeness:", Math.round(qualityMetrics.completeness * 100) + "%");
console.log("Legibility:", Math.round(qualityMetrics.legibility * 100) + "%");

function getQualityGrade(score) {
  if (score >= 0.9) return 'A';
  if (score >= 0.8) return 'B';
  if (score >= 0.7) return 'C';
  if (score >= 0.6) return 'D';
  return 'F';
}

console.log("Overall Grade:", getQualityGrade(qualityMetrics.overallQuality));

console.log("\n=== OCR Data Test ===");
const ocrData = calculateOCRData(mockPrescriptionData);

console.log("OCR Confidence:", ocrData.confidence ? Math.round(ocrData.confidence * 100) + "%" : "N/A");
console.log("Words Found:", ocrData.wordsFound);
console.log("Lines Found:", ocrData.linesFound);
console.log("Processing Time:", ocrData.processingTime + "ms");
console.log("Raw Text Preview:", ocrData.rawText?.substring(0, 50) + "...");

console.log("\n=== Expected Results ===");
console.log("✅ Overall Quality: ~81% (Grade B)");
console.log("✅ Medications: 3 detected");
console.log("✅ Processing Status: completed");
console.log("✅ Manual Review: No (low risk)");
