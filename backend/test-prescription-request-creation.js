import mongoose from 'mongoose';
import PrescriptionRequest from './src/models/PrescriptionRequest.js';
import Pharmacy from './src/models/Pharmacy.js';
import User from './src/models/User.js';

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/pharmacy_marketplace');

async function testPrescriptionRequestCreation() {
  try {
    console.log('🧪 Testing Prescription Request Creation with Target Pharmacies...\n');

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

    // Check existing pharmacies
    const pharmacies = await Pharmacy.find({ isActive: { $ne: false } });
    console.log(`🏥 Found ${pharmacies.length} pharmacies in database`);

    if (pharmacies.length === 0) {
      console.log('❌ No pharmacies found. Please create test pharmacies first.');
      return;
    }

    // Create a test prescription request with target pharmacies
    const testRequestData = {
      patient: patient._id,
      medications: [
        {
          name: 'Paracetamol',
          quantity: 20,
          dosage: '500mg',
          unit: 'tablets',
          prescribed: 20,
          instructions: 'Take 1 tablet every 6 hours as needed',
          form: 'tablet',
          frequency: 'every 6 hours',
          duration: '5 days'
        }
      ],
      targetPharmacies: pharmacies.slice(0, 2).map((pharmacy, index) => ({
        pharmacyId: pharmacy._id,
        notifiedAt: new Date(),
        priority: index + 1,
        matchScore: 100
      })),
      preferences: {
        deliveryMethod: 'pickup'
      },
      metadata: {
        geoLocation: [77.5946, 12.9716], // Bangalore coordinates
        source: 'test'
      },
      status: 'submitted',
      isActive: true
    };

    console.log('\n📋 Creating prescription request with target pharmacies...');
    const prescriptionRequest = await PrescriptionRequest.create(testRequestData);

    console.log('✅ Prescription request created successfully!');
    console.log('📋 Request details:');
    console.log(`   ID: ${prescriptionRequest._id}`);
    console.log(`   Request Number: ${prescriptionRequest.requestNumber}`);
    console.log(`   Status: ${prescriptionRequest.status}`);
    console.log(`   Patient: ${prescriptionRequest.patient}`);
    console.log(`   Medications: ${prescriptionRequest.medications.length}`);
    console.log(`   Target Pharmacies: ${prescriptionRequest.targetPharmacies?.length || 0}`);

    if (prescriptionRequest.targetPharmacies && prescriptionRequest.targetPharmacies.length > 0) {
      console.log('\n🏥 Target Pharmacies:');
      prescriptionRequest.targetPharmacies.forEach((target, index) => {
        console.log(`   ${index + 1}. Pharmacy ID: ${target.pharmacyId}`);
        console.log(`      Priority: ${target.priority}`);
        console.log(`      Match Score: ${target.matchScore}`);
        console.log(`      Notified At: ${target.notifiedAt}`);
      });

      // Populate pharmacy details
      const populatedRequest = await PrescriptionRequest.findById(prescriptionRequest._id)
        .populate('targetPharmacies.pharmacyId', 'name address');

      console.log('\n🏥 Target Pharmacies with Details:');
      populatedRequest.targetPharmacies.forEach((target, index) => {
        console.log(`   ${index + 1}. ${target.pharmacyId?.name || 'Unknown'} (ID: ${target.pharmacyId?._id})`);
        console.log(`      Address: ${target.pharmacyId?.address || 'N/A'}`);
        console.log(`      Priority: ${target.priority}`);
      });
    } else {
      console.log('❌ No target pharmacies found in the created request!');
    }

    // Test the pharmacy queue functionality
    console.log('\n🔍 Testing pharmacy queue retrieval...');
    
    for (const pharmacy of pharmacies.slice(0, 2)) {
      console.log(`\n📋 Checking queue for pharmacy: ${pharmacy.name} (${pharmacy._id})`);
      
      const queueRequests = await PrescriptionRequest.find({
        'targetPharmacies.pharmacyId': pharmacy._id,
        isActive: true
      }).populate('patient', 'profile.firstName profile.lastName');

      console.log(`   Found ${queueRequests.length} requests in queue`);
      
      queueRequests.forEach((req, idx) => {
        console.log(`   ${idx + 1}. ${req.requestNumber} - ${req.medications.length} medications`);
        console.log(`      Patient: ${req.patient?.profile?.firstName || 'Unknown'} ${req.patient?.profile?.lastName || ''}`);
        console.log(`      Status: ${req.status}`);
      });
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
testPrescriptionRequestCreation();