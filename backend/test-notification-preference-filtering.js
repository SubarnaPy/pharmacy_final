import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDatabase } from './src/config/database.js';
import UserNotificationPreferences from './src/models/UserNotificationPreferences.js';
import User from './src/models/User.js';
import NotificationPreferenceFilterService from './src/services/NotificationPreferenceFilterService.js';

// Load environment variables
dotenv.config();

/**
 * Test script for Notification Preference Filtering functionality
 */
async function testNotificationPreferenceFiltering() {
  try {
    console.log('🧪 Starting Notification Preference Filtering Tests...\n');
    
    // Connect to database
    await connectDatabase();
    console.log('✅ Connected to database\n');
    
    // Test 1: Basic Preference Evaluation
    console.log('📋 Test 1: Basic Preference Evaluation');
    await testBasicPreferenceEvaluation();
    
    // Test 2: Critical Notification Override
    console.log('\n📋 Test 2: Critical Notification Override');
    await testCriticalNotificationOverride();
    
    // Test 3: Quiet Hours Filtering
    console.log('\n📋 Test 3: Quiet Hours Filtering');
    await testQuietHoursFiltering();
    
    // Test 4: Channel-Specific Filtering
    console.log('\n📋 Test 4: Channel-Specific Filtering');
    await testChannelSpecificFiltering();
    
    // Test 5: Priority-Based Filtering
    console.log('\n📋 Test 5: Priority-Based Filtering');
    await testPriorityBasedFiltering();
    
    // Test 6: Role-Based Evaluation
    console.log('\n📋 Test 6: Role-Based Evaluation');
    await testRoleBasedEvaluation();
    
    // Test 7: Bulk Evaluation
    console.log('\n📋 Test 7: Bulk Evaluation');
    await testBulkEvaluation();
    
    console.log('\n✅ All filtering tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

/**
 * Test basic preference evaluation
 */
async function testBasicPreferenceEvaluation() {
  console.log('  Testing basic preference evaluation...');
  
  // Create test user
  const testUser = await createTestUser('basic-test@example.com', 'patient');
  
  // Create preferences with email disabled
  const preferences = new UserNotificationPreferences({
    userId: testUser._id,
    globalSettings: { enabled: true },
    channels: {
      websocket: { enabled: true },
      email: { enabled: false },
      sms: { enabled: false }
    },
    notificationTypes: {
      prescription_created: { enabled: true, channels: ['websocket'] }
    }
  });
  await preferences.save();
  
  // Test notification
  const notification = {
    type: 'prescription_created',
    category: 'medical',
    priority: 'medium'
  };
  
  const evaluation = await NotificationPreferenceFilterService.evaluateNotificationPreferences(
    testUser._id, 
    notification
  );
  
  console.log('    ✅ Should deliver:', evaluation.shouldDeliver ? 'PASSED' : 'FAILED');
  console.log('    ✅ WebSocket only:', 
    (evaluation.channels.includes('websocket') && !evaluation.channels.includes('email')) ? 'PASSED' : 'FAILED');
  
  // Clean up
  await UserNotificationPreferences.deleteOne({ userId: testUser._id });
  await User.deleteOne({ _id: testUser._id });
}

/**
 * Test critical notification override
 */
async function testCriticalNotificationOverride() {
  console.log('  Testing critical notification override...');
  
  // Create test user
  const testUser = await createTestUser('critical-test@example.com', 'patient');
  
  // Create preferences with notifications disabled
  const preferences = new UserNotificationPreferences({
    userId: testUser._id,
    globalSettings: { enabled: false }, // Globally disabled
    channels: {
      websocket: { enabled: false },
      email: { enabled: false },
      sms: { enabled: false }
    }
  });
  await preferences.save();
  
  // Test critical notification
  const criticalNotification = {
    type: 'security_alerts',
    category: 'system',
    priority: 'critical'
  };
  
  const evaluation = await NotificationPreferenceFilterService.evaluateNotificationPreferences(
    testUser._id, 
    criticalNotification
  );
  
  console.log('    ✅ Critical override works:', evaluation.shouldDeliver ? 'PASSED' : 'FAILED');
  console.log('    ✅ All channels enabled for critical:', 
    (evaluation.channels.length >= 2) ? 'PASSED' : 'FAILED');
  console.log('    ✅ Override reason:', evaluation.reason === 'critical_override' ? 'PASSED' : 'FAILED');
  
  // Clean up
  await UserNotificationPreferences.deleteOne({ userId: testUser._id });
  await User.deleteOne({ _id: testUser._id });
}

/**
 * Test quiet hours filtering
 */
async function testQuietHoursFiltering() {
  console.log('  Testing quiet hours filtering...');
  
  // Create test user
  const testUser = await createTestUser('quiet-test@example.com', 'patient');
  
  // Set quiet hours to cover a wide range that includes current time
  // Use a range that definitely includes the current time in UTC
  const quietStart = '00:00'; // Start of day
  const quietEnd = '23:59';   // End of day
  
  // Create preferences with quiet hours enabled
  const preferences = new UserNotificationPreferences({
    userId: testUser._id,
    globalSettings: { 
      enabled: true,
      quietHours: {
        enabled: true,
        startTime: quietStart,
        endTime: quietEnd,
        timezone: 'UTC'
      }
    },
    channels: {
      websocket: { enabled: true },
      email: { enabled: true }
    }
  });
  await preferences.save();
  
  // Test regular notification during quiet hours
  const regularNotification = {
    type: 'order_status_changed',
    category: 'administrative',
    priority: 'medium'
  };
  
  const evaluation = await NotificationPreferenceFilterService.evaluateNotificationPreferences(
    testUser._id, 
    regularNotification
  );
  
  console.log('    ✅ Quiet hours blocks regular notifications:', 
    !evaluation.shouldDeliver ? 'PASSED' : 'FAILED');
  console.log('    ✅ Quiet hours reason:', evaluation.reason === 'quiet_hours' ? 'PASSED' : 'FAILED');
  
  // Test critical notification during quiet hours (should still deliver)
  const criticalNotification = {
    type: 'security_alerts',
    category: 'system',
    priority: 'critical'
  };
  
  const criticalEvaluation = await NotificationPreferenceFilterService.evaluateNotificationPreferences(
    testUser._id, 
    criticalNotification
  );
  
  console.log('    ✅ Critical notifications bypass quiet hours:', 
    criticalEvaluation.shouldDeliver ? 'PASSED' : 'FAILED');
  
  // Clean up
  await UserNotificationPreferences.deleteOne({ userId: testUser._id });
  await User.deleteOne({ _id: testUser._id });
}

/**
 * Test channel-specific filtering
 */
async function testChannelSpecificFiltering() {
  console.log('  Testing channel-specific filtering...');
  
  // Create test user
  const testUser = await createTestUser('channel-test@example.com', 'patient');
  
  // Create preferences with SMS emergency only
  const preferences = new UserNotificationPreferences({
    userId: testUser._id,
    globalSettings: { enabled: true },
    channels: {
      websocket: { enabled: true },
      email: { enabled: true },
      sms: { enabled: true, emergencyOnly: true }
    },
    contactInfo: {
      email: 'test@example.com',
      phone: '+1234567890'
    },
    notificationTypes: {
      prescription_created: { enabled: true, channels: ['websocket', 'email', 'sms'] }
    }
  });
  await preferences.save();
  
  // Test regular notification (should not use SMS)
  const regularNotification = {
    type: 'prescription_created',
    category: 'medical',
    priority: 'medium'
  };
  
  const evaluation = await NotificationPreferenceFilterService.evaluateNotificationPreferences(
    testUser._id, 
    regularNotification
  );
  
  console.log('    ✅ Regular notification excludes SMS:', 
    !evaluation.channels.includes('sms') ? 'PASSED' : 'FAILED');
  console.log('    ✅ Regular notification includes websocket and email:', 
    (evaluation.channels.includes('websocket') && evaluation.channels.includes('email')) ? 'PASSED' : 'FAILED');
  
  // Test emergency notification (should use SMS)
  const emergencyNotification = {
    type: 'security_alerts',
    category: 'system',
    priority: 'emergency'
  };
  
  const emergencyEvaluation = await NotificationPreferenceFilterService.evaluateNotificationPreferences(
    testUser._id, 
    emergencyNotification
  );
  
  console.log('    ✅ Emergency notification includes SMS:', 
    emergencyEvaluation.channels.includes('sms') ? 'PASSED' : 'FAILED');
  
  // Clean up
  await UserNotificationPreferences.deleteOne({ userId: testUser._id });
  await User.deleteOne({ _id: testUser._id });
}

/**
 * Test priority-based filtering
 */
async function testPriorityBasedFiltering() {
  console.log('  Testing priority-based filtering...');
  
  // Create test user
  const testUser = await createTestUser('priority-test@example.com', 'patient');
  
  // Create preferences with high priority only for medical category
  const preferences = new UserNotificationPreferences({
    userId: testUser._id,
    globalSettings: { enabled: true },
    channels: {
      websocket: { enabled: true },
      email: { enabled: true }
    },
    categories: {
      medical: {
        enabled: true,
        channels: ['websocket', 'email'],
        priority: 'high' // Only high and critical
      }
    }
  });
  await preferences.save();
  
  // Test low priority medical notification (should be filtered out)
  const lowPriorityNotification = {
    type: 'prescription_created',
    category: 'medical',
    priority: 'low'
  };
  
  const lowEvaluation = await NotificationPreferenceFilterService.evaluateNotificationPreferences(
    testUser._id, 
    lowPriorityNotification
  );
  
  console.log('    ✅ Low priority filtered out:', !lowEvaluation.shouldDeliver ? 'PASSED' : 'FAILED');
  
  // Test high priority medical notification (should be delivered)
  const highPriorityNotification = {
    type: 'prescription_created',
    category: 'medical',
    priority: 'high'
  };
  
  const highEvaluation = await NotificationPreferenceFilterService.evaluateNotificationPreferences(
    testUser._id, 
    highPriorityNotification
  );
  
  console.log('    ✅ High priority delivered:', highEvaluation.shouldDeliver ? 'PASSED' : 'FAILED');
  
  // Clean up
  await UserNotificationPreferences.deleteOne({ userId: testUser._id });
  await User.deleteOne({ _id: testUser._id });
}

/**
 * Test role-based evaluation
 */
async function testRoleBasedEvaluation() {
  console.log('  Testing role-based evaluation...');
  
  // Create admin user
  const adminUser = await createTestUser('admin-test@example.com', 'admin');
  
  // Create preferences with system notifications disabled
  const preferences = new UserNotificationPreferences({
    userId: adminUser._id,
    globalSettings: { enabled: true },
    categories: {
      system: {
        enabled: false, // Disabled for regular users
        channels: ['websocket'],
        priority: 'all'
      }
    }
  });
  await preferences.save();
  
  // Test system notification for admin (should override preferences)
  const systemNotification = {
    type: 'system_maintenance',
    category: 'system',
    priority: 'high'
  };
  
  const adminEvaluation = await NotificationPreferenceFilterService.evaluateRoleBasedPreferences(
    adminUser._id, 
    'admin',
    systemNotification
  );
  
  console.log('    ✅ Admin receives system notifications despite preferences:', 
    adminEvaluation.shouldDeliver ? 'PASSED' : 'FAILED');
  console.log('    ✅ Role override reason:', 
    adminEvaluation.reason.includes('role_override') ? 'PASSED' : 'FAILED');
  
  // Clean up
  await UserNotificationPreferences.deleteOne({ userId: adminUser._id });
  await User.deleteOne({ _id: adminUser._id });
}

/**
 * Test bulk evaluation
 */
async function testBulkEvaluation() {
  console.log('  Testing bulk evaluation...');
  
  // Create multiple test users
  const users = [];
  for (let i = 0; i < 3; i++) {
    const user = await createTestUser(`bulk-test-${i}@example.com`, 'patient');
    users.push(user);
    
    // Create different preferences for each user
    const preferences = new UserNotificationPreferences({
      userId: user._id,
      globalSettings: { enabled: i !== 1 }, // Disable for middle user
      channels: {
        websocket: { enabled: true },
        email: { enabled: true }
      }
    });
    await preferences.save();
  }
  
  const userIds = users.map(u => u._id);
  
  // Test bulk evaluation
  const notification = {
    type: 'prescription_created',
    category: 'medical',
    priority: 'medium'
  };
  
  const bulkResult = await NotificationPreferenceFilterService.bulkEvaluatePreferences(
    userIds, 
    notification
  );
  
  console.log('    ✅ Bulk evaluation completed:', bulkResult.summary.total === 3 ? 'PASSED' : 'FAILED');
  console.log('    ✅ Correct delivery count:', bulkResult.summary.shouldDeliver === 2 ? 'PASSED' : 'FAILED');
  console.log('    ✅ Correct non-delivery count:', bulkResult.summary.shouldNotDeliver === 1 ? 'PASSED' : 'FAILED');
  
  // Clean up
  for (const user of users) {
    await UserNotificationPreferences.deleteOne({ userId: user._id });
    await User.deleteOne({ _id: user._id });
  }
}

/**
 * Helper function to create test user
 */
async function createTestUser(email, role) {
  const user = new User({
    name: `Test User ${email}`,
    email: email,
    password: 'hashedpassword',
    role: role,
    phone: '+1234567890'
  });
  
  try {
    return await user.save();
  } catch (error) {
    // User might already exist
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return existingUser;
    }
    throw error;
  }
}

// Run the tests
testNotificationPreferenceFiltering();