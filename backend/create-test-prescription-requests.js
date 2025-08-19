import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PrescriptionRequest from './src/models/PrescriptionRequest.js';
import User from './src/models/User.js';
import Pharmacy from './src/models/Pharmacy.js';

// Load environment variables
dotenv.config();

async function createTestPrescriptionRequests() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prescription-app');
    console.log('Connected to MongoDB');

    // Find a patient user
    const patient = await User.findOne({ role: 'patient' });
    if (!patient) {
      console.log('❌ No patient user found. Please create a patient user first.');
      return;
    }

    // Find pharmacies
    const pharmacies = await Pharmacy.find({ isActive: true }).limit(3);
    if (pharmacies.length === 0) {
      console.log('❌ No pharmacies found. Please create pharmacies first.');
      return;
    }

    console.log(`👤 Using patient: ${patient.email}`);
    console.log(`🏥 Found ${pharmacies.length} pharmacies`);

    // Create test prescription requests
    const testRequests = [
      {
        patient: patient._id,
        prescriber: {
          name: 'Dr. John Smith',
          npiNumber: '1234567890',
          contactInfo: {
            phone: '+1-555-0123',
            email: 'dr.smith@clinic.com'
          }
        },
        medications: [
          {
            name: 'Metformin 500mg',
            genericName: 'Metformin',
            brandName: 'Glucophage',
            dosage: {
              form: 'tablet',
              instructions: '1 tablet twice daily with meals',
              frequency: 'BID',
              duration: '30 days'
            },
            quantity: {
              prescribed: 60,
              unit: 'tablets'
            },
            isGenericAcceptable: true
          },
          {
            name: 'Lisinopril 10mg',
            genericName: 'Lisinopril',
            brandName: 'Prinivil',
            dosage: {
              form: 'tablet',
              instructions: '1 tablet once daily',
              frequency: 'Once daily',
              duration: '30 days'
            },
            quantity: {
              prescribed: 30,
              unit: 'tablets'
            },
            isGenericAcceptable: true
          }
        ],
        preferences: {
          deliveryMethod: 'pickup',
          urgency: 'routine',
          additionalRequirements: {
            consultationRequested: false,
            genericSubstitution: true
          }
        },
        targetPharmacies: pharmacies.map((pharmacy, index) => ({
          pharmacyId: pharmacy._id,
          notifiedAt: new Date(),
          priority: index + 1
        })),
        status: 'submitted',
        metadata: {
          geoLocation: [-74.006, 40.7128], // NYC coordinates
          source: 'api'
        }
      },
      {
        patient: patient._id,
        prescriber: {
          name: 'Dr. Sarah Johnson',
          npiNumber: '0987654321',
          contactInfo: {
            phone: '+1-555-0124',
            email: 'dr.johnson@hospital.com'
          }
        },
        medications: [
          {
            name: 'Amoxicillin 500mg',
            genericName: 'Amoxicillin',
            brandName: 'Amoxil',
            dosage: {
              form: 'capsule',
              instructions: '1 capsule three times daily',
              frequency: 'TID',
              duration: '7 days'
            },
            quantity: {
              prescribed: 21,
              unit: 'capsules'
            },
            isGenericAcceptable: true
          }
        ],
        preferences: {
          deliveryMethod: 'delivery',
          urgency: 'urgent',
          deliveryAddress: {
            street: '123 Main St',
            city: 'New York',
            state: 'NY',
            zipCode: '10001'
          },
          additionalRequirements: {
            consultationRequested: true,
            genericSubstitution: false
          }
        },
        targetPharmacies: pharmacies.map((pharmacy, index) => ({
          pharmacyId: pharmacy._id,
          notifiedAt: new Date(),
          priority: index + 1
        })),
        status: 'submitted',
        metadata: {
          geoLocation: [-74.006, 40.7128],
          source: 'api'
        }
      },
      {
        patient: patient._id,
        prescriber: {
          name: 'Dr. Michael Brown',
          npiNumber: '1122334455',
          contactInfo: {
            phone: '+1-555-0125',
            email: 'dr.brown@clinic.com'
          }
        },
        medications: [
          {
            name: 'Ibuprofen 400mg',
            genericName: 'Ibuprofen',
            brandName: 'Advil',
            dosage: {
              form: 'tablet',
              instructions: '1 tablet every 6 hours as needed',
              frequency: 'PRN',
              duration: '10 days'
            },
            quantity: {
              prescribed: 40,
              unit: 'tablets'
            },
            isGenericAcceptable: true
          }
        ],
        preferences: {
          deliveryMethod: 'either',
          urgency: 'emergency',
          additionalRequirements: {
            consultationRequested: false,
            genericSubstitution: true
          }
        },
        targetPharmacies: pharmacies.map((pharmacy, index) => ({
          pharmacyId: pharmacy._id,
          notifiedAt: new Date(),
          priority: index + 1
        })),
        status: 'submitted',
        metadata: {
          geoLocation: [-74.006, 40.7128],
          source: 'api'
        }
      }
    ];

    // Clear existing test requests
    await PrescriptionRequest.deleteMany({ patient: patient._id });
    console.log('🗑️ Cleared existing test requests');

    // Create new requests
    const createdRequests = await PrescriptionRequest.insertMany(testRequests);
    
    console.log(`✅ Created ${createdRequests.length} test prescription requests:`);
    createdRequests.forEach((request, index) => {
      console.log(`  ${index + 1}. ${request.requestNumber} - ${request.medications.length} medications (${request.preferences.urgency})`);
      console.log(`     Target pharmacies: ${request.targetPharmacies.length}`);
      console.log(`     Status: ${request.status}`);
    });

    console.log(`\n🎯 Test prescription requests are ready!`);
    console.log(`📋 Patient: ${patient.email}`);
    console.log(`🏥 Pharmacies can now see these requests in their queue`);

  } catch (error) {
    console.error('❌ Error creating test prescription requests:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

createTestPrescriptionRequests();