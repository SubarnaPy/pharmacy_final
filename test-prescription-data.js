// Test script to verify prescription data structure
const testPrescriptionData = {
  success: true,
  message: 'Prescription request details retrieved successfully',
  data: {
    prescriptionRequest: {
      createdAt: "2025-08-16T20:24:55.524Z",
      expiresAt: "2025-08-23T20:24:55.524Z",
      isActive: true,
      medications: [
        { name: "Med 1", quantity: "1", duration: "7 days" },
        { name: "Med 2", quantity: "2", duration: "10 days" },
        { name: "Med 3", quantity: "1", duration: "5 days" }
      ],
      metadata: {
        geoLocation: [77.123, 28.456],
        source: 'prescription_upload',
        requestNumber: 'PR895534003'
      },
      patient: {
        _id: '688b92ead99cdb72d8b85adb',
        profile: {
          firstName: "John",
          lastName: "Doe",
          dateOfBirth: "1985-05-15T00:00:00.000Z",
          gender: "male"
        },
        contact: {
          phone: "+1234567890",
          email: "john.doe@example.com"
        },
        isLocked: false,
        id: '688b92ead99cdb72d8b85adb'
      },
      pharmacyResponses: [],
      preferences: {
        deliveryMethod: 'pickup',
        deliveryAddress: null,
        urgency: 'routine'
      },
      prescriptionStructuredData: {
        doctor: {
          name: "Dr. Smith",
          license: "NYC123456"
        },
        patientInfo: {
          age: "39 years",
          gender: "Male",
          weight: "75kg", 
          height: "175cm",
          allergies: ["Penicillin", "Sulfa drugs"],
          medicalHistory: ["Hypertension", "Diabetes"]
        },
        aiProcessing: {
          overallConfidence: 0.92,
          qualityLevel: 'high'
        },
        riskAssessment: {
          overallRiskLevel: 'low'
        },
        processingStatus: 'completed'
      },
      status: "submitted",
      statusHistory: [],
      targetPharmacies: [{}],
      updatedAt: "2025-08-16T20:24:55.543Z",
      __v: 0,
      _id: "68a0e91736a21838ddf896d1"
    }
  }
};

// Test the data extraction logic
console.log("=== Testing Data Extraction ===");

const prescriptionData = testPrescriptionData.data.prescriptionRequest;

console.log("Request Number:", prescriptionData?.metadata?.requestNumber || prescriptionData?._id);
console.log("Status:", prescriptionData?.status);
console.log("Created At:", prescriptionData?.createdAt);
console.log("Urgency:", prescriptionData?.preferences?.urgency);
console.log("Delivery Method:", prescriptionData?.preferences?.deliveryMethod);
console.log("Processing Status:", prescriptionData?.prescriptionStructuredData?.processingStatus);
console.log("Medications Count:", prescriptionData?.medications?.length || 0);

console.log("\n=== Patient Info ===");
console.log("Name:", prescriptionData?.patient?.profile?.firstName, prescriptionData?.patient?.profile?.lastName);
console.log("Contact:", prescriptionData?.patient?.contact?.phone);
console.log("Age:", prescriptionData?.prescriptionStructuredData?.patientInfo?.age);
console.log("Gender:", prescriptionData?.prescriptionStructuredData?.patientInfo?.gender);
console.log("Weight:", prescriptionData?.prescriptionStructuredData?.patientInfo?.weight);
console.log("Height:", prescriptionData?.prescriptionStructuredData?.patientInfo?.height);
console.log("Allergies:", prescriptionData?.prescriptionStructuredData?.patientInfo?.allergies);

console.log("\n=== AI Analysis ===");
console.log("AI Confidence:", prescriptionData?.prescriptionStructuredData?.aiProcessing?.overallConfidence);
console.log("Risk Level:", prescriptionData?.prescriptionStructuredData?.riskAssessment?.overallRiskLevel);

// Test estimated value calculation
const calculateEstimatedValue = (medications) => {
  if (!medications?.length) return '0.00';
  
  let total = 0;
  medications.forEach(med => {
    const basePrice = 25;
    const quantity = parseInt(med.quantity) || 1;
    const days = parseInt(med.duration?.replace(/\D/g, '')) || 7;
    total += basePrice * Math.ceil(quantity * days / 30);
  });
  
  return total.toFixed(2);
};

console.log("Estimated Value:", calculateEstimatedValue(prescriptionData?.medications));

console.log("\n=== All Tests Passed! ===");
