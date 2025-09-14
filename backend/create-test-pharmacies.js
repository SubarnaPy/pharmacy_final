import mongoose from 'mongoose';
import User from './src/models/User.js';
import Pharmacy from './src/models/Pharmacy.js';

const MONGODB_URI = 'mongodb://localhost:27017/p-setup-3';

async function createTestPharmacies() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected');

    // First, ensure we have a pharmacy owner user
    let pharmacyOwner = await User.findOne({ role: 'pharmacy' });
    
    if (!pharmacyOwner) {
      console.log('📝 Creating a pharmacy owner user...');
      pharmacyOwner = new User({
        email: 'owner@testpharmacy.com',
        password: 'pharmacy123',
        role: 'pharmacy',
        profile: {
          firstName: 'Pharmacy',
          lastName: 'Owner',
          dateOfBirth: new Date('1980-01-01'),
          phone: '+91-9876543200'
        },
        isVerified: true,
        isActive: true
      });
      await pharmacyOwner.save();
      console.log(`   ✅ Created pharmacy owner: ${pharmacyOwner.email} (ID: ${pharmacyOwner._id})`);
    } else {
      console.log(`   ✅ Using existing pharmacy owner: ${pharmacyOwner.email} (ID: ${pharmacyOwner._id})`);
    }

    // Create test pharmacies
    const pharmacyData = [
      {
        name: 'MedCare Pharmacy',
        description: 'A reliable pharmacy serving the community for over 10 years.',
        address: {
          street: '123 Health Street',
          city: 'Kolkata',
          state: 'West Bengal',
          zipCode: '700001',
          country: 'India'
        },
        location: {
          type: 'Point',
          coordinates: [88.4539392, 22.5738752] // [longitude, latitude]
        },
        contact: {
          phone: '+91-9876543210',
          email: 'contact@medcarepharmacy.com',
          website: 'https://medcarepharmacy.com'
        },
        licenses: [
          {
            licenseNumber: 'PH-KOL-2024-001',
            licenseType: 'retail',
            issuingAuthority: 'West Bengal State Pharmacy Council',
            issueDate: new Date('2024-01-01'),
            expiryDate: new Date('2025-12-31'),
            isActive: true,
            documentUrl: 'https://example.com/license-document-001.pdf'
          }
        ],
        operatingHours: [
          { day: 'monday', isOpen: true, openTime: '09:00', closeTime: '22:00' },
          { day: 'tuesday', isOpen: true, openTime: '09:00', closeTime: '22:00' },
          { day: 'wednesday', isOpen: true, openTime: '09:00', closeTime: '22:00' },
          { day: 'thursday', isOpen: true, openTime: '09:00', closeTime: '22:00' },
          { day: 'friday', isOpen: true, openTime: '09:00', closeTime: '22:00' },
          { day: 'saturday', isOpen: true, openTime: '09:00', closeTime: '22:00' },
          { day: 'sunday', isOpen: true, openTime: '10:00', closeTime: '20:00' }
        ],
        staff: {
          pharmacists: [
            {
              name: 'Dr. Rajesh Kumar',
              licenseNumber: 'PH-12345',
              specializations: ['Clinical Pharmacy', 'Patient Counseling'],
              yearsExperience: 8
            }
          ],
          totalStaff: 3
        },
        registrationStatus: 'approved',
        isVerified: true,
        isActive: true,
        capabilities: {
          homeDelivery: true,
          onlineOrdering: true,
          emergencyService: true,
          coldStorage: true,
          consultationService: true
        }
      },
      {
        name: 'QuickCure Pharmacy',
        description: 'Fast and efficient pharmacy with 24/7 service.',
        address: {
          street: '456 Medical Plaza',
          city: 'Kolkata',
          state: 'West Bengal',
          zipCode: '700002',
          country: 'India'
        },
        location: {
          type: 'Point',
          coordinates: [88.4639392, 22.5838752]
        },
        contact: {
          phone: '+91-9876543211',
          email: 'info@quickcure.com'
        },
        licenses: [
          {
            licenseNumber: 'PH-KOL-2024-002',
            licenseType: 'community',
            issuingAuthority: 'West Bengal State Pharmacy Council',
            issueDate: new Date('2024-02-01'),
            expiryDate: new Date('2025-12-31'),
            isActive: true,
            documentUrl: 'https://example.com/license-document-002.pdf'
          }
        ],
        operatingHours: [
          { day: 'monday', isOpen: true, openTime: '00:00', closeTime: '23:59' },
          { day: 'tuesday', isOpen: true, openTime: '00:00', closeTime: '23:59' },
          { day: 'wednesday', isOpen: true, openTime: '00:00', closeTime: '23:59' },
          { day: 'thursday', isOpen: true, openTime: '00:00', closeTime: '23:59' },
          { day: 'friday', isOpen: true, openTime: '00:00', closeTime: '23:59' },
          { day: 'saturday', isOpen: true, openTime: '00:00', closeTime: '23:59' },
          { day: 'sunday', isOpen: true, openTime: '00:00', closeTime: '23:59' }
        ],
        staff: {
          pharmacists: [
            {
              name: 'Dr. Priya Sharma',
              licenseNumber: 'PH-12346',
              specializations: ['Emergency Medicine', 'Drug Information'],
              yearsExperience: 5
            }
          ],
          totalStaff: 6
        },
        registrationStatus: 'approved',
        isVerified: true,
        isActive: true,
        capabilities: {
          homeDelivery: true,
          onlineOrdering: true,
          emergencyService: true,
          coldStorage: false,
          consultationService: false
        }
      },
      {
        name: 'HealthPlus Pharmacy',
        description: 'Comprehensive health and wellness pharmacy.',
        address: {
          street: '789 Wellness Avenue',
          city: 'Kolkata',
          state: 'West Bengal',
          zipCode: '700003',
          country: 'India'
        },
        location: {
          type: 'Point',
          coordinates: [88.4439392, 22.5638752]
        },
        contact: {
          phone: '+91-9876543212',
          email: 'support@healthplus.com'
        },
        licenses: [
          {
            licenseNumber: 'PH-KOL-2024-003',
            licenseType: 'community',
            issuingAuthority: 'West Bengal State Pharmacy Council',
            issueDate: new Date('2024-03-01'),
            expiryDate: new Date('2025-12-31'),
            isActive: true,
            documentUrl: 'https://example.com/license-document-003.pdf'
          }
        ],
        operatingHours: [
          { day: 'monday', isOpen: true, openTime: '08:00', closeTime: '21:00' },
          { day: 'tuesday', isOpen: true, openTime: '08:00', closeTime: '21:00' },
          { day: 'wednesday', isOpen: true, openTime: '08:00', closeTime: '21:00' },
          { day: 'thursday', isOpen: true, openTime: '08:00', closeTime: '21:00' },
          { day: 'friday', isOpen: true, openTime: '08:00', closeTime: '21:00' },
          { day: 'saturday', isOpen: true, openTime: '08:00', closeTime: '21:00' },
          { day: 'sunday', isOpen: true, openTime: '09:00', closeTime: '18:00' }
        ],
        staff: {
          pharmacists: [
            {
              name: 'Dr. Anita Desai',
              licenseNumber: 'PH-12347',
              specializations: ['Wellness Counseling', 'Nutrition'],
              yearsExperience: 12
            }
          ],
          totalStaff: 4
        },
        registrationStatus: 'approved',
        isVerified: true,
        isActive: true,
        capabilities: {
          homeDelivery: true,
          onlineOrdering: true,
          emergencyService: false,
          coldStorage: true,
          consultationService: true
        }
      }
    ];

    console.log(`📝 Creating ${pharmacyData.length} test pharmacies...`);

    for (const data of pharmacyData) {
      try {
        // Check if pharmacy already exists
        const existing = await Pharmacy.findOne({ name: data.name });
        if (existing) {
          console.log(`   ⏭️ Pharmacy "${data.name}" already exists`);
          continue;
        }

        const pharmacy = new Pharmacy({
          ...data,
          owner: pharmacyOwner._id
        });
        await pharmacy.save();
        console.log(`   ✅ Created pharmacy: "${data.name}" (ID: ${pharmacy._id})`);

      } catch (error) {
        console.error(`   ❌ Failed to create "${data.name}":`, error.message);
      }
    }

    // Verify pharmacies
    const totalPharmacies = await Pharmacy.countDocuments({ isActive: true });
    console.log(`\n📊 Total active pharmacies: ${totalPharmacies}`);

    console.log('\n✅ Setup complete!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createTestPharmacies();
