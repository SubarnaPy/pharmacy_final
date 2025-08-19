import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function testPrescriptionCreationWithNotifications() {
  try {
    console.log('🔄 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');

    // Import required models and services
    const User = (await import('./src/models/User.js')).default;
    const Pharmacy = (await import('./src/models/Pharmacy.js')).default;
    const Notification = (await import('./src/models/Notification.js')).default;
    const PrescriptionRequestMatchingService = (await import('./src/services/PrescriptionRequestMatchingService.js')).default;

    console.log('🔄 Finding test data...');
    
    // Find a patient user
    const patient = await User.findOne({ role: 'patient' });
    if (!patient) {
      console.log('❌ No patient found');
      process.exit(1);
    }

    console.log('✅ Found patient:', patient.email);

    // Create test prescription data
    const testPrescriptionData = {
      medications: [
        { name: 'Paracetamol', dosage: '500mg', frequency: '3 times daily', duration: '5 days' },
        { name: 'Amoxicillin', dosage: '250mg', frequency: '2 times daily', duration: '7 days' }
      ],
      patientLocation: [88.0803051, 24.8326172], // Kolkata coordinates
      preferences: {
        urgency: 'normal',
        maxDistance: 50,
        deliveryOptions: ['pickup', 'delivery']
      }
    };

    console.log('🔄 Testing prescription request creation with notifications...');

    // Clear any existing test notifications
    await Notification.deleteMany({ 
      'content.title': { $regex: /test|Test/ },
      type: 'prescription_request'
    });

    // Create an instance of the matching service
    const matchingService = new PrescriptionRequestMatchingService();

    try {
      const result = await matchingService.createPrescriptionRequestFromUpload(
        testPrescriptionData,
        patient._id,
        testPrescriptionData.patientLocation
      );

      console.log('✅ Prescription request created:', {
        id: result.prescriptionRequest._id,
        status: result.prescriptionRequest.status,
        pharmacyCount: result.matchingPharmacies.length
      });

      // Check if notifications were created
      const createdNotifications = await Notification.find({
        type: 'prescription_request',
        createdAt: { $gte: new Date(Date.now() - 60000) } // Last minute
      });

      console.log(`📧 Found ${createdNotifications.length} notifications created in the last minute`);

      if (createdNotifications.length > 0) {
        createdNotifications.forEach((notification, index) => {
          console.log(`  ${index + 1}. Notification:`, {
            id: notification._id,
            type: notification.type,
            recipientUserId: notification.recipients[0]?.userId,
            title: notification.content.title,
            message: notification.content.message.substring(0, 50) + '...'
          });
        });

        // Clean up test notifications
        const deleteResult = await Notification.deleteMany({
          _id: { $in: createdNotifications.map(n => n._id) }
        });
        console.log(`✅ Cleaned up ${deleteResult.deletedCount} test notifications`);
      }

      // Clean up the test prescription request
      const PrescriptionRequest = (await import('./src/models/PrescriptionRequest.js')).default;
      await PrescriptionRequest.findByIdAndDelete(result.prescriptionRequest._id);
      console.log('✅ Cleaned up test prescription request');

    } catch (creationError) {
      console.error('❌ Prescription request creation failed:', creationError.message);
    }

    await mongoose.disconnect();
    console.log('✅ Test completed');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

testPrescriptionCreationWithNotifications();
