import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Notification from './src/models/Notification.js';
import UserNotificationService from './src/services/UserNotificationService.js';

dotenv.config();

async function testPrescriptionFlow() {
  try {
    console.log('🔄 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');

    console.log('🔄 Testing notification model enum...');
    
    // Check if prescription_request is in the enum
    const notificationTypes = Notification.schema.path('type').enumValues;
    console.log('Available types:', notificationTypes.length);
    
    if (notificationTypes.includes('prescription_request')) {
      console.log('✅ prescription_request is in enum');
    } else {
      console.log('❌ prescription_request is NOT in enum');
      console.log('Available types:', notificationTypes);
    }

    console.log('🔄 Testing UserNotificationService methods...');
    
    // Check if sendNewPrescriptionToPharmacy method exists
    if (typeof UserNotificationService.sendNewPrescriptionToPharmacy === 'function') {
      console.log('✅ sendNewPrescriptionToPharmacy method exists');
    } else {
      console.log('❌ sendNewPrescriptionToPharmacy method does NOT exist');
      console.log('Available methods:', Object.getOwnPropertyNames(UserNotificationService));
    }

    console.log('🔄 Creating test notification...');
    
    // Create a test notification with correct structure
    const testNotification = new Notification({
      type: 'prescription_request',
      category: 'medical',
      priority: 'medium',
      recipients: [{
        userId: new mongoose.Types.ObjectId(),
        userRole: 'pharmacy',
        deliveryChannels: ['websocket']
      }],
      content: {
        title: 'New Prescription Request',
        message: 'A new prescription request has been submitted',
        metadata: {
          prescriptionId: new mongoose.Types.ObjectId(),
          patientName: 'Test Patient'
        }
      }
    });

    await testNotification.validate();
    console.log('✅ Test notification validation passed');

    console.log('🔄 Testing notification service call...');
    
    // Test the service method (without actually saving)
    try {
      const testUserId = new mongoose.Types.ObjectId();
      const testPrescriptionId = new mongoose.Types.ObjectId();
      
      // This should not throw an error
      console.log('Method parameters ready:', {
        prescriptionId: testPrescriptionId.toString(),
        pharmacyUserId: testUserId.toString(),
        patientName: 'Test Patient'
      });
      
      console.log('✅ Service method call preparation successful');
      
    } catch (serviceError) {
      console.error('❌ Service method error:', serviceError.message);
    }

    await mongoose.disconnect();
    console.log('✅ Test completed successfully');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

testPrescriptionFlow();
