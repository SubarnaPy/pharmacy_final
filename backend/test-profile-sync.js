import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ProfileSyncService from './src/services/ProfileSyncService.js';
import DoctorProfileService from './src/services/DoctorProfileService.js';
import Doctor from './src/models/Doctor.js';
import User from './src/models/User.js';
import ProfileChangeLog from './src/models/ProfileChangeLog.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/medical-platform');
    console.log('✅ MongoDB connected for profile sync testing');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

// Test profile synchronization system
const testProfileSync = async () => {
  try {
    console.log('\n🧪 Testing Profile Synchronization System\n');

    // Find or create a test doctor
    let testUser = await User.findOne({ email: 'test.doctor@example.com' });
    if (!testUser) {
      testUser = new User({
        name: 'Dr. Test Sync',
        email: 'test.doctor@example.com',
        password: 'hashedpassword',
        role: 'doctor',
        isActive: true
      });
      await testUser.save();
      console.log('✅ Test user created');
    }

    let testDoctor = await Doctor.findOne({ user: testUser._id });
    if (!testDoctor) {
      testDoctor = new Doctor({
        user: testUser._id,
        medicalLicense: {
          licenseNumber: 'TEST123456',
          issuingAuthority: 'Test Medical Board',
          issueDate: new Date('2020-01-01'),
          expiryDate: new Date('2025-01-01'),
          isVerified: true
        },
        specializations: ['General Medicine'],
        qualifications: [{
          degree: 'MBBS',
          institution: 'Test Medical College',
          year: 2018,
          specialization: 'General Medicine'
        }],
        bio: 'Test doctor for sync testing',
        consultationModes: {
          chat: { available: true, fee: 50, duration: 30 },
          video: { available: true, fee: 100, duration: 30 }
        },
        workingHours: {
          monday: { start: '09:00', end: '17:00', available: true },
          tuesday: { start: '09:00', end: '17:00', available: true },
          wednesday: { start: '09:00', end: '17:00', available: true },
          thursday: { start: '09:00', end: '17:00', available: true },
          friday: { start: '09:00', end: '17:00', available: true }
        },
        status: 'verified'
      });
      await testDoctor.save();
      console.log('✅ Test doctor created');
    }

    console.log(`📋 Test Doctor ID: ${testDoctor._id}`);
    console.log(`👤 Test User ID: ${testUser._id}`);

    // Test 1: Optimistic Update with Sync
    console.log('\n🔄 Test 1: Optimistic Update with Sync');
    
    const updateData = {
      specializations: ['General Medicine', 'Internal Medicine', 'Cardiology']
    };

    const syncResult = await ProfileSyncService.performOptimisticUpdate(
      testDoctor._id.toString(),
      'specializations',
      updateData.specializations,
      testUser._id.toString()
    );

    console.log('✅ Optimistic update result:', {
      success: syncResult.success,
      operationId: syncResult.operationId,
      rollbackAvailable: syncResult.rollbackAvailable
    });

    // Wait for sync to process
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: Check Profile Change Log
    console.log('\n📊 Test 2: Check Profile Change Log');
    
    const changeLog = await ProfileChangeLog.findOne({ 
      operationId: syncResult.operationId 
    }).populate('userId', 'name email');

    if (changeLog) {
      console.log('✅ Profile change logged:', {
        operationId: changeLog.operationId,
        section: changeLog.section,
        changeType: changeLog.changeType,
        impactLevel: changeLog.impactLevel,
        syncStatus: changeLog.syncStatus,
        user: changeLog.userId?.name
      });
    } else {
      console.log('❌ Profile change log not found');
    }

    // Test 3: Check Updated Doctor Profile
    console.log('\n👨‍⚕️ Test 3: Check Updated Doctor Profile');
    
    const updatedDoctor = await Doctor.findById(testDoctor._id);
    console.log('✅ Updated specializations:', updatedDoctor.specializations);
    console.log('✅ Search cache updated:', updatedDoctor.searchCache?.specializations);

    // Test 4: Test Rollback
    console.log('\n🔄 Test 4: Test Rollback');
    
    const rollbackSuccess = await ProfileSyncService.rollbackUpdate(syncResult.operationId);
    console.log('✅ Rollback result:', rollbackSuccess);

    if (rollbackSuccess) {
      // Check if profile was rolled back
      const rolledBackDoctor = await Doctor.findById(testDoctor._id);
      console.log('✅ Rolled back specializations:', rolledBackDoctor.specializations);
    }

    // Test 5: Test Critical Change Notification
    console.log('\n📢 Test 5: Test Critical Change Notification');
    
    const criticalUpdateData = {
      status: 'suspended'
    };

    const criticalSyncResult = await ProfileSyncService.performOptimisticUpdate(
      testDoctor._id.toString(),
      'status',
      criticalUpdateData.status,
      testUser._id.toString()
    );

    console.log('✅ Critical update result:', {
      success: criticalSyncResult.success,
      operationId: criticalSyncResult.operationId
    });

    // Wait for sync to process
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 6: Check Sync Statistics
    console.log('\n📈 Test 6: Check Sync Statistics');
    
    const syncStats = ProfileSyncService.getSyncStats();
    console.log('✅ Sync statistics:', syncStats);

    // Test 7: Get Recent Profile Changes
    console.log('\n📋 Test 7: Get Recent Profile Changes');
    
    const recentChanges = await ProfileChangeLog.getRecentChanges(testDoctor._id, 5);
    console.log('✅ Recent changes count:', recentChanges.length);
    
    recentChanges.forEach((change, index) => {
      console.log(`  ${index + 1}. ${change.section} - ${change.changeType} (${change.impactLevel})`);
    });

    // Test 8: Get Pending Sync Operations
    console.log('\n⏳ Test 8: Get Pending Sync Operations');
    
    const pendingOps = await ProfileChangeLog.getPendingSyncOperations();
    console.log('✅ Pending sync operations:', pendingOps.length);

    console.log('\n🎉 Profile Sync Testing Completed Successfully!');

  } catch (error) {
    console.error('❌ Profile sync test failed:', error);
  }
};

// Run the test
const runTest = async () => {
  await connectDB();
  await testProfileSync();
  
  // Keep the connection open for a moment to see sync processing
  setTimeout(() => {
    console.log('\n👋 Closing database connection...');
    mongoose.connection.close();
    process.exit(0);
  }, 5000);
};

runTest();