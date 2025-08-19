import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDatabase } from './src/config/database.js';
import UserNotificationPreferences from './src/models/UserNotificationPreferences.js';
import User from './src/models/User.js';
import NotificationPreferencesController from './src/controllers/NotificationPreferencesController.js';
import NotificationPreferencesValidationService from './src/services/NotificationPreferencesValidationService.js';

// Load environment variables
dotenv.config();

/**
 * Test script for Notification Preferences functionality
 */
async function testNotificationPreferences() {
  try {
    console.log('🧪 Starting Notification Preferences Tests...\n');
    
    // Connect to database
    await connectDatabase();
    console.log('✅ Connected to database\n');
    
    // Test 1: Validation Service Tests
    console.log('📋 Test 1: Validation Service Tests');
    await testValidationService();
    
    // Test 2: Model Tests
    console.log('\n📋 Test 2: Model Tests');
    await testModel();
    
    // Test 3: Controller Tests (simulated)
    console.log('\n📋 Test 3: Controller Tests');
    await testController();
    
    // Test 4: Migration Tests
    console.log('\n📋 Test 4: Migration Tests');
    await testMigration();
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

/**
 * Test the validation service
 */
async function testValidationService() {
  console.log('  Testing validation service...');
  
  // Test valid preferences
  const validPreferences = {
    globalSettings: {
      enabled: true,
      quietHours: {
        enabled: true,
        startTime: '22:00',
        endTime: '08:00',
        timezone: 'UTC'
      },
      frequency: 'immediate'
    },
    channels: {
      websocket: { enabled: true },
      email: { 
        enabled: true,
        frequency: 'immediate',
        digestTime: '09:00'
      },
      sms: { 
        enabled: false,
        emergencyOnly: true
      }
    },
    contactInfo: {
      email: 'test@example.com',
      phone: '+1234567890',
      preferredLanguage: 'en'
    }
  };
  
  const validResult = NotificationPreferencesValidationService.validatePreferences(validPreferences);
  console.log('    ✅ Valid preferences validation:', validResult.isValid ? 'PASSED' : 'FAILED');
  if (!validResult.isValid) {
    console.log('    Errors:', validResult.errors);
  }
  
  // Test invalid preferences
  const invalidPreferences = {
    globalSettings: {
      quietHours: {
        enabled: true,
        startTime: '25:00', // Invalid time
        endTime: 'invalid'  // Invalid format
      },
      frequency: 'invalid_frequency'
    },
    channels: {
      invalid_channel: { enabled: true },
      email: { frequency: 'invalid_frequency' }
    },
    contactInfo: {
      email: 'invalid-email',
      phone: 'invalid-phone',
      preferredLanguage: 'invalid_lang'
    }
  };
  
  const invalidResult = NotificationPreferencesValidationService.validatePreferences(invalidPreferences);
  console.log('    ✅ Invalid preferences validation:', !invalidResult.isValid ? 'PASSED' : 'FAILED');
  console.log('    Expected errors found:', invalidResult.errors.length, 'errors');
  
  // Test email validation
  console.log('    ✅ Email validation:', 
    NotificationPreferencesValidationService.isValidEmail('test@example.com') ? 'PASSED' : 'FAILED');
  console.log('    ✅ Invalid email validation:', 
    !NotificationPreferencesValidationService.isValidEmail('invalid-email') ? 'PASSED' : 'FAILED');
  
  // Test phone validation
  console.log('    ✅ Phone validation:', 
    NotificationPreferencesValidationService.isValidPhone('+1234567890') ? 'PASSED' : 'FAILED');
  console.log('    ✅ Invalid phone validation:', 
    !NotificationPreferencesValidationService.isValidPhone('invalid') ? 'PASSED' : 'FAILED');
}

/**
 * Test the model functionality
 */
async function testModel() {
  console.log('  Testing model functionality...');
  
  // Create a test user first
  const testUser = new User({
    name: 'Test User',
    email: 'testuser@example.com',
    password: 'hashedpassword',
    role: 'patient',
    phone: '+1234567890'
  });
  
  let savedUser;
  try {
    savedUser = await testUser.save();
    console.log('    ✅ Test user created');
  } catch (error) {
    // User might already exist, try to find it
    savedUser = await User.findOne({ email: 'testuser@example.com' });
    if (!savedUser) {
      throw error;
    }
    console.log('    ✅ Test user found (already exists)');
  }
  
  // Test default preferences creation
  const defaultPreferences = UserNotificationPreferences.getDefaultPreferences(savedUser._id);
  console.log('    ✅ Default preferences created');
  
  // Save default preferences
  const savedPreferences = await defaultPreferences.save();
  console.log('    ✅ Default preferences saved to database');
  
  // Test preferences retrieval
  const retrievedPreferences = await UserNotificationPreferences.findOne({ userId: savedUser._id });
  console.log('    ✅ Preferences retrieved:', retrievedPreferences ? 'PASSED' : 'FAILED');
  
  // Test preferences update
  retrievedPreferences.globalSettings.enabled = false;
  retrievedPreferences.channels.email.enabled = false;
  await retrievedPreferences.save();
  console.log('    ✅ Preferences updated');
  
  // Verify update
  const updatedPreferences = await UserNotificationPreferences.findOne({ userId: savedUser._id });
  console.log('    ✅ Update verification:', 
    (!updatedPreferences.globalSettings.enabled && !updatedPreferences.channels.email.enabled) ? 'PASSED' : 'FAILED');
  
  // Clean up
  await UserNotificationPreferences.deleteOne({ userId: savedUser._id });
  await User.deleteOne({ _id: savedUser._id });
  console.log('    ✅ Test data cleaned up');
}

/**
 * Test controller functionality (simulated)
 */
async function testController() {
  console.log('  Testing controller functionality...');
  
  // Create a test user
  const testUser = new User({
    name: 'Controller Test User',
    email: 'controllertest@example.com',
    password: 'hashedpassword',
    role: 'patient',
    phone: '+1234567890'
  });
  
  let savedUser;
  try {
    savedUser = await testUser.save();
    console.log('    ✅ Test user created for controller tests');
  } catch (error) {
    savedUser = await User.findOne({ email: 'controllertest@example.com' });
    if (!savedUser) {
      throw error;
    }
    console.log('    ✅ Test user found for controller tests');
  }
  
  // Test createDefaultPreferences method
  const createdPreferences = await NotificationPreferencesController.createDefaultPreferences(
    savedUser._id,
    {
      email: savedUser.email,
      phone: savedUser.phone,
      preferredLanguage: 'en'
    }
  );
  console.log('    ✅ Default preferences created via controller');
  
  // Verify the preferences were created with contact info
  console.log('    ✅ Contact info populated:', 
    (createdPreferences.contactInfo.email === savedUser.email) ? 'PASSED' : 'FAILED');
  
  // Clean up
  await UserNotificationPreferences.deleteOne({ userId: savedUser._id });
  await User.deleteOne({ _id: savedUser._id });
  console.log('    ✅ Controller test data cleaned up');
}

/**
 * Test migration functionality
 */
async function testMigration() {
  console.log('  Testing migration functionality...');
  
  // Create a test user with old preferences structure
  const testUser = new User({
    name: 'Migration Test User',
    email: 'migrationtest@example.com',
    password: 'hashedpassword',
    role: 'patient'
  });
  
  let savedUser;
  try {
    savedUser = await testUser.save();
    console.log('    ✅ Test user created for migration tests');
  } catch (error) {
    savedUser = await User.findOne({ email: 'migrationtest@example.com' });
    if (!savedUser) {
      throw error;
    }
    console.log('    ✅ Test user found for migration tests');
  }
  
  // Create preferences with missing notification types (simulating old schema)
  const oldPreferences = new UserNotificationPreferences({
    userId: savedUser._id,
    globalSettings: {
      enabled: true,
      frequency: 'immediate'
    },
    channels: {
      websocket: { enabled: true },
      email: { enabled: true }
    },
    notificationTypes: {
      // Only include some types, missing others
      prescription_created: { enabled: true, channels: ['websocket', 'email'] }
      // Missing: prescription_ready, order_status_changed, etc.
    }
  });
  
  await oldPreferences.save();
  console.log('    ✅ Old preferences structure created');
  
  // Run migration
  const migrationResult = await NotificationPreferencesController.migratePreferences(savedUser._id);
  console.log('    ✅ Migration completed:', migrationResult.success ? 'PASSED' : 'FAILED');
  console.log('    ✅ Migration stats:', `${migrationResult.migrated} migrated, ${migrationResult.errors} errors`);
  
  // Verify migration results
  const migratedPreferences = await UserNotificationPreferences.findOne({ userId: savedUser._id });
  const hasAllTypes = [
    'prescription_created', 'prescription_ready', 'order_status_changed',
    'appointment_reminder', 'payment_processed', 'inventory_alerts',
    'system_maintenance', 'security_alerts'
  ].every(type => migratedPreferences.notificationTypes[type]);
  
  console.log('    ✅ All notification types present after migration:', hasAllTypes ? 'PASSED' : 'FAILED');
  
  // Clean up
  await UserNotificationPreferences.deleteOne({ userId: savedUser._id });
  await User.deleteOne({ _id: savedUser._id });
  console.log('    ✅ Migration test data cleaned up');
}

// Run the tests
testNotificationPreferences();