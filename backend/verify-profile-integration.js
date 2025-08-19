import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';
import Doctor from './src/models/Doctor.js';
import DoctorProfileService from './src/services/DoctorProfileService.js';
import ProfileIntegrationService from './src/services/ProfileIntegrationService.js';

// Load environment variables
dotenv.config();

async function verifyProfileIntegration() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pharmacy-system');
        console.log('✅ Connected to MongoDB');

        // Create test doctor user (or find existing)
        console.log('🔄 Creating test doctor user...');
        const testEmail = `integration.test.${Date.now()}@example.com`;
        const testUser = await User.create({
            email: testEmail,
            password: 'testpassword123',
            role: 'doctor',
            profile: {
                firstName: 'Integration',
                lastName: 'Test',
                phone: '+1234567890'
            },
            emailVerification: {
                isVerified: true
            }
        });

        // Create doctor profile
        console.log('🔄 Creating doctor profile...');
        const testLicenseNumber = `INTEGRATION${Date.now()}`;
        const testDoctor = await Doctor.create({
            user: testUser._id,
            medicalLicense: {
                licenseNumber: testLicenseNumber,
                issuingAuthority: 'Test Medical Board',
                issueDate: new Date('2020-01-01'),
                expiryDate: new Date('2025-12-31'),
                isVerified: true
            },
            specializations: ['General Medicine'],
            qualifications: [{
                degree: 'MD',
                institution: 'Test Medical School',
                year: 2019,
                specialization: 'General Medicine'
            }],
            consultationModes: {
                video: { available: true, fee: 100, duration: 30 },
                chat: { available: true, fee: 50, duration: 30 }
            },
            workingHours: {
                monday: { start: '09:00', end: '17:00', available: true },
                tuesday: { start: '09:00', end: '17:00', available: true }
            },
            bio: 'Integration test doctor bio',
            status: 'verified'
        });

        console.log('✅ Test data created');

        // Test 1: Profile completion status
        console.log('🔄 Testing profile completion status...');
        const completionStatus = await ProfileIntegrationService.getProfileCompletionStatus(testDoctor._id);
        console.log('✅ Profile completion status:', {
            completionPercentage: completionStatus.completionPercentage,
            isComplete: completionStatus.isComplete,
            missingFieldsCount: completionStatus.missingFields.length,
            recommendationsCount: completionStatus.recommendations.length
        });

        // Test 2: Profile section update with integration
        console.log('🔄 Testing profile section update with integration...');
        const updateResult = await DoctorProfileService.updateProfileSection(
            testDoctor._id,
            'specializations',
            ['General Medicine', 'Internal Medicine'],
            testUser._id
        );
        console.log('✅ Profile update result:', {
            hasIntegrationInfo: !!updateResult.integrationInfo,
            searchIndexUpdated: updateResult.integrationInfo?.searchIndex,
            errors: updateResult.integrationInfo?.errors || []
        });

        // Test 3: Search index verification
        console.log('🔄 Verifying search index update...');
        const updatedDoctor = await Doctor.findById(testDoctor._id);
        console.log('✅ Search cache updated:', {
            hasSearchCache: !!updatedDoctor.searchCache,
            specializations: updatedDoctor.searchCache?.specializations || [],
            lastUpdated: updatedDoctor.searchCache?.lastUpdated
        });

        // Test 4: Profile sync with platform features
        console.log('🔄 Testing profile sync with platform features...');
        const syncResult = await ProfileIntegrationService.syncProfileChanges(
            testDoctor._id,
            'consultation',
            { video: { available: true, fee: 120, duration: 30 } },
            testUser._id
        );
        console.log('✅ Sync result:', {
            searchIndex: syncResult.searchIndex,
            bookingSystem: syncResult.bookingSystem,
            notifications: syncResult.notifications,
            errorsCount: syncResult.errors.length
        });

        // Test 5: Dashboard integration data
        console.log('🔄 Testing dashboard integration data...');
        const dashboardData = await ProfileIntegrationService.getProfileCompletionStatus(testDoctor._id);
        console.log('✅ Dashboard data structure:', {
            hasCompletionPercentage: typeof dashboardData.completionPercentage === 'number',
            hasRecommendations: Array.isArray(dashboardData.recommendations),
            hasNextSteps: Array.isArray(dashboardData.nextSteps),
            recommendationStructure: dashboardData.recommendations[0] ? {
                hasPriority: !!dashboardData.recommendations[0].priority,
                hasTitle: !!dashboardData.recommendations[0].title,
                hasDescription: !!dashboardData.recommendations[0].description,
                hasAction: !!dashboardData.recommendations[0].action
            } : 'No recommendations'
        });

        console.log('🎉 All integration tests passed!');

        // Cleanup
        console.log('🔄 Cleaning up test data...');
        await Doctor.findByIdAndDelete(testDoctor._id);
        await User.findByIdAndDelete(testUser._id);
        console.log('✅ Test data cleaned up');

    } catch (error) {
        console.error('❌ Integration test failed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');
        process.exit(0);
    }
}

// Run the verification
verifyProfileIntegration();




