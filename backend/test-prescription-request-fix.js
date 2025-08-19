#!/usr/bin/env node
/**
 * Test the prescription request notification fix
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDatabase } from './src/config/database.js';
import UserNotificationService from './src/services/UserNotificationService.js';
import User from './src/models/User.js';

// Load environment variables
dotenv.config();

async function testPrescriptionRequestNotification() {
  try {
    console.log('🧪 Testing Prescription Request Notification Fix...\n');

    // Connect to database
    await connectDatabase();
    console.log('✅ Connected to database\n');

    // Find test users
    const patient = await User.findOne({ role: 'patient' });
    const pharmacy = await User.findOne({ role: 'pharmacy' });

    if (!patient || !pharmacy) {
      console.log('❌ Missing test users');
      return;
    }

    console.log('👥 Found test users:');
    console.log(`   Patient: ${patient.name || 'Patient'} (${patient._id})`);
    console.log(`   Pharmacy: ${pharmacy.name || 'Pharmacy'} (${pharmacy._id})\n`);

    // Test the fixed notification
    console.log('📋 Testing prescription request notification...');
    
    const mockPrescriptionId = new mongoose.Types.ObjectId();
    
    try {
      await UserNotificationService.sendNewPrescriptionToPharmacy(
        mockPrescriptionId,
        pharmacy._id,
        patient.name || 'Test Patient'
      );
      
      console.log('✅ Prescription request notification sent successfully');
      
      // Verify it was saved in database
      const Notification = (await import('./src/models/Notification.js')).default;
      const recentNotification = await Notification.findOne({
        type: 'prescription_request',
        'recipients.userId': pharmacy._id
      }).sort({ createdAt: -1 });
      
      if (recentNotification) {
        console.log('✅ Notification saved in database:');
        console.log(`   Type: ${recentNotification.type}`);
        console.log(`   Title: ${recentNotification.content.title}`);
        console.log(`   Message: ${recentNotification.content.message}`);
        console.log(`   Recipients: ${recentNotification.recipients.length}`);
      } else {
        console.log('❌ Notification not found in database');
      }
      
    } catch (error) {
      console.log('❌ Prescription request notification failed:', error.message);
    }

    console.log('\n🎉 Test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

// Run the test
testPrescriptionRequestNotification();
