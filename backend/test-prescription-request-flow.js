import mongoose from 'mongoose';
import dotenv from 'dotenv';
import UserNotificationService from './src/services/UserNotificationService.js';

dotenv.config();

async function testFullPrescriptionRequestFlow() {
  try {
    console.log('🔄 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');

    // Generate test IDs
    const testPrescriptionId = new mongoose.Types.ObjectId();
    const testPharmacyUserId = new mongoose.Types.ObjectId();
    const testPatientName = 'John Doe';

    console.log('🔄 Testing prescription request notification...');
    console.log('Test data:', {
      prescriptionId: testPrescriptionId.toString(),
      pharmacyUserId: testPharmacyUserId.toString(),
      patientName: testPatientName
    });

    // Test the actual notification sending
    try {
      const result = await UserNotificationService.sendNewPrescriptionToPharmacy(
        testPrescriptionId,
        testPharmacyUserId,
        testPatientName
      );

      console.log('✅ Notification sent successfully!');
      console.log('Result:', result);

      // Test the notification was created in database
      const Notification = (await import('./src/models/Notification.js')).default;
      const createdNotification = await Notification.findById(result._id);

      if (createdNotification) {
        console.log('✅ Notification found in database');
        console.log('Notification details:', {
          id: createdNotification._id,
          type: createdNotification.type,
          category: createdNotification.category,
          priority: createdNotification.priority,
          title: createdNotification.content.title,
          message: createdNotification.content.message,
          recipientCount: createdNotification.recipients.length,
          relatedEntities: createdNotification.relatedEntities
        });

        // Clean up the test notification
        await Notification.findByIdAndDelete(result._id);
        console.log('✅ Test notification cleaned up');
      } else {
        console.log('❌ Notification not found in database');
      }

    } catch (serviceError) {
      console.error('❌ Service method failed:', serviceError.message);
      console.error('Stack trace:', serviceError.stack);
    }

    await mongoose.disconnect();
    console.log('✅ Test completed successfully');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

testFullPrescriptionRequestFlow();
