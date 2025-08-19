import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function testPrescriptionRequestNotifications() {
  try {
    console.log('🔄 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');

    // Import required services
    const UserNotificationService = (await import('./src/services/UserNotificationService.js')).default;
    const Notification = (await import('./src/models/Notification.js')).default;

    console.log('🔄 Testing pharmacy owner user ID...');
    
    // Find an actual pharmacy to test with
    const Pharmacy = (await import('./src/models/Pharmacy.js')).default;
    const pharmacy = await Pharmacy.findOne().populate('owner');
    
    if (!pharmacy) {
      console.log('❌ No pharmacy found in database');
      process.exit(1);
    }

    console.log('✅ Found pharmacy:', {
      name: pharmacy.name,
      id: pharmacy._id,
      owner: pharmacy.owner ? pharmacy.owner._id : 'No owner',
      ownerName: pharmacy.owner ? pharmacy.owner.name : 'No owner name'
    });

    // Test 1: Direct UserNotificationService call
    console.log('🔄 Testing direct UserNotificationService call...');
    
    const testPrescriptionId = new mongoose.Types.ObjectId();
    const testPatientName = 'John Doe';
    
    try {
      const result = await UserNotificationService.sendNewPrescriptionToPharmacy(
        testPrescriptionId,
        pharmacy.owner._id, // Use the actual pharmacy owner ID
        testPatientName
      );

      console.log('✅ Direct notification sent successfully');
      console.log('Result:', {
        notificationId: result._id,
        type: result.type,
        recipientCount: result.recipients.length,
        recipientUserId: result.recipients[0].userId,
        title: result.content.title
      });

      // Clean up test notification
      await Notification.findByIdAndDelete(result._id);
      console.log('✅ Test notification cleaned up');

    } catch (serviceError) {
      console.error('❌ Direct service call failed:', serviceError.message);
    }

    // Test 2: Test the notification structure used in PrescriptionRequestMatchingService
    console.log('🔄 Testing PrescriptionRequestMatchingService notification structure...');

    const testNotification = new Notification({
      type: 'prescription_request',
      category: 'medical',
      priority: 'medium',
      recipients: [{
        userId: pharmacy.owner._id,
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

    await testNotification.validate();
    console.log('✅ PrescriptionRequestMatchingService notification structure is valid');

    // Save and then delete the test notification
    await testNotification.save();
    console.log('✅ Test notification saved successfully');
    
    await Notification.findByIdAndDelete(testNotification._id);
    console.log('✅ Test notification cleaned up');

    await mongoose.disconnect();
    console.log('✅ All tests passed successfully! 🎉');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

testPrescriptionRequestNotifications();
