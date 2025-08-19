import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function testEndToEndPrescriptionFlow() {
  try {
    console.log('🔄 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');

    // Import required models and services
    const User = (await import('./src/models/User.js')).default;
    const Pharmacy = (await import('./src/models/Pharmacy.js')).default;
    const Notification = (await import('./src/models/Notification.js')).default;

    console.log('🔄 Finding test data...');
    
    // Find a patient user
    const patient = await User.findOne({ role: 'patient' });
    if (!patient) {
      console.log('❌ No patient found');
      process.exit(1);
    }

    // Find a pharmacy with owner
    const pharmacy = await Pharmacy.findOne().populate('owner');
    if (!pharmacy || !pharmacy.owner) {
      console.log('❌ No pharmacy with owner found');
      process.exit(1);
    }

    console.log('✅ Test data found:', {
      patient: { id: patient._id, name: patient.name },
      pharmacy: { id: pharmacy._id, name: pharmacy.name, ownerId: pharmacy.owner._id }
    });

    // Test creating the prescription request notification structure
    console.log('🔄 Testing prescription request notification creation...');

    const testPrescriptionId = new mongoose.Types.ObjectId();
    
    // Simulate the pharmacy structure returned by matching service
    const mockPharmacy = {
      _id: pharmacy._id,
      name: pharmacy.name,
      owner: pharmacy.owner._id,
      address: 'Test Address',
      distance: 5.2
    };

    console.log('🔄 Testing UserNotificationService.sendNewPrescriptionToPharmacy...');
    
    // Import and test the notification service
    const UserNotificationService = (await import('./src/services/UserNotificationService.js')).default;
    
    const notificationResult = await UserNotificationService.sendNewPrescriptionToPharmacy(
      testPrescriptionId,
      mockPharmacy.owner,
      patient.name || 'Test Patient'
    );

    console.log('✅ Notification created successfully:', {
      id: notificationResult._id,
      type: notificationResult.type,
      recipientUserId: notificationResult.recipients[0].userId,
      title: notificationResult.content.title,
      message: notificationResult.content.message
    });

    console.log('🔄 Testing PrescriptionRequestMatchingService notification format...');

    // Test the notification format used in PrescriptionRequestMatchingService
    const matchingServiceNotification = new Notification({
      type: 'prescription_request',
      category: 'medical',
      priority: 'medium',
      recipients: [{
        userId: mockPharmacy.owner,
        userRole: 'pharmacy',
        deliveryChannels: ['websocket', 'email']
      }],
      content: {
        title: 'New Prescription Request',
        message: 'New prescription request with 3 medications',
        actionUrl: `/pharmacy/prescriptions/${testPrescriptionId}`,
        actionText: 'Review Request',
        metadata: {
          prescriptionRequestId: testPrescriptionId,
          medicationCount: 3,
          urgency: 'normal'
        }
      },
      relatedEntities: [{
        entityType: 'prescription',
        entityId: testPrescriptionId
      }]
    });

    await matchingServiceNotification.save();
    console.log('✅ Matching service notification format works');

    // Clean up test notifications
    await Notification.findByIdAndDelete(notificationResult._id);
    await Notification.findByIdAndDelete(matchingServiceNotification._id);
    console.log('✅ Test notifications cleaned up');

    await mongoose.disconnect();
    console.log('🎉 End-to-end prescription notification flow test passed! 🎉');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

testEndToEndPrescriptionFlow();
