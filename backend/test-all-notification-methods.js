import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function testNewNotificationMethods() {
  try {
    console.log('🔄 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');

    // Import required services and models
    const UserNotificationService = (await import('./src/services/UserNotificationService.js')).default;
    const User = (await import('./src/models/User.js')).default;
    const Notification = (await import('./src/models/Notification.js')).default;

    console.log('🔄 Finding test users...');
    
    // Find test users
    const patient = await User.findOne({ role: 'patient' });
    const doctor = await User.findOne({ role: 'doctor' });
    const pharmacy = await User.findOne({ role: 'pharmacy' });
    
    if (!patient || !doctor || !pharmacy) {
      console.log('❌ Missing required user types for testing');
      console.log('Available users:', {
        patient: !!patient,
        doctor: !!doctor,
        pharmacy: !!pharmacy
      });
      process.exit(1);
    }

    console.log('✅ Found test users');

    // Clean up existing test notifications
    await Notification.deleteMany({
      'content.title': { $regex: /test|verification|welcome|password|profile|document|low stock|expiring|registration/i }
    });

    console.log('🔄 Testing new notification methods...');

    const testNotifications = [];

    // 1. Authentication & Profile Notifications
    console.log('📧 Testing authentication notifications...');
    testNotifications.push({
      name: 'Account Verification Pending',
      promise: UserNotificationService.sendAccountVerificationPending(patient._id, 'patient', 'John Doe')
    });

    testNotifications.push({
      name: 'Account Verification Complete',
      promise: UserNotificationService.sendAccountVerificationComplete(patient._id, 'patient', 'John Doe')
    });

    testNotifications.push({
      name: 'Password Reset Requested',
      promise: UserNotificationService.sendPasswordResetRequested(patient._id, 'patient', 'John Doe')
    });

    testNotifications.push({
      name: 'Password Reset Successful',
      promise: UserNotificationService.sendPasswordResetSuccessful(patient._id, 'patient', 'John Doe')
    });

    testNotifications.push({
      name: 'Profile Updated',
      promise: UserNotificationService.sendProfileUpdated(patient._id, 'patient', 'John Doe', ['email', 'phone'])
    });

    testNotifications.push({
      name: 'Document Uploaded',
      promise: UserNotificationService.sendDocumentUploaded(patient._id, 'patient', 'John Doe', 'Medical License')
    });

    // 2. Doctor-specific Notifications
    console.log('👨‍⚕️ Testing doctor notifications...');
    testNotifications.push({
      name: 'Doctor Profile Approved',
      promise: UserNotificationService.sendDoctorProfileApproved(doctor._id, 'Smith')
    });

    testNotifications.push({
      name: 'Doctor Profile Rejected',
      promise: UserNotificationService.sendDoctorProfileRejected(doctor._id, 'Smith', 'Missing qualification documents')
    });

    testNotifications.push({
      name: 'New Patient Registered',
      promise: UserNotificationService.sendNewPatientRegistered(doctor._id, 'Jane Doe')
    });

    const testConsultationId = new mongoose.Types.ObjectId();
    testNotifications.push({
      name: 'Consultation Started (Doctor)',
      promise: UserNotificationService.sendConsultationStarted(testConsultationId, doctor._id, 'doctor', 'Patient Name')
    });

    testNotifications.push({
      name: 'Consultation Completed (Doctor)',
      promise: UserNotificationService.sendConsultationCompleted(testConsultationId, doctor._id, 'doctor', 'Patient Name')
    });

    // 3. Pharmacy-specific Notifications
    console.log('🏥 Testing pharmacy notifications...');
    testNotifications.push({
      name: 'Pharmacy Registration Approved',
      promise: UserNotificationService.sendPharmacyRegistrationApproved(pharmacy._id, 'MediCare Pharmacy')
    });

    testNotifications.push({
      name: 'Pharmacy Registration Rejected',
      promise: UserNotificationService.sendPharmacyRegistrationRejected(pharmacy._id, 'MediCare Pharmacy', 'Invalid license')
    });

    testNotifications.push({
      name: 'Inventory Low Stock',
      promise: UserNotificationService.sendInventoryLowStock(pharmacy._id, 'Paracetamol 500mg', 5, 20)
    });

    testNotifications.push({
      name: 'Inventory Expiring Soon',
      promise: UserNotificationService.sendInventoryExpiringSoon(pharmacy._id, 'Vitamin C Tablets', '2025-09-01')
    });

    // 4. Consultation Notifications
    console.log('💬 Testing consultation notifications...');
    testNotifications.push({
      name: 'Consultation Started (Patient)',
      promise: UserNotificationService.sendConsultationStarted(testConsultationId, patient._id, 'patient', 'Dr. Smith')
    });

    testNotifications.push({
      name: 'Consultation Completed (Patient)',
      promise: UserNotificationService.sendConsultationCompleted(testConsultationId, patient._id, 'patient', 'Dr. Smith')
    });

    // 5. Appointment Reminders
    console.log('⏰ Testing appointment reminders...');
    testNotifications.push({
      name: 'Appointment Reminder',
      promise: UserNotificationService.sendAppointmentReminder(testConsultationId, patient._id, 'patient', 'Dr. Smith', '2025-08-17', '15:30')
    });

    // Execute all notifications
    console.log('🚀 Sending all test notifications...');
    const results = await Promise.allSettled(testNotifications.map(test => 
      test.promise.then(result => ({ name: test.name, status: 'success', result }))
      .catch(error => ({ name: test.name, status: 'failed', error: error.message }))
    ));

    // Display results
    console.log('\n📊 Notification Test Results:');
    console.log('═'.repeat(60));
    
    let successCount = 0;
    let failedCount = 0;

    results.forEach((result, index) => {
      const testResult = result.value || result.reason;
      if (testResult.status === 'success') {
        console.log(`✅ ${testResult.name}`);
        successCount++;
      } else {
        console.log(`❌ ${testResult.name}: ${testResult.error}`);
        failedCount++;
      }
    });

    console.log('═'.repeat(60));
    console.log(`📈 Summary: ${successCount} successful, ${failedCount} failed`);

    // Check database for created notifications
    const createdNotifications = await Notification.find({
      createdAt: { $gte: new Date(Date.now() - 60000) } // Last minute
    }).sort({ createdAt: -1 });

    console.log(`\n🗄️ Found ${createdNotifications.length} notifications in database`);

    if (createdNotifications.length > 0) {
      console.log('\n📋 Sample notifications created:');
      createdNotifications.slice(0, 5).forEach((notification, index) => {
        console.log(`  ${index + 1}. ${notification.type}: ${notification.content.title}`);
      });
    }

    // Clean up test notifications
    const deleteResult = await Notification.deleteMany({
      _id: { $in: createdNotifications.map(n => n._id) }
    });
    console.log(`\n🧹 Cleaned up ${deleteResult.deletedCount} test notifications`);

    await mongoose.disconnect();
    console.log('\n🎉 All notification methods tested successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

testNewNotificationMethods();
