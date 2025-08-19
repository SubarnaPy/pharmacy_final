import mongoose from 'mongoose';
import PrescriptionRequest from './src/models/PrescriptionRequest.js';
import Pharmacy from './src/models/Pharmacy.js';
import User from './src/models/User.js';
import PrescriptionRequestService from './src/services/PrescriptionRequestService.js';

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/pharmacy_marketplace', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function testPrescriptionPharmacyMatching() {
  try {
    console.log('🧪 Testing Prescription Request Pharmacy Matching...\n');

    // Find a test patient
    const patient = await User.findOne({ role: 'patient' });
    if (!patient) {
      console.log('❌ No patient found. Please create a test patient first.');
      return;
    }

    console.log('👤 Using patient:', {
      id: patient._id,
      email: patient.email
    });

    // Create prescription request service
    const service = new PrescriptionRequestService();

    // Create a test prescription request
    const requestData = {
      medications: [
        {
          name: 'Paracetamol',
          quantity: 20,
          dosage: '500mg',
          unit: 'tablets',
          prescribed: 20,
          instructions: 'Take 1 tablet every 6 hours as needed for pain',
          form: 'tablet',
          frequency: 'every 6 hours',
          duration: '5 days'
        },
        {
          name: 'Amoxicillin',
          quantity: 21,
          dosage: '250mg',
          unit: 'capsules',
          prescribed: 21,
          instructions: 'Take 1 capsule three times daily with food',
          form: 'capsule',
          frequency: 'three times daily',
          duration: '7 days'
        }
      ],
      preferences: {
        deliveryMethod: 'pickup',
        urgency: 'normal'
      },
      geoLocation: [77.5946, 12.9716], // Bangalore coordinates
      metadata: {
        source: 'test'
      }
    };

    console.log('📋 Creating prescription request...');
    const prescriptionRequest = await service.createPrescriptionRequest(requestData, patient._id);

    console.log('✅ Prescription request created:', {
      id: prescriptionRequest._id,
      requestNumber: prescriptionRequest.requestNumber,
      status: prescriptionRequest.status,
      targetPharmacies: prescriptionRequest.targetPharmacies?.length || 0,
      hasGeoLocation: !!prescriptionRequest.metadata?.geoLocation,
      geoLocation: prescriptionRequest.metadata?.geoLocation,
      medicationCount: prescriptionRequest.medications?.length
    });

    // Check available pharmacies
    const pharmacies = await Pharmacy.find({ 
      isActive: true, 
      registrationStatus: 'approved' 
    }).limit(5);

    console.log('\n🏥 Available pharmacies:', pharmacies.length);
    pharmacies.forEach((pharmacy, index) => {
      console.log(`  ${index + 1}. ${pharmacy.name} (${pharmacy.address})`);
    });

    if (pharmacies.length === 0) {
      console.log('❌ No active pharmacies found. Please create test pharmacies first.');
      return;
    }

    // Submit the prescription request
    console.log('\n📤 Submitting prescription request...');
    const submissionResult = await service.submitPrescriptionRequest(prescriptionRequest._id);

    console.log('✅ Submission result:', {
      success: submissionResult.success,
      notifiedPharmacies: submissionResult.notifiedPharmacies,
      requestStatus: submissionResult.request.status,
      targetPharmaciesCount: submissionResult.request.targetPharmacies?.length || 0
    });

    // Fetch the updated request to see pharmacy IDs
    const updatedRequest = await PrescriptionRequest.findById(prescriptionRequest._id)
      .populate('targetPharmacies.pharmacyId', 'name address')
      .populate('patient', 'email profile');

    console.log('\n📋 Updated prescription request with pharmacy IDs:');
    console.log('Request ID:', updatedRequest._id);
    console.log('Request Number:', updatedRequest.requestNumber);
    console.log('Status:', updatedRequest.status);
    console.log('Target Pharmacies:', updatedRequest.targetPharmacies?.length || 0);

    if (updatedRequest.targetPharmacies && updatedRequest.targetPharmacies.length > 0) {
      console.log('\n🏥 Target Pharmacies:');
      updatedRequest.targetPharmacies.forEach((target, index) => {
        console.log(`  ${index + 1}. ${target.pharmacyId?.name || 'Unknown'} (ID: ${target.pharmacyId?._id})`);
        console.log(`     Priority: ${target.priority}, Notified: ${target.notifiedAt}`);
      });
    } else {
      console.log('❌ No target pharmacies found in the request!');
    }

    console.log('\n✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    mongoose.connection.close();
  }
}

// Run the test
testPrescriptionPharmacyMatching();