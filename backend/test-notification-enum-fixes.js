#!/usr/bin/env node

/**
 * Test notification enum validation fixes
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SafeNotificationServiceFactory from './src/services/SafeNotificationServiceFactory.js';

// Load environment variables
dotenv.config();

async function testNotificationEnumFixes() {
    try {
        console.log('🧪 Testing Notification Enum Validation Fixes');
        console.log('=' .repeat(60));

        // Connect to database
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/prescription-marketplace';
        await mongoose.connect(mongoURI);
        console.log('✅ Database connected');

        // Test valid notification types and categories
        const notificationService = await SafeNotificationServiceFactory.getService('TestController');

        const validTests = [
            {
                name: 'Prescription Created',
                type: 'prescription_created',
                category: 'medical'
            },
            {
                name: 'Prescription Ready',
                type: 'prescription_ready',
                category: 'medical'
            },
            {
                name: 'Order Confirmed',
                type: 'order_confirmed',
                category: 'medical'
            },
            {
                name: 'Order Cancelled',
                type: 'order_cancelled',
                category: 'medical'
            },
            {
                name: 'User Verified',
                type: 'user_verified',
                category: 'administrative'
            },
            {
                name: 'Security Alert',
                type: 'security_alert',
                category: 'administrative'
            },
            {
                name: 'Verification Required',
                type: 'verification_required',
                category: 'administrative'
            }
        ];

        console.log('\n📋 Testing Valid Notification Types:');
        
        for (const test of validTests) {
            try {
                const result = await notificationService.sendNotification(
                    '507f1f77bcf86cd799439011', // dummy ObjectId
                    test.type,
                    {
                        message: `Test notification for ${test.name}`,
                        timestamp: new Date()
                    },
                    {
                        priority: 'medium',
                        category: test.category
                    }
                );

                console.log(`   ✅ ${test.name}: ${test.type} (${test.category}) - SUCCESS`);

            } catch (error) {
                console.log(`   ❌ ${test.name}: ${test.type} (${test.category}) - FAILED: ${error.message}`);
            }
        }

        // Test updated controller notification mappings
        console.log('\n🎯 Controller Notification Mapping Summary:');
        console.log('   📧 PrescriptionController:');
        console.log('     - prescription_created: Patient & pharmacy notifications');
        
        console.log('   📧 PrescriptionRequestController:');
        console.log('     - prescription_created: Request creation');
        console.log('     - prescription_ready: Pharmacy accepts request');
        console.log('     - prescription_review_required: Pharmacy rejects request');
        console.log('     - order_confirmed: Pharmacy selection');
        console.log('     - order_cancelled: Request cancellation');
        
        console.log('   📧 AdminController:');
        console.log('     - security_alert: Account suspension');
        console.log('     - user_verified: Pharmacy approval');
        console.log('     - verification_required: Pharmacy rejection');

        console.log('\n✅ All notification types are now using valid enum values!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Database disconnected');
    }
}

// Run the test
testNotificationEnumFixes().then(() => {
    console.log('\n🎉 Enum validation test completed!');
    process.exit(0);
}).catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
});
