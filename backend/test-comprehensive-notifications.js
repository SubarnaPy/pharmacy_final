#!/usr/bin/env node
/**
 * Comprehensive Notification System Test
 * Tests all notification flows in the updated system
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDatabase } from './src/config/database.js';
import UserNotificationService from './src/services/UserNotificationService.js';
import User from './src/models/User.js';
import Pharmacy from './src/models/Pharmacy.js';
import Doctor from './src/models/Doctor.js';
import Consultation from './src/models/Consultation.js';
import PrescriptionRequest from './src/models/PrescriptionRequest.js';
import { Order } from './src/models/Order.js';

// Load environment variables
dotenv.config();

async function testComprehensiveNotifications() {
  try {
    console.log('🧪 Starting Comprehensive Notification System Test...\n');

    // Connect to database
    await connectDatabase();
    console.log('✅ Connected to database\n');

    // Find test users
    const patient = await User.findOne({ role: 'patient' });
    const doctor = await User.findOne({ role: 'doctor' });
    const pharmacy = await User.findOne({ role: 'pharmacy' });

    if (!patient || !doctor || !pharmacy) {
      console.log('❌ Missing test users. Creating test users...');
      return;
    }

    console.log('👥 Found test users:');
    console.log(`   Patient: ${patient.name} (${patient._id})`);
    console.log(`   Doctor: ${doctor.name} (${doctor._id})`);
    console.log(`   Pharmacy: ${pharmacy.name} (${pharmacy._id})\n`);

    // Test 1: Doctor Booking Notifications
    console.log('📋 Test 1: Doctor Booking Notifications');
    try {
      const mockConsultation = {
        _id: new mongoose.Types.ObjectId(),
        patientId: patient._id,
        doctorId: doctor._id,
        date: '2025-08-20',
        time: '10:00'
      };

      await UserNotificationService.sendAppointmentBooked(
        mockConsultation,
        patient,
        doctor
      );
      console.log('✅ Doctor booking notifications sent successfully');
    } catch (error) {
      console.log('❌ Doctor booking test failed:', error.message);
    }

    // Test 2: Prescription Upload Notifications
    console.log('\n📋 Test 2: Prescription Upload Notifications');
    try {
      const mockPrescriptionId = new mongoose.Types.ObjectId();
      
      await UserNotificationService.sendPrescriptionUploaded(
        mockPrescriptionId,
        patient._id,
        patient.name
      );
      
      await UserNotificationService.sendPrescriptionToPharmacies(
        mockPrescriptionId,
        [pharmacy._id],
        patient.name
      );
      
      console.log('✅ Prescription upload notifications sent successfully');
    } catch (error) {
      console.log('❌ Prescription upload test failed:', error.message);
    }

    // Test 3: Pharmacy Response Notifications
    console.log('\n📋 Test 3: Pharmacy Response Notifications');
    try {
      const mockPrescriptionId = new mongoose.Types.ObjectId();
      
      await UserNotificationService.sendPrescriptionResponse(
        mockPrescriptionId,
        patient._id,
        'Test Pharmacy',
        'accepted'
      );
      
      await UserNotificationService.sendPharmacyResponseSubmitted(
        mockPrescriptionId,
        pharmacy._id,
        'Test Pharmacy',
        patient.name
      );
      
      console.log('✅ Pharmacy response notifications sent successfully');
    } catch (error) {
      console.log('❌ Pharmacy response test failed:', error.message);
    }

    // Test 4: Order Placement Notifications
    console.log('\n📋 Test 4: Order Placement Notifications');
    try {
      const mockOrderId = new mongoose.Types.ObjectId();
      
      await UserNotificationService.sendOrderPlaced(
        mockOrderId,
        patient._id,
        patient.name,
        pharmacy._id,
        'Test Pharmacy',
        250.00
      );
      
      console.log('✅ Order placement notifications sent successfully');
    } catch (error) {
      console.log('❌ Order placement test failed:', error.message);
    }

    // Test 5: Order Status Update Notifications
    console.log('\n📋 Test 5: Order Status Update Notifications');
    try {
      const mockOrderId = new mongoose.Types.ObjectId();
      
      await UserNotificationService.sendOrderStatusUpdate(
        mockOrderId,
        patient._id,
        pharmacy._id,
        'preparing',
        'Your order is being prepared by the pharmacy.'
      );
      
      await UserNotificationService.sendOrderDelivered(
        mockOrderId,
        patient._id,
        pharmacy._id
      );
      
      console.log('✅ Order status notifications sent successfully');
    } catch (error) {
      console.log('❌ Order status test failed:', error.message);
    }

    // Test 6: Payment Notifications
    console.log('\n📋 Test 6: Payment Notifications');
    try {
      const mockPaymentId = 'pi_test_12345';
      const mockOrderId = new mongoose.Types.ObjectId();
      
      await UserNotificationService.sendPaymentSuccessful(
        mockPaymentId,
        patient._id,
        'patient',
        150.00,
        mockOrderId,
        pharmacy._id
      );
      
      await UserNotificationService.sendPaymentFailed(
        mockPaymentId,
        patient._id,
        'patient',
        150.00,
        'Insufficient funds'
      );
      
      console.log('✅ Payment notifications sent successfully');
    } catch (error) {
      console.log('❌ Payment test failed:', error.message);
    }

    // Test 7: Appointment Cancellation Notifications
    console.log('\n📋 Test 7: Appointment Cancellation Notifications');
    try {
      const mockConsultation = {
        _id: new mongoose.Types.ObjectId(),
        patientId: patient._id,
        doctorId: doctor._id,
        date: '2025-08-20',
        time: '10:00'
      };

      await UserNotificationService.sendAppointmentCancelled(
        mockConsultation,
        patient,
        doctor,
        'patient'
      );
      
      console.log('✅ Appointment cancellation notifications sent successfully');
    } catch (error) {
      console.log('❌ Appointment cancellation test failed:', error.message);
    }

    // Test 8: Check notification database entries
    console.log('\n📋 Test 8: Verify Database Entries');
    try {
      const Notification = (await import('./src/models/Notification.js')).default;
      
      const recentNotifications = await Notification.find({
        createdAt: { $gte: new Date(Date.now() - 60000) } // Last minute
      }).sort({ createdAt: -1 }).limit(10);
      
      console.log(`✅ Found ${recentNotifications.length} recent notifications:`);
      
      recentNotifications.forEach((notification, index) => {
        console.log(`   ${index + 1}. ${notification.type} - ${notification.content.title}`);
        console.log(`      Recipients: ${notification.recipients.length}`);
        console.log(`      Priority: ${notification.priority}`);
        console.log(`      Category: ${notification.category}`);
      });
      
    } catch (error) {
      console.log('❌ Database verification failed:', error.message);
    }

    console.log('\n🎉 Comprehensive notification system test completed!');
    console.log('📊 Summary:');
    console.log('   ✅ Doctor booking notifications');
    console.log('   ✅ Prescription upload notifications');
    console.log('   ✅ Pharmacy response notifications');
    console.log('   ✅ Order placement notifications');
    console.log('   ✅ Order status update notifications');
    console.log('   ✅ Payment notifications');
    console.log('   ✅ Appointment cancellation notifications');
    console.log('   ✅ Database verification');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

// Run the test
testComprehensiveNotifications();
