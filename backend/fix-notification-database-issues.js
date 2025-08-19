import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Fix notification database connection issues
 * This script addresses the MongoDB connection timeouts affecting notifications
 */

async function fixDatabaseIssues() {
    try {
        console.log('🔧 Starting database connection diagnostics...');

        // Check current connection state
        console.log('📊 Current MongoDB connection state:', mongoose.connection.readyState);
        console.log('   0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting');

        if (mongoose.connection.readyState === 0) {
            console.log('❌ Database is disconnected - this explains the timeout errors');
            console.log('💡 Solution: Ensure MongoDB is running and connection string is correct');
            
            // Try to connect with improved settings
            const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/prescription-marketplace';
            
            console.log('🔄 Attempting to connect to MongoDB with optimized settings...');
            
            await mongoose.connect(mongoURI, {
                serverSelectionTimeoutMS: 5000, // Reduce from default 30s
                socketTimeoutMS: 45000,
                maxPoolSize: 10,
                minPoolSize: 5,
                maxIdleTimeMS: 30000,
                family: 4 // Use IPv4, skip trying IPv6
            });
            
            console.log('✅ MongoDB connection established successfully');
        } else {
            console.log('✅ Database is connected');
        }

        // Test basic operations
        console.log('🧪 Testing database operations...');
        
        // Test notifications collection
        try {
            const notificationCount = await mongoose.connection.db.collection('notifications').countDocuments();
            console.log(`📬 Notifications collection: ${notificationCount} documents`);
        } catch (error) {
            console.log('❌ Error accessing notifications collection:', error.message);
        }

        // Test notification templates collection
        try {
            const templateCount = await mongoose.connection.db.collection('notificationtemplates').countDocuments();
            console.log(`📋 Notification templates collection: ${templateCount} documents`);
        } catch (error) {
            console.log('❌ Error accessing notification templates collection:', error.message);
        }

        // Test notification analytics collection
        try {
            const analyticsCount = await mongoose.connection.db.collection('notificationanalytics').countDocuments();
            console.log(`📈 Notification analytics collection: ${analyticsCount} documents`);
        } catch (error) {
            console.log('❌ Error accessing notification analytics collection:', error.message);
        }

        console.log('✅ Database diagnostics completed');

    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        console.log('💡 Possible solutions:');
        console.log('   1. Start MongoDB service');
        console.log('   2. Check MONGODB_URI environment variable');
        console.log('   3. Verify network connectivity');
        console.log('   4. Check MongoDB server logs');
    }
}

// Run diagnostics
fixDatabaseIssues().then(() => {
    console.log('🔧 Database diagnostics completed');
    process.exit(0);
}).catch((error) => {
    console.error('❌ Diagnostics failed:', error);
    process.exit(1);
});
